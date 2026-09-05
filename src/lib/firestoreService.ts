import {
  db,
  auth,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  increment,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  Unsubscribe,
} from './firebase';
import { Project, MediaItem, Preset, MarketplaceProject } from '../types';
import { safeClone, safeJsonParse, safeJsonStringify } from '../utils/safeClone';
import { SEED_MARKETPLACE_PROJECTS } from '../constants/seedMarketplaceProjects';

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
    errStr.includes('resource_exhausted') ||
    errStr.includes('quota exceeded') ||
    errStr.includes('quota limit exceeded') ||
    errStr.includes('daily write units') ||
    errStr.includes('exceeded for quota metric') ||
    errStr.includes('maximum backoff delay') ||
    errStr.includes('write stream exhausted') ||
    errStr.includes('queued writes') ||
    errStr.includes('stream exhausted') ||
    errStr.includes('write-stream') ||
    errStr.includes('free tier database')
  );
}

// Global safety net to catch Firestore background stream errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      try {
        event.preventDefault();
      } catch {}
      markCloudQuotaExhausted(event.reason?.message || 'Firestore stream write quota');
    }
  });

  window.addEventListener('error', (event) => {
    if (isQuotaError(event.error) || isQuotaError(event.message)) {
      markCloudQuotaExhausted(event.message || 'Firestore stream queue');
    }
  });
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

// ---------------------------------------------------------------------------
// Common Community Marketplace Mirror Storage
// ---------------------------------------------------------------------------
const MARKETPLACE_STORAGE_KEY = 'lumenlab_marketplace_projects';

export function getMarketplaceLocalMirror(): MarketplaceProject[] {
  try {
    const stored = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (!stored) {
      // Initialize with curated seed projects
      const initial = safeClone(SEED_MARKETPLACE_PROJECTS);
      localStorage.setItem(MARKETPLACE_STORAGE_KEY, safeJsonStringify(initial));
      return initial;
    }
    const parsed = safeJsonParse(stored, SEED_MARKETPLACE_PROJECTS);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as MarketplaceProject[];
    }
    return safeClone(SEED_MARKETPLACE_PROJECTS);
  } catch (err) {
    console.warn('Marketplace mirror read error:', err);
    return safeClone(SEED_MARKETPLACE_PROJECTS);
  }
}

export function saveMarketplaceLocalMirror(projects: MarketplaceProject[]): void {
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, safeJsonStringify(projects));
  } catch (err) {
    console.warn('Marketplace mirror write warning:', err);
  }
}

/**
 * Sanitizes a MarketplaceProject for Firestore
 */
function sanitizeMarketplaceProjectForFirestore(item: MarketplaceProject): Record<string, any> {
  const clean: Record<string, any> = {
    id: item.id,
    originalProjectId: item.originalProjectId || item.id,
    creatorId: item.creatorId || 'community',
    name: (item.name || 'Untitled Creation').slice(0, 100),
    replicationCount: typeof item.replicationCount === 'number' ? Math.max(0, item.replicationCount) : 0,
    createdAt: item.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (item.description) clean.description = item.description.slice(0, 1000);
  if (item.templateId) clean.templateId = item.templateId.slice(0, 128);
  if (item.templateTag) clean.templateTag = item.templateTag.slice(0, 64);
  if (item.creatorName) clean.creatorName = item.creatorName.slice(0, 100);
  if (item.creatorPhotoURL) clean.creatorPhotoURL = item.creatorPhotoURL.slice(0, 2048);
  if (item.aspectRatio) clean.aspectRatio = item.aspectRatio;
  if (item.activeCollageIndex !== undefined) clean.activeCollageIndex = item.activeCollageIndex;

  if (item.media) {
    clean.media = {
      id: item.media.id,
      name: item.media.name,
      type: item.media.type,
      url: item.media.url,
      aspectRatio: item.media.aspectRatio || 1,
      width: item.media.width || 1000,
      height: item.media.height || 1000,
      source: item.media.source || 'upload',
    };
    if (item.media.duration) clean.media.duration = item.media.duration;
  }

  if (item.adjustments) clean.adjustments = safeClone(item.adjustments);
  if (item.activeCollage) clean.activeCollage = sanitizeCollageForFirestore(item.activeCollage);
  if (item.collages && Array.isArray(item.collages)) {
    clean.collages = item.collages.map((col) => sanitizeCollageForFirestore(col));
  }

  return clean;
}

/**
 * Sanitizes a CollageTemplate before saving to Firestore,
 * ensuring non-serializable File objects and undefined values are cleanly stripped.
 */
function sanitizeCollageForFirestore(collage: any): Record<string, any> {
  if (!collage || typeof collage !== 'object') return {};

  const clean: Record<string, any> = {
    id: collage.id || `collage-${Date.now()}`,
    name: collage.name || 'Slide',
    aspectRatio: collage.aspectRatio || 9 / 16,
    format: collage.format || '9:16',
    slots: (collage.slots || []).map((slot: any) => {
      const cleanSlot: Record<string, any> = {
        id: slot.id,
        x: Number(slot.x) || 0,
        y: Number(slot.y) || 0,
        width: Number(slot.width) || 0,
        height: Number(slot.height) || 0,
        rotation: Number(slot.rotation) || 0,
        zIndex: Number(slot.zIndex) || 1,
        borderRadius: Number(slot.borderRadius) || 0,
        borderWidth: Number(slot.borderWidth) || 0,
        borderColor: slot.borderColor || 'transparent',
      };
      if (slot.label) cleanSlot.label = slot.label;
      if (slot.fit) cleanSlot.fit = slot.fit;
      if (slot.filter) cleanSlot.filter = slot.filter;
      if (slot.flipH !== undefined) cleanSlot.flipH = Boolean(slot.flipH);
      if (slot.flipV !== undefined) cleanSlot.flipV = Boolean(slot.flipV);
      if (slot.opacity !== undefined) cleanSlot.opacity = Number(slot.opacity);
      if (slot.colorPalette) cleanSlot.colorPalette = slot.colorPalette;
      if (slot.media) {
        cleanSlot.media = {
          id: slot.media.id || `media-${Date.now()}`,
          name: slot.media.name || 'Media',
          type: slot.media.type === 'video' ? 'video' : 'image',
          url: slot.media.url || '',
          aspectRatio: slot.media.aspectRatio || 1,
          width: slot.media.width || 1080,
          height: slot.media.height || 1920,
          source: slot.media.source || 'upload',
          createdAt: slot.media.createdAt || Date.now(),
        };
        if (slot.media.duration) cleanSlot.media.duration = slot.media.duration;
        // Notice: slot.media.file is deliberately omitted as browser File objects cannot be stored in Firestore
      }
      return cleanSlot;
    }),
  };

  if (collage.backgroundColor) clean.backgroundColor = collage.backgroundColor;
  if (collage.backgroundGradient) clean.backgroundGradient = collage.backgroundGradient;
  if (collage.previewThumbnail) clean.previewThumbnail = collage.previewThumbnail;
  if (collage.textElements && Array.isArray(collage.textElements)) {
    clean.textElements = collage.textElements.map((txt: any) => ({
      id: txt.id,
      text: txt.text || '',
      x: Number(txt.x) || 0,
      y: Number(txt.y) || 0,
      fontSize: Number(txt.fontSize) || 24,
      fontFamily: txt.fontFamily || 'Inter',
      fontWeight: txt.fontWeight || 'normal',
      fontStyle: txt.fontStyle || 'normal',
      color: txt.color || '#ffffff',
      zIndex: Number(txt.zIndex) || 10,
      rotation: Number(txt.rotation) || 0,
      ...(txt.letterSpacing ? { letterSpacing: txt.letterSpacing } : {}),
      ...(txt.lineHeight ? { lineHeight: txt.lineHeight } : {}),
      ...(txt.uppercase !== undefined ? { uppercase: Boolean(txt.uppercase) } : {}),
    }));
  }
  if (collage.overlays) {
    clean.overlays = safeClone(collage.overlays);
  }
  if (collage.adjustments) {
    clean.adjustments = safeClone(collage.adjustments);
  }
  if (collage.moodKeywords && Array.isArray(collage.moodKeywords)) {
    clean.moodKeywords = [...collage.moodKeywords];
  }
  return clean;
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
  if (project.activeCollage) clean.activeCollage = sanitizeCollageForFirestore(project.activeCollage);
  if (project.collages && Array.isArray(project.collages)) {
    clean.collages = project.collages.map((col) => sanitizeCollageForFirestore(col));
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

  const sessionKey = `lumenlab_synced_profile_${user.uid}`;
  try {
    if (sessionStorage.getItem(sessionKey)) {
      return; // Already synchronized in this session
    }
  } catch {}

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
    try {
      sessionStorage.setItem(sessionKey, 'true');
    } catch {}
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('User profile write');
      try {
        sessionStorage.setItem(sessionKey, 'true');
      } catch {}
      return;
    }
    console.warn('Sync user profile warning:', error);
  }
}

// In-flight write deduplication to prevent write-stream saturation
const pendingProjectWrites = new Map<string, Promise<void>>();

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

  // Auto-publish all user projects to the common community marketplace
  publishProjectToMarketplace(userId, project).catch((err) => {
    console.warn('Marketplace auto-publish notice:', err);
  });

  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  if (isCloudQuotaExceeded()) return;

  const path = `users/${userId}/projects/${project.id}`;

  // If a write for this project is currently in flight, wait for it before starting the next one
  const inFlight = pendingProjectWrites.get(project.id);
  if (inFlight) {
    try {
      await inFlight;
    } catch {}
  }

  // Re-check quota after awaiting in-flight write
  if (isCloudQuotaExceeded()) return;

  const writePromise = (async () => {
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
    } finally {
      if (pendingProjectWrites.get(project.id) === writePromise) {
        pendingProjectWrites.delete(project.id);
      }
    }
  })();

  pendingProjectWrites.set(project.id, writePromise);
  await writePromise;
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

// ---------------------------------------------------------------------------
// Common Community Marketplace Service
// ---------------------------------------------------------------------------

/**
 * Sorts marketplace projects primarily by replicationCount (descending),
 * then by updatedAt (descending), ensuring clear ranking hierarchy.
 */
export function sortMarketplaceByReplications(items: MarketplaceProject[]): MarketplaceProject[] {
  return [...items].sort((a, b) => {
    const diff = (b.replicationCount || 0) - (a.replicationCount || 0);
    if (diff !== 0) return diff;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

/**
 * Automatically publishes any project created by any user to the common marketplace
 */
export async function publishProjectToMarketplace(
  userId: string,
  project: Project,
  creatorProfile?: { displayName?: string | null; photoURL?: string | null }
): Promise<void> {
  const localMarketplace = getMarketplaceLocalMirror();
  const existingIdx = localMarketplace.findIndex(
    (m) => m.id === project.id || m.originalProjectId === project.id
  );
  const existingReplicationCount = existingIdx >= 0 ? localMarketplace[existingIdx].replicationCount || 0 : 0;
  const existingPublishedAt = existingIdx >= 0 ? localMarketplace[existingIdx].publishedAt : Date.now();

  const creatorName =
    creatorProfile?.displayName ||
    auth.currentUser?.displayName ||
    (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Community Creator');
  const creatorPhotoURL =
    creatorProfile?.photoURL ||
    auth.currentUser?.photoURL ||
    undefined;

  const marketplaceItem: MarketplaceProject = {
    ...safeClone(project),
    id: project.id,
    originalProjectId: project.id,
    creatorId: userId || auth.currentUser?.uid || 'community',
    creatorName,
    creatorPhotoURL,
    replicationCount: existingReplicationCount,
    publishedAt: existingPublishedAt,
    updatedAt: Date.now(),
  };

  // 1. Update local storage mirror
  if (existingIdx >= 0) {
    localMarketplace[existingIdx] = marketplaceItem;
  } else {
    localMarketplace.unshift(marketplaceItem);
  }
  saveMarketplaceLocalMirror(localMarketplace);

  // 2. Sync to Firestore /marketplace_projects/{project.id} if authenticated & quota ok
  if (!auth.currentUser || isCloudQuotaExceeded()) return;

  const path = `marketplace_projects/${project.id}`;
  try {
    const docRef = doc(db, 'marketplace_projects', project.id);
    const payload = sanitizeMarketplaceProjectForFirestore(marketplaceItem);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Marketplace auto-publish');
      return;
    }
    // Non-fatal, log notice and maintain local mirror
    console.warn('Marketplace cloud publishing notice on path:', path, error);
  }
}

/**
 * Fetches all creations published to the common marketplace, ranked by replicationCount
 */
export async function fetchMarketplaceProjects(): Promise<MarketplaceProject[]> {
  const localList = getMarketplaceLocalMirror();
  if (isCloudQuotaExceeded()) {
    return sortMarketplaceByReplications(localList);
  }

  const path = 'marketplace_projects';
  try {
    const colRef = collection(db, 'marketplace_projects');
    const q = query(colRef, orderBy('replicationCount', 'desc'));
    const snapshot = await getDocs(q);
    const cloudItems: MarketplaceProject[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as MarketplaceProject;
      cloudItems.push(data);
    });

    if (cloudItems.length > 0) {
      // Merge cloud items with local additions and initial seeds
      const mergedMap = new Map<string, MarketplaceProject>();
      SEED_MARKETPLACE_PROJECTS.forEach((item) => mergedMap.set(item.id, item));
      cloudItems.forEach((item) => mergedMap.set(item.id, item));
      localList.forEach((item) => {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });
      const merged = Array.from(mergedMap.values());
      saveMarketplaceLocalMirror(merged);
      return sortMarketplaceByReplications(merged);
    }
    return sortMarketplaceByReplications(localList);
  } catch (error) {
    if (isQuotaError(error)) {
      markCloudQuotaExhausted('Marketplace fetch');
      return sortMarketplaceByReplications(localList);
    }
    console.warn('Marketplace fetch fallback to mirror:', error);
    return sortMarketplaceByReplications(localList);
  }
}

/**
 * Replicates a marketplace project:
 * - Increments replicationCount for ranking
 * - Creates a new cloned project in the user's project library
 * - Automatically publishes the new clone to the marketplace
 * - Returns the newly replicated project ready to open in the editor
 */
export async function replicateMarketplaceProject(
  marketplaceProject: MarketplaceProject,
  targetUserId?: string
): Promise<{ replicatedProject: Project; updatedReplicationCount: number }> {
  const currentCount = marketplaceProject.replicationCount || 0;
  const newCount = currentCount + 1;

  // 1. Update local marketplace mirror replication count
  const localMarketplace = getMarketplaceLocalMirror();
  const mIdx = localMarketplace.findIndex((m) => m.id === marketplaceProject.id);
  if (mIdx >= 0) {
    localMarketplace[mIdx].replicationCount = newCount;
    localMarketplace[mIdx].updatedAt = Date.now();
  } else {
    localMarketplace.unshift({
      ...marketplaceProject,
      replicationCount: newCount,
      updatedAt: Date.now(),
    });
  }
  saveMarketplaceLocalMirror(localMarketplace);

  // 2. Increment replicationCount in Firestore if connected
  if (auth.currentUser && !isCloudQuotaExceeded()) {
    try {
      const docRef = doc(db, 'marketplace_projects', marketplaceProject.id);
      await updateDoc(docRef, {
        replicationCount: increment(1),
        updatedAt: Date.now(),
      });
    } catch (err) {
      if (isQuotaError(err)) {
        markCloudQuotaExhausted('Marketplace replication increment');
      } else {
        console.warn('Marketplace cloud replication count increment notice:', err);
      }
    }
  }

  // 3. Create a unique cloned project for the user
  const effectiveUserId = targetUserId || auth.currentUser?.uid || 'guest';
  const newProjId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const replicatedProject: Project = {
    ...safeClone(marketplaceProject),
    id: newProjId,
    name: `${marketplaceProject.name} (Remix)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 4. Save to user's projects (which also auto-publishes this new creation to marketplace!)
  await saveProjectToFirestore(effectiveUserId, replicatedProject);

  return {
    replicatedProject,
    updatedReplicationCount: newCount,
  };
}

/**
 * Removes a project from the marketplace (if deleted by creator)
 */
export async function deleteMarketplaceProject(projectId: string): Promise<void> {
  const localMarketplace = getMarketplaceLocalMirror();
  saveMarketplaceLocalMirror(localMarketplace.filter((m) => m.id !== projectId));

  if (!auth.currentUser || isCloudQuotaExceeded()) return;
  try {
    const docRef = doc(db, 'marketplace_projects', projectId);
    await deleteDoc(docRef);
  } catch (err) {
    if (isQuotaError(err)) {
      markCloudQuotaExhausted('Marketplace delete');
      return;
    }
    console.warn('Marketplace delete error:', err);
  }
}

