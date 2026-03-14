const APP_STORAGE_VERSION_KEY = 'strand:storage_version';
const APP_STORAGE_VERSION = '1.3.0';

const shouldPurgeKey = (key: string) => {
  if (!key) return false;
  if (key === APP_STORAGE_VERSION_KEY) return false;
  return (
    key.startsWith('strand:') ||
    key.startsWith('strand_os:') ||
    key.startsWith('zustand:') ||
    key === 'zustand'
  );
};

const safeRemoveStorageKeys = (storage: Storage) => {
  const keys = Object.keys(storage);
  for (const k of keys) {
    if (!shouldPurgeKey(k)) continue;
    try {
      storage.removeItem(k);
    } catch {
      // ignore
    }
  }
};

export const purgeLegacyCache = async () => {
  const prev = localStorage.getItem(APP_STORAGE_VERSION_KEY);
  if (prev && prev === APP_STORAGE_VERSION) return;

  safeRemoveStorageKeys(localStorage);
  safeRemoveStorageKeys(sessionStorage);

  try {
    localStorage.setItem(APP_STORAGE_VERSION_KEY, APP_STORAGE_VERSION);
  } catch {
    // ignore
  }

  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const targets = cacheNames.filter(
        (n) => n.includes('workbox') || n.includes('vite') || n.includes('strand'),
      );
      await Promise.all(targets.map((n) => caches.delete(n)));
    } catch {
      // ignore
    }
  }

  const dbs = (indexedDB as any).databases ? await (indexedDB as any).databases() : [];
  if (Array.isArray(dbs)) {
    await Promise.all(
      dbs
        .map((d: any) => d?.name)
        .filter((name: any) => typeof name === 'string' && (name.includes('strand') || name.includes('zustand')))
        .map(
          (name: string) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  }
};

