const DB_NAME = 'yedek_parca_db';
const STORE_NAME = 'uploaded_files';
const DATA_STORE_NAME = 'app_data_store';
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME);
      }
    };
  });
}

export async function saveFileToIDB(key: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ file, name: file.name, type: file.type, lastModified: file.lastModified }, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getFileFromIDB(key: string): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const data = request.result;
      if (!data) {
        resolve(null);
        return;
      }
      if (data.file instanceof File) {
        resolve(data.file);
      } else if (data.name) {
        const file = new File([data.file || data], data.name, { type: data.type || '', lastModified: data.lastModified || Date.now() });
        resolve(file);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeFileFromIDB(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveDataToIDB(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DATA_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DATA_STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    try {
      localStorage.setItem(`yp_${key}`, JSON.stringify(data));
    } catch (err) {
      console.warn('LocalStorage quota or write error:', err);
    }
  }
}

export async function getDataFromIDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DATA_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DATA_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined) {
          resolve(request.result);
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem(`yp_${key}`);
          resolve(local ? JSON.parse(local) : null);
        }
      };
      request.onerror = () => {
        const local = localStorage.getItem(`yp_${key}`);
        resolve(local ? JSON.parse(local) : null);
      };
    });
  } catch {
    const local = localStorage.getItem(`yp_${key}`);
    return local ? JSON.parse(local) : null;
  }
}

