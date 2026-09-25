/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'axon_captures_db';
const STORE_NAME = 'captures';
const DB_VERSION = 1;
const CHECKPOINT_STORAGE_KEY = 'axon_capture_checkpoint_v1';

export interface StoredCapture {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  capturedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCapture(id: string, name: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredCapture = {
      id,
      name,
      blob,
      size: blob.size,
      capturedAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => {
      // Update persistent checkpoint
      updateCheckpoint(id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCapture(id: string): Promise<{ blob: Blob; url: string; size: number } | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredCapture | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(result.blob);
      resolve({ blob: result.blob, url, size: result.size });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCaptureIds(): Promise<string[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = (request.result || []).map((k) => String(k));
        resolve(keys);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return getStoredCheckpoint();
  }
}

export async function getAllCaptures(): Promise<StoredCapture[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result as StoredCapture[]) || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCaptures(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Checkpoint helpers to maintain resilience if interrupted
export function getStoredCheckpoint(): string[] {
  try {
    const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function updateCheckpoint(id: string) {
  try {
    const current = getStoredCheckpoint();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}
