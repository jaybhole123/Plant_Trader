import { STORAGE_KEYS } from './constants';

export let ofMeta = {};
try {
  ofMeta = JSON.parse(localStorage.getItem(STORAGE_KEYS.PDF_META) || '{}') || {};
} catch (e) {
  ofMeta = {};
}

export const ofSaveMeta = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.PDF_META, JSON.stringify(ofMeta));
  } catch (e) {}
};

export const ofIdb = () =>
  new Promise((res, rej) => {
    const q = indexedDB.open(STORAGE_KEYS.IDB_NAME, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORAGE_KEYS.IDB_STORE);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });

export const ofTx = (mode, fn) =>
  ofIdb().then(
    d =>
      new Promise((res, rej) => {
        const t = d.transaction(STORAGE_KEYS.IDB_STORE, mode),
          r = fn(t.objectStore(STORAGE_KEYS.IDB_STORE));
        t.oncomplete = () => res(r && r.result);
        t.onerror = () => rej(t.error);
      })
  );

export const ofKey = (rep, date) => rep + '|' + date;

export async function ofPut(rep, date, file) {
  const k = ofKey(rep, date);
  ofMeta[k] = { name: file.name, size: file.size, at: Date.now() };
  ofSaveMeta();
  try {
    await ofTx('readwrite', s => s.put(file, k));
  } catch (e) {
    delete ofMeta[k];
    ofSaveMeta();
    throw new Error('Could not store the original PDF in this browser');
  }
}

export const ofGet = k => ofTx('readonly', s => s.get(k));

export async function ofDel(k) {
  delete ofMeta[k];
  ofSaveMeta();
  try {
    await ofTx('readwrite', s => s.delete(k));
  } catch (e) {}
}
