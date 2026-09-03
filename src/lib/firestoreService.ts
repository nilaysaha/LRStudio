import {
  db,
  auth,
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  Unsubscribe,
} from './firebase';
import { Project, MediaItem, Preset } from '../types';
import { safeClone, safeJsonParse, safeJsonStringify } from '../utils/safeClone';

// ---------------------------------------------------------------------------
// Cloud Quota & Offline Fallback Circuit Breaker
// ---------------------------------------------------------------------------
const QUOTA_STORAGE_KEY = 'lumenlab_firestore_quota_exhausted_ts';
const QUOTA_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown before checking cloud writes again

export function isCloudQuotaExceeded(): boolean {
  try {
    const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!stored) return false;
    const ts = parseInt(stored, 10);
    if (isNaN(ts)) return false;
    if (Date.now() - ts < QUOTA_COOLDOWN_MS) {
      return true;
    }
    // Cooldown elapsed, clear key
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

export function markCloudQuotaExhausted(reason?: string): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now()));
  } catch {}
  console.warn(
    `[LumenLab Persistence] Cloud daily write quota limit reached (${reason || 'Free tier write units exhausted'}). Operating seamlessly in Local Storage mode with full persistence.`
  );
}

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';
  const errStr = `${code} ${msg}`.toLowerCase();
  return (
    errStr.includes('resource-exhausted') ||
    errStr.includes('quota exceeded') ||
    errStr.includes('quota limit exceeded') ||
    errStr.includes('daily write units') ||
    errStr.includes('exceeded for quota metric') ||
    errStr.includes('maximum backoff delay') ||
    errStr.includes('free tier database')
  );
}

// ---------------------------------------------------------------------------
// Local Offline Mirror Storage (Keyed per user or guest)
// ---------------------------------------------------------------------------
function getLocalStorageKey(userId: string | undefined, domain: 'projects' | 'media' | 'presets'): string {
  const uid = userId || 'guest';
  return `lumenlab_${domain}_${uid}`;
}

export function saveLocalMirror<T>(userId: string | undefined, domain: 'projects' | 'media' | 'presets', data: T): void {
  try {
    const key = getLocalStorageKey(userId, domain);
    localStorage.setItem(key, safeJsonStringify(data));
  } catch (err) {
    console.warn(`Local mirror storage write warning for ${domain}:`, err);
  }
}

export function getLocalMirror<T>(userId: string | undefined, domain: 'projects' | 'media' | 'presets', fallback: T): T {
  try {
    const key = getLocalStorageKey(userId, domain);
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = safeJsonParse(stored, fallback);
    return parsed as T;
  } catch (err) {
    console.warn(`Local mirror storage read warning for ${domain}:`, err);
    return fallback;
  }
}

/**
 * Sanitizes project data before saving to Firestore
 * ensuring clean object structures without undefined values or non-serializable properties
 */
function sanitizeProjectForFirestore(userId: string, project: Project): Record<string, any> {
  const clean: Record<string, any> = {
    id: project.id,
    userId,
    name: project.name || 'Untitled Project',
    createdAt: project.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (project.description) clean.description = project.description;
  if (project.templateId) clean.templateId = project.templateId;
  if (project.templateTag) clean.templateTag = project.templateTag;
  if (project.aspectRatio) clean.aspectRatio = project.aspectRatio;
  if (project.activeCollageIndex !== undefined) clean.activeCollageIndex = project.activeCollageIndex;

  // Clean media
  if (project.media) {
    clean.media = {
      id: project.media.id,
      name: project.media.name,
      type: project.media.type,
      url: project.media.url,
      aspectRatio: project.media.aspectRatio || 1,
      width: project.media.width || 1000,
      height: project.media.height || 1000,
      source: project.media.source || 'upload',
    };
    if (project.media.duration) clean.media.duration = project.media.duration;
  }

  // Adjustments & Collages
  if (project.adjustments) clean.adjustments = safeClone(project.adjustments);
  if (project.activeCollage) clean.activeCollage = safeClone(project.activeCollage);
  if (project.collages && Array.isArray(project.collages)) {
    clean.collages = safeClone(project.collages);
  }

  return clean;
}

/**
 * Sanitizes user media item for Firestore
 */
function sanitizeMediaForFirestore(userId: string, media: MediaItem): Record<string, any> {
  const clean: Record<string, any> = {
    id: media.id,
    userId,
    name: media.name || 'Media Asset',
    type: media.type === 'video' ? 'video' : 'image',
    url: media.url,
    createdAt: media.createdAt || Date.now(),
  };

  if (media.aspectRatio) clean.aspectRatio = media.aspectRatio;
  if (media.width) clean.width = media.width;
  if (media.height) clean.height = media.height;
  if (media.duration) clean.duration = media.duration;
  if (media.source) clean.source = media.source;

  return clean;
}

/**
 * Sync / Upsert User profile in /users/{userId}
 */
export async function syncUserProfile(user: FirebaseUser): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
  if (isCloudQuotaExceeded()) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'LumenLab Creator',
      photoURL: user.photoURL || '',
      updatedAt: Date.now(),
    };
    await setDoc(userDocRef, userData, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('User profile write');
      return;
    }
    console.warn('Sync user profile warning:', error);
  }
}

/**
 * Save / Update a Project in /users/{userId}/projects/{projectId}
 */
export async function saveProjectToFirestore(userId: string, project: Project): Promise<void> {
  // Always update local storage mirror first for instant resilience
  const existingLocal = getLocalMirror<Project[]>(userId, 'projects', []);
  const idx = existingLocal.findIndex((p) => p.id === project.id);
  const updatedLocal = idx >= 0 ? [...existingLocal] : [project, ...existingLocal];
  if (idx >= 0) updatedLocal[idx] = project;
  saveLocalMirror(userId, 'projects', updatedLocal);

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/projects/${project.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    const payload = sanitizeProjectForFirestore(userId, project);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Project write');
      return; // Handled gracefully via local mirror
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Project from /users/{userId}/projects/{projectId}
 */
export async function deleteProjectFromFirestore(userId: string, projectId: string): Promise<void> {
  // Update local storage mirror
  const existingLocal = getLocalMirror<Project[]>(userId, 'projects', []);
  saveLocalMirror(
    userId,
    'projects',
    existingLocal.filter((p) => p.id !== projectId)
  );

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/projects/${projectId}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Project delete');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all Projects for a user from /users/{userId}/projects
 */
export async function fetchProjectsFromFirestore(userId: string): Promise<Project[]> {
  const localProjects = getLocalMirror<Project[]>(userId, 'projects', []);
  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return localProjects;
  }
  const path = `users/${userId}/projects`;
  try {
    const colRef = collection(db, 'users', userId, 'projects');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      projects.push(docSnap.data() as Project);
    });
    if (projects.length > 0) {
      saveLocalMirror(userId, 'projects', projects);
      return projects;
    }
    return localProjects;
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Project fetch');
      return localProjects;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to real-time changes in /users/{userId}/projects
 */
export function subscribeToProjects(
  userId: string,
  onProjectsUpdated: (projects: Project[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  // Initial broadcast from local mirror
  const localProjects = getLocalMirror<Project[]>(userId, 'projects', []);
  if (localProjects.length > 0) {
    onProjectsUpdated(localProjects);
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return () => {};
  }
  const path = `users/${userId}/projects`;
  const colRef = collection(db, 'users', userId, 'projects');
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const projects: Project[] = [];
        snapshot.forEach((docSnap) => {
          projects.push(docSnap.data() as Project);
        });
        if (projects.length > 0) {
          saveLocalMirror(userId, 'projects', projects);
          onProjectsUpdated(projects);
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          markCloudQuotaExhausted('Projects subscription');
          return;
        }
        if (onError) onError(error);
        console.warn('Firestore project subscription notice on path:', path, error?.message || error);
      }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markCloudQuotaExhausted('Projects subscription startup');
      return () => {};
    }
    console.warn('Error starting project subscription:', err);
    return () => {};
  }
}

/**
 * Save / Update User Media in /users/{userId}/media/{mediaId}
 */
export async function saveMediaToFirestore(userId: string, media: MediaItem): Promise<void> {
  const existingLocal = getLocalMirror<MediaItem[]>(userId, 'media', []);
  const idx = existingLocal.findIndex((m) => m.id === media.id);
  const updatedLocal = idx >= 0 ? [...existingLocal] : [media, ...existingLocal];
  if (idx >= 0) updatedLocal[idx] = media;
  saveLocalMirror(userId, 'media', updatedLocal);

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/media/${media.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'media', media.id);
    const payload = sanitizeMediaForFirestore(userId, media);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Media write');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete User Media from /users/{userId}/media/{mediaId}
 */
export async function deleteMediaFromFirestore(userId: string, mediaId: string): Promise<void> {
  const existingLocal = getLocalMirror<MediaItem[]>(userId, 'media', []);
  saveLocalMirror(
    userId,
    'media',
    existingLocal.filter((m) => m.id !== mediaId)
  );

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/media/${mediaId}`;
  try {
    const docRef = doc(db, 'users', userId, 'media', mediaId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Media delete');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all user media from /users/{userId}/media
 */
export async function fetchMediaFromFirestore(userId: string): Promise<MediaItem[]> {
  const localMedia = getLocalMirror<MediaItem[]>(userId, 'media', []);
  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return localMedia;
  }
  const path = `users/${userId}/media`;
  try {
    const colRef = collection(db, 'users', userId, 'media');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const mediaList: MediaItem[] = [];
    snapshot.forEach((docSnap) => {
      mediaList.push(docSnap.data() as MediaItem);
    });
    if (mediaList.length > 0) {
      saveLocalMirror(userId, 'media', mediaList);
      return mediaList;
    }
    return localMedia;
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Media fetch');
      return localMedia;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to real-time changes in /users/{userId}/media
 */
export function subscribeToMedia(
  userId: string,
  onMediaUpdated: (media: MediaItem[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const localMedia = getLocalMirror<MediaItem[]>(userId, 'media', []);
  if (localMedia.length > 0) {
    onMediaUpdated(localMedia);
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return () => {};
  }
  const path = `users/${userId}/media`;
  const colRef = collection(db, 'users', userId, 'media');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const mediaList: MediaItem[] = [];
        snapshot.forEach((docSnap) => {
          mediaList.push(docSnap.data() as MediaItem);
        });
        if (mediaList.length > 0) {
          saveLocalMirror(userId, 'media', mediaList);
          onMediaUpdated(mediaList);
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          markCloudQuotaExhausted('Media subscription');
          return;
        }
        if (onError) onError(error);
        console.warn('Firestore media subscription notice on path:', path, error?.message || error);
      }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markCloudQuotaExhausted('Media subscription startup');
      return () => {};
    }
    console.warn('Error starting media subscription:', err);
    return () => {};
  }
}

/**
 * Save custom preset in /users/{userId}/presets/{presetId}
 */
export async function savePresetToFirestore(userId: string, preset: Preset): Promise<void> {
  const existingLocal = getLocalMirror<Preset[]>(userId, 'presets', []);
  const idx = existingLocal.findIndex((p) => p.id === preset.id);
  const updatedLocal = idx >= 0 ? [...existingLocal] : [preset, ...existingLocal];
  if (idx >= 0) updatedLocal[idx] = preset;
  saveLocalMirror(userId, 'presets', updatedLocal);

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/presets/${preset.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'presets', preset.id);
    const payload = {
      id: preset.id,
      userId,
      name: preset.name,
      category: preset.category || 'Custom',
      description: preset.description || '',
      adjustments: safeClone(preset.adjustments),
      isFavorite: !!preset.isFavorite,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Preset write');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete custom preset from /users/{userId}/presets/{presetId}
 */
export async function deletePresetFromFirestore(userId: string, presetId: string): Promise<void> {
  const existingLocal = getLocalMirror<Preset[]>(userId, 'presets', []);
  saveLocalMirror(
    userId,
    'presets',
    existingLocal.filter((p) => p.id !== presetId)
  );

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/presets/${presetId}`;
  try {
    const docRef = doc(db, 'users', userId, 'presets', presetId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Preset delete');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all custom presets from /users/{userId}/presets
 */
export async function fetchPresetsFromFirestore(userId: string): Promise<Preset[]> {
  const localPresets = getLocalMirror<Preset[]>(userId, 'presets', []);
  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return localPresets;
  }
  const path = `users/${userId}/presets`;
  try {
    const colRef = collection(db, 'users', userId, 'presets');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const presetList: Preset[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      presetList.push({
        id: data.id,
        name: data.name,
        category: data.category || 'Custom',
        description: data.description || '',
        adjustments: data.adjustments,
        isCustom: true,
        isFavorite: !!data.isFavorite,
      });
    });
    if (presetList.length > 0) {
      saveLocalMirror(userId, 'presets', presetList);
      return presetList;
    }
    return localPresets;
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Presets fetch');
      return localPresets;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to real-time changes in /users/{userId}/presets
 */
export function subscribeToPresets(
  userId: string,
  onPresetsUpdated: (presets: Preset[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const localPresets = getLocalMirror<Preset[]>(userId, 'presets', []);
  if (localPresets.length > 0) {
    onPresetsUpdated(localPresets);
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId || isCloudQuotaExceeded()) {
    return () => {};
  }
  const path = `users/${userId}/presets`;
  const colRef = collection(db, 'users', userId, 'presets');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const presetList: Preset[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          presetList.push({
            id: data.id,
            name: data.name,
            category: data.category || 'Custom',
            description: data.description || '',
            adjustments: data.adjustments,
            isCustom: true,
            isFavorite: !!data.isFavorite,
          });
        });
        if (presetList.length > 0) {
          saveLocalMirror(userId, 'presets', presetList);
          onPresetsUpdated(presetList);
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          markCloudQuotaExhausted('Presets subscription');
          return;
        }
        if (onError) onError(error);
        console.warn('Firestore presets subscription notice on path:', path, error?.message || error);
      }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markCloudQuotaExhausted('Presets subscription startup');
      return () => {};
    }
    console.warn('Error starting presets subscription:', err);
    return () => {};
  }
}
