/**
 * IndexedDB Persistence Layer for LumenLab
 * Handles durable local storage of projects, multi-page slides, media blobs, and app state.
 */

import { Project, MediaItem, Preset, CollageTemplate, Adjustments } from '../types';

const DB_NAME = 'LumenLab_Studio_DB_v2';
const DB_VERSION = 1;

export const STORE_PROJECTS = 'projects';
export const STORE_USER_MEDIA = 'user_media';
export const STORE_APP_STATE = 'app_state';

export interface StorageStatusInfo {
  isSupported: boolean;
  projectCount: number;
  mediaCount: number;
  lastSavedAt: number | null;
  storageEstimate?: {
    usage?: number;
    quota?: number;
  };
}

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

/**
 * Check if IndexedDB is available in the current browser/environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Open or retrieve the singleton IndexedDB connection
 */
export function openLumenLabDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not supported or accessible in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Projects Store (Stores all Project objects with multi-page slides, adjustments, thumbnails)
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        projectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. User Media Store (Stores imported photos, video captures, camera takes)
      if (!db.objectStoreNames.contains(STORE_USER_MEDIA)) {
        const mediaStore = db.createObjectStore(STORE_USER_MEDIA, { keyPath: 'id' });
        mediaStore.createIndex('type', 'type', { unique: false });
      }

      // 3. App State Store (Stores currentProjectId, customPresets, favorites, settings)
      if (!db.objectStoreNames.contains(STORE_APP_STATE)) {
        db.createObjectStore(STORE_APP_STATE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbOpenPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      dbOpenPromise = null;
      const error = (event.target as IDBOpenDBRequest).error;
      console.warn('Failed to open IndexedDB:', error);
      reject(error || new Error('Unknown error opening IndexedDB'));
    };
  });

  return dbOpenPromise;
}

// -------------------------------------------------------------
// Projects Operations
// -------------------------------------------------------------

/**
 * Load all projects from IndexedDB, ordered by updatedAt descending
 */
export async function loadProjectsFromIndexedDB(): Promise<Project[]> {
  try {
    const db = await openLumenLabDB();
    return new Promise<Project[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: Project[] = request.result || [];
        // Sort by updatedAt descending
        list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        resolve(list);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error loading projects from IndexedDB, falling back:', err);
    return [];
  }
}

/**
 * Save or update an entire array of projects in IndexedDB
 */
export async function saveProjectsToIndexedDB(projects: Project[]): Promise<void> {
  if (!projects || projects.length === 0) return;
  try {
    const db = await openLumenLabDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS, STORE_APP_STATE], 'readwrite');
      const projectStore = transaction.objectStore(STORE_PROJECTS);
      const stateStore = transaction.objectStore(STORE_APP_STATE);

      projects.forEach((proj) => {
        if (proj && proj.id) {
          projectStore.put(proj);
        }
      });

      // Also record last saved timestamp
      stateStore.put({ key: 'last_projects_saved_at', value: Date.now() });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('Error saving projects to IndexedDB:', err);
    throw err;
  }
}

/**
 * Save or update a single project in IndexedDB
 */
export async function saveSingleProjectToIndexedDB(project: Project): Promise<void> {
  if (!project || !project.id) return;
  try {
    const db = await openLumenLabDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS, STORE_APP_STATE], 'readwrite');
      const projectStore = transaction.objectStore(STORE_PROJECTS);
      const stateStore = transaction.objectStore(STORE_APP_STATE);

      projectStore.put(project);
      stateStore.put({ key: 'last_projects_saved_at', value: Date.now() });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Error saving single project to IndexedDB:', err);
  }
}

/**
 * Delete a project from IndexedDB
 */
export async function deleteProjectFromIndexedDB(projectId: string): Promise<void> {
  if (!projectId) return;
  try {
    const db = await openLumenLabDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      store.delete(projectId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Error deleting project from IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// User Media Library Operations
// -------------------------------------------------------------

/**
 * Load user media items from IndexedDB
 */
export async function loadUserMediaFromIndexedDB(): Promise<MediaItem[]> {
  try {
    const db = await openLumenLabDB();
    return new Promise<MediaItem[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_USER_MEDIA], 'readonly');
      const store = transaction.objectStore(STORE_USER_MEDIA);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: MediaItem[] = request.result || [];
        resolve(list);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error loading media from IndexedDB:', err);
    return [];
  }
}

/**
 * Save user media library to IndexedDB
 */
export async function saveUserMediaToIndexedDB(mediaItems: MediaItem[]): Promise<void> {
  try {
    const db = await openLumenLabDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_USER_MEDIA], 'readwrite');
      const store = transaction.objectStore(STORE_USER_MEDIA);

      // Clear & repopulate or put all
      store.clear();
      mediaItems.forEach((item) => {
        if (item && item.id) {
          store.put(item);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Error saving media to IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// App State Key-Value Operations
// -------------------------------------------------------------

export async function saveAppStateItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openLumenLabDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_APP_STATE], 'readwrite');
      const store = transaction.objectStore(STORE_APP_STATE);
      store.put({ key, value });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn(`Error saving app state item [${key}] to IndexedDB:`, err);
  }
}

export async function loadAppStateItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openLumenLabDB();
    return new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_APP_STATE], 'readonly');
      const store = transaction.objectStore(STORE_APP_STATE);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`Error loading app state item [${key}] from IndexedDB:`, err);
    return null;
  }
}

/**
 * Retrieve database storage diagnostics and project counts
 */
export async function getStorageDiagnostics(): Promise<StorageStatusInfo> {
  if (!isIndexedDBAvailable()) {
    return {
      isSupported: false,
      projectCount: 0,
      mediaCount: 0,
      lastSavedAt: null,
    };
  }

  try {
    const db = await openLumenLabDB();
    const projects = await new Promise<number>((resolve) => {
      const tx = db.transaction([STORE_PROJECTS], 'readonly');
      const req = tx.objectStore(STORE_PROJECTS).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });

    const media = await new Promise<number>((resolve) => {
      const tx = db.transaction([STORE_USER_MEDIA], 'readonly');
      const req = tx.objectStore(STORE_USER_MEDIA).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });

    const lastSaved = await loadAppStateItem<number>('last_projects_saved_at');

    let storageEstimate: { usage?: number; quota?: number } | undefined;
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      storageEstimate = {
        usage: est.usage,
        quota: est.quota,
      };
    }

    return {
      isSupported: true,
      projectCount: projects,
      mediaCount: media,
      lastSavedAt: lastSaved || null,
      storageEstimate,
    };
  } catch {
    return {
      isSupported: true,
      projectCount: 0,
      mediaCount: 0,
      lastSavedAt: null,
    };
  }
}
