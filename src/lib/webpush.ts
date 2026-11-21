// Web Push sin dependencias: cifrado aes128gcm (RFC 8291) + firma VAPID (RFC 8292)
// con Web Crypto, así funciona igual en Node y en Cloudflare Workers.
// (La librería `web-push` usa módulos de Node que en Workers no van.)

export interface PushSubscriptionKeys { endpoint: string; p256dh: string; auth: string; }

export interface VapidKeys {
  publicKey: string;  // punto P-256 sin comprimir (65 bytes), base64url
  privateKey: string; // escalar d (32 bytes), base64url
  subject: string;    // mailto:… o https://…
}

const enc = new TextEncoder();
// Bytes respaldados por un ArrayBuffer normal (lo que pide Web Crypto en TS 5.7+)
type Bytes = Uint8Array<ArrayBuffer>;
const utf8 = (t: string): Bytes => new Uint8Array(enc.encode(t));

export function b64urlToBytes(s: string): Bytes {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(b: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

/** JWK de una clave P-256 a partir del punto público (65 bytes) y, opcionalmente, d. */
function p256Jwk(pub: Uint8Array, d?: Uint8Array): JsonWebKey {
  return {
    kty: 'EC', crv: 'P-256', ext: true,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ...(d ? { d: bytesToB64url(d) } : {}),
  };
}

/**
 * Cifra el mensaje para una suscripción (RFC 8291, un solo registro).
 * `fixed` solo existe para comprobar el resultado con el ejemplo del RFC.
 */
export async function encryptPayload(
  payload: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
  fixed?: { salt: Bytes; asPublic: Bytes; asPrivate: Bytes },
): Promise<Bytes> {
  const uaPublic = b64urlToBytes(uaPublicB64);
  const authSecret = b64urlToBytes(authSecretB64);

  let asPublic: Bytes;
  let asPrivateKey: CryptoKey;
  if (fixed) {
    asPublic = fixed.asPublic;
    asPrivateKey = await crypto.subtle.importKey('jwk', p256Jwk(fixed.asPublic, fixed.asPrivate), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    asPrivateKey = kp.privateKey;
  }
  const salt: Bytes = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivateKey, 256));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0 || ua_public || as_public, 32)
  const prkKey = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);

  // CEK y NONCE = HKDF(salt, IKM, …)
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plaintext = concat(payload, new Uint8Array([2])); // 0x02 = último registro, sin relleno
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));

  // Cabecera: salt(16) || rs(4) || idlen(1) || keyid(as_public)
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

/** Cabecera Authorization VAPID para el servicio de push del endpoint. */
async function vapidAuth(endpoint: string, vapid: VapidKeys): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject,
  })));
  const pub = b64urlToBytes(vapid.publicKey);
  const key = await crypto.subtle.importKey('jwk', p256Jwk(pub, b64urlToBytes(vapid.privateKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // Web Crypto devuelve la firma en formato r||s, que es justo el de JWS
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${bytesToB64url(sig)}, k=${vapid.publicKey}`;
}

export interface PushMessage {
  title: string;
  body: string;
  tag?: string;
  url?: string; // a dónde lleva al tocar la notificación
}

/**
 * Envía una notificación. Devuelve el código HTTP del servicio de push:
 * 201/200 = entregada; 404/410 = la suscripción ya no existe (hay que borrarla).
 */
export async function sendPush(sub: PushSubscriptionKeys, msg: PushMessage, vapid: VapidKeys, ttlSeconds = 12 * 3600): Promise<number> {
  const body = await encryptPayload(utf8(JSON.stringify(msg)), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'high',
    },
    body,
  });
  return res.status;
}

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || 'mailto:notificaciones@gymrace.app' };
}
