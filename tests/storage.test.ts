// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { idbGet } from '../src/services/indexedDbService';

describe('storage', () => {
  it('migrates legacy localStorage data into IndexedDB and serves it synchronously', async () => {
    const pets = [{ id: 'pet-1', name: 'Burek', species: 'dog' }];
    localStorage.setItem('petcare_pets_v2', JSON.stringify(pets));
    const { initStorage, storage } = await import('../src/services/storage');
    await initStorage();
    expect(storage.getPets().map((p) => p.name)).toEqual(['Burek']);
    expect(localStorage.getItem('petcare_pets_v2')).toBeNull();
    expect(JSON.parse((await idbGet('petcare_pets_v2')) as string)[0].name).toBe('Burek');
  });

  it('stores payloads larger than the localStorage quota', async () => {
    const { storage } = await import('../src/services/storage');
    const pet = { ...storage.getPets()[0], photoUrl: 'data:image/png;base64,' + 'A'.repeat(12 * 1024 * 1024) };
    storage.savePets([pet as never]);
    await new Promise((r) => setTimeout(r, 50));
    expect(((await idbGet('petcare_pets_v2')) as string).length).toBeGreaterThan(12 * 1024 * 1024);
    expect(storage.getPets()[0].photoUrl?.length).toBeGreaterThan(12 * 1024 * 1024);
  });
});
