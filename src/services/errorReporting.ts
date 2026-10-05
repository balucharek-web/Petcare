/**
 * Optional crash reporting (Sentry). Disabled unless VITE_SENTRY_DSN is set at build time.
 * The SDK is loaded lazily so it costs nothing when disabled. Events are scrubbed of
 * request bodies, breadcrumbs payloads, user data and anything that looks like a token or image.
 */
type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;
const pending: unknown[] = [];

const SENSITIVE = /(token|password|haslo|hasło|secret|authorization|api[_-]?key|base64|imageBase64)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:') || value.length > 2000) return '[usunięto]';
    return value.replace(/(Bearer\s+)[\w.-]+/gi, '$1[usunięto]').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]');
  }
  if (Array.isArray(value)) return value.map(v => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? '[usunięto]' : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

export async function initErrorReporting(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const mod = await import('@sentry/react');
    mod.init({
      dsn,
      release: typeof __APP_VERSION__ !== 'undefined' ? `petcare@${__APP_VERSION__}` : undefined,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeBreadcrumb(crumb) {
        if (crumb.category === 'console' || crumb.category === 'ui.input') return null;
        if (crumb.data) crumb.data = scrub(crumb.data) as typeof crumb.data;
        return crumb;
      },
      beforeSend(event) {
        delete event.user;
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers;
        }
        if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
        if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
        if (event.message) event.message = scrub(event.message) as string;
        event.exception?.values?.forEach(v => {
          if (v.value) v.value = scrub(v.value) as string;
        });
        return event;
      },
    });
    sentry = mod;
    pending.splice(0).forEach(err => mod.captureException(err));
  } catch (err) {
    console.warn('[ErrorReporting] Sentry init failed:', err);
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (!sentry) {
    if (pending.length < 20) pending.push(error);
    return;
  }
  sentry.captureException(error, context ? { extra: scrub(context) as Record<string, unknown> } : undefined);
}
