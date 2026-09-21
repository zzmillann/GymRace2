// Foto de perfil guardada en el propio dispositivo, sin pasar por Supabase.
//
// IndexedDB es el almacén más robusto que tiene el navegador: cuota grande
// (cientos de MB) y, si pedimos navigator.storage.persist(), el navegador se
// compromete a no borrarla aunque ande justo de espacio. De respaldo también
// dejamos una copia en localStorage por si IndexedDB no está disponible.
//
// Guardamos un JPEG cuadrado reducido (512 px) como data URL: pesa ~50-80 KB,
// se pinta en <img> directamente y no hace falta ninguna URL externa.

const DB_NAME = 'gymrace-local';
const STORE = 'kv';
const KEY = 'avatar';
const LS_KEY = 'gymrace-local-avatar';
const SIDE = 512;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  }));
}

/** Lee la foto guardada (o null si no hay). */
export async function loadLocalAvatar(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const v = await withStore<string | undefined>('readonly', (s) => s.get(KEY));
    if (v) return v;
  } catch { /* sin IndexedDB: probamos localStorage */ }
  try { return localStorage.getItem(LS_KEY); } catch { return null; }
}

/** Reduce, recorta al cuadrado y guarda la foto. Devuelve la data URL. */
export async function saveLocalAvatar(file: File): Promise<string> {
  const dataUrl = await toSquareJpeg(file);

  // Pedimos almacenamiento persistente: el navegador deja de considerar
  // nuestros datos "prescindibles" cuando necesita liberar espacio.
  try { await navigator.storage?.persist?.(); } catch { /* no soportado */ }

  let stored = false;
  try { await withStore('readwrite', (s) => s.put(dataUrl, KEY)); stored = true; } catch { /* sin IndexedDB */ }
  try { localStorage.setItem(LS_KEY, dataUrl); stored = true; } catch { /* cuota o modo privado */ }
  if (!stored) throw new Error('No se pudo guardar la foto en el dispositivo');
  return dataUrl;
}

export async function clearLocalAvatar(): Promise<void> {
  try { await withStore('readwrite', (s) => s.delete(KEY)); } catch { /* noop */ }
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

async function toSquareJpeg(file: File): Promise<string> {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error('Imagen vacía');
  const out = Math.min(SIDE, side);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return canvas.toDataURL('image/jpeg', 0.86);
}
