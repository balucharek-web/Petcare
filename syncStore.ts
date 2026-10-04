import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { Firestore, type DocumentReference } from '@google-cloud/firestore';

export interface UserSyncRecord {
  email: string;
  passwordHash?: string;
  salt?: string;
  hashAlgorithm?: 'pbkdf2-sha512' | 'hmac-sha256';
  name: string;
  avatar?: string;
  provider?: 'google' | 'email';
  lastSyncTime: string | null;
  petCount: number;
  payload?: any;
  token: string;
  tokenCreatedAt?: number;
  pairCode?: {
    code: string;
    expiresAt: number;
    attempts?: number;
  };
}

export interface QRTransferRecord {
  id: string;
  payload: any;
  petCount: number;
  email?: string;
  expiresAt: number;
  createdAt: string;
}

export interface SyncStore {
  readonly kind: 'file' | 'firestore';
  getUser(email: string): Promise<UserSyncRecord | undefined>;
  putUser(user: UserSyncRecord): Promise<void>;
  deleteUser(email: string): Promise<void>;
  findUserByPairCode(code: string): Promise<UserSyncRecord | undefined>;
  getTransfer(id: string): Promise<QRTransferRecord | undefined>;
  putTransfer(record: QRTransferRecord): Promise<void>;
  deleteTransfer(id: string): Promise<void>;
  /** Removes expired transfers and returns how many are still active. */
  pruneTransfers(now: number): Promise<number>;
}

export function createSyncStore(dataDir: string): SyncStore {
  if (process.env.SYNC_STORE === 'firestore') {
    return new FirestoreSyncStore(
      new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || undefined,
        databaseId: process.env.FIRESTORE_DATABASE_ID || undefined,
        ignoreUndefinedProperties: true,
      })
    );
  }
  return new FileSyncStore(dataDir);
}

/** Local development store: a single JSON file with atomic writes; QR transfers kept in memory. */
class FileSyncStore implements SyncStore {
  readonly kind = 'file' as const;
  private readonly dataFile: string;
  private readonly tmpFile: string;
  private readonly transfers = new Map<string, QRTransferRecord>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.dataFile = path.join(dataDir, 'cloud_sync_db.json');
    this.tmpFile = this.dataFile + '.tmp';
  }

  private read(): Record<string, UserSyncRecord> {
    try {
      if (fs.existsSync(this.dataFile)) {
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf-8')).users || {};
      }
    } catch (err) {
      console.error('Błąd odczytu cloud_sync_db.json:', err);
    }
    return {};
  }

  private mutate(fn: (users: Record<string, UserSyncRecord>) => void): Promise<void> {
    const run = this.queue.then(() => {
      const users = this.read();
      fn(users);
      fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
      fs.writeFileSync(this.tmpFile, JSON.stringify({ users }, null, 2), 'utf-8');
      fs.renameSync(this.tmpFile, this.dataFile);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getUser(email: string) {
    return this.read()[email];
  }

  putUser(user: UserSyncRecord) {
    return this.mutate((users) => {
      users[user.email] = user;
    });
  }

  deleteUser(email: string) {
    return this.mutate((users) => {
      delete users[email];
    });
  }

  async findUserByPairCode(code: string) {
    return Object.values(this.read()).find((u) => u.pairCode?.code === code);
  }

  async getTransfer(id: string) {
    return this.transfers.get(id);
  }

  async putTransfer(record: QRTransferRecord) {
    this.transfers.set(record.id, record);
  }

  async deleteTransfer(id: string) {
    this.transfers.delete(id);
  }

  async pruneTransfers(now: number) {
    for (const [id, rec] of this.transfers) {
      if (now > rec.expiresAt) this.transfers.delete(id);
    }
    return this.transfers.size;
  }
}

// Firestore documents are capped at 1 MiB, so payloads (which may contain photos) are
// gzipped and split across documents in a `payloadChunks` subcollection.
const CHUNK_BYTES = 900 * 1024;
const CHUNKS_PER_BATCH = 8;

interface PayloadPointer {
  payloadVersion?: string;
  payloadChunks?: number;
  payloadHash?: string;
}

class FirestoreSyncStore implements SyncStore {
  readonly kind = 'firestore' as const;
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  private userRef(email: string) {
    const id = crypto.createHash('sha256').update(email).digest('hex');
    return this.db.collection('syncUsers').doc(id);
  }

  private transferRef(id: string) {
    return this.db.collection('qrTransfers').doc(id);
  }

  private async writePayload(ref: DocumentReference, payload: any, previous: PayloadPointer): Promise<PayloadPointer> {
    const data = zlib.gzipSync(Buffer.from(JSON.stringify(payload ?? null), 'utf-8'));
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (previous.payloadHash === hash && previous.payloadVersion) {
      return { payloadVersion: previous.payloadVersion, payloadChunks: previous.payloadChunks, payloadHash: hash };
    }

    const version = crypto.randomBytes(6).toString('hex');
    const chunks: Buffer[] = [];
    for (let off = 0; off < data.length; off += CHUNK_BYTES) chunks.push(data.subarray(off, off + CHUNK_BYTES));
    for (let i = 0; i < chunks.length; i += CHUNKS_PER_BATCH) {
      const batch = this.db.batch();
      chunks.slice(i, i + CHUNKS_PER_BATCH).forEach((chunk, j) => {
        batch.set(ref.collection('payloadChunks').doc(`${version}_${i + j}`), { data: chunk });
      });
      await batch.commit();
    }
    return { payloadVersion: version, payloadChunks: chunks.length, payloadHash: hash };
  }

  private async readPayload(ref: DocumentReference, pointer: PayloadPointer): Promise<any> {
    if (!pointer.payloadVersion || !pointer.payloadChunks) return undefined;
    const refs = Array.from({ length: pointer.payloadChunks }, (_, i) =>
      ref.collection('payloadChunks').doc(`${pointer.payloadVersion}_${i}`)
    );
    const snaps = await this.db.getAll(...refs);
    const data = Buffer.concat(snaps.map((s) => Buffer.from(s.get('data'))));
    return JSON.parse(zlib.gunzipSync(data).toString('utf-8'));
  }

  private async deleteStaleChunks(ref: DocumentReference, keepVersion?: string) {
    const snap = await ref.collection('payloadChunks').get();
    const stale = snap.docs.filter((d) => !keepVersion || !d.id.startsWith(`${keepVersion}_`));
    for (let i = 0; i < stale.length; i += 400) {
      const batch = this.db.batch();
      stale.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  private async saveWithPayload(ref: DocumentReference, record: { payload?: any }) {
    const existing = await ref.get();
    const previous: PayloadPointer = existing.exists ? (existing.data() as PayloadPointer) : {};
    const { payload, ...meta } = record;
    const pointer = await this.writePayload(ref, payload, previous);
    await ref.set({ ...meta, ...pointer });
    if (pointer.payloadVersion !== previous.payloadVersion) {
      await this.deleteStaleChunks(ref, pointer.payloadVersion);
    }
  }

  private async loadWithPayload<T>(ref: DocumentReference): Promise<T | undefined> {
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    const { payloadVersion, payloadChunks, payloadHash, ...meta } = snap.data() as any;
    const payload = await this.readPayload(ref, { payloadVersion, payloadChunks, payloadHash });
    return { ...meta, payload } as T;
  }

  getUser(email: string) {
    return this.loadWithPayload<UserSyncRecord>(this.userRef(email));
  }

  putUser(user: UserSyncRecord) {
    return this.saveWithPayload(this.userRef(user.email), user);
  }

  async deleteUser(email: string) {
    await this.db.recursiveDelete(this.userRef(email));
  }

  async findUserByPairCode(code: string) {
    const snap = await this.db.collection('syncUsers').where('pairCode.code', '==', code).limit(1).get();
    if (snap.empty) return undefined;
    return this.loadWithPayload<UserSyncRecord>(snap.docs[0].ref);
  }

  getTransfer(id: string) {
    return this.loadWithPayload<QRTransferRecord>(this.transferRef(id));
  }

  putTransfer(record: QRTransferRecord) {
    return this.saveWithPayload(this.transferRef(record.id), record);
  }

  async deleteTransfer(id: string) {
    await this.db.recursiveDelete(this.transferRef(id));
  }

  async pruneTransfers(now: number) {
    const transfers = this.db.collection('qrTransfers');
    const expired = await transfers.where('expiresAt', '<', now).limit(50).get();
    await Promise.all(expired.docs.map((d) => this.db.recursiveDelete(d.ref)));
    const active = await transfers.where('expiresAt', '>=', now).count().get();
    return active.data().count;
  }
}
