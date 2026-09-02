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
import { safeClone } from '../utils/safeClone';

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
  const path = `users/${user.uid}`;
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
    console.warn('Sync user profile warning:', error);
  }
}

/**
 * Save / Update a Project in /users/{userId}/projects/{projectId}
 */
export async function saveProjectToFirestore(userId: string, project: Project): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/projects/${project.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    const payload = sanitizeProjectForFirestore(userId, project);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Project from /users/{userId}/projects/{projectId}
 */
export async function deleteProjectFromFirestore(userId: string, projectId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/projects/${projectId}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all Projects for a user from /users/{userId}/projects
 */
export async function fetchProjectsFromFirestore(userId: string): Promise<Project[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  const path = `users/${userId}/projects`;
  try {
    const colRef = collection(db, 'users', userId, 'projects');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      projects.push(docSnap.data() as Project);
    });
    return projects;
  } catch (error) {
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
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/projects`;
  const colRef = collection(db, 'users', userId, 'projects');
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((docSnap) => {
        projects.push(docSnap.data() as Project);
      });
      onProjectsUpdated(projects);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore project subscription notice on path:', path, error?.message || error);
    }
  );
}

/**
 * Save / Update User Media in /users/{userId}/media/{mediaId}
 */
export async function saveMediaToFirestore(userId: string, media: MediaItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/media/${media.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'media', media.id);
    const payload = sanitizeMediaForFirestore(userId, media);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete User Media from /users/{userId}/media/{mediaId}
 */
export async function deleteMediaFromFirestore(userId: string, mediaId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/media/${mediaId}`;
  try {
    const docRef = doc(db, 'users', userId, 'media', mediaId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all user media from /users/{userId}/media
 */
export async function fetchMediaFromFirestore(userId: string): Promise<MediaItem[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  const path = `users/${userId}/media`;
  try {
    const colRef = collection(db, 'users', userId, 'media');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const mediaList: MediaItem[] = [];
    snapshot.forEach((docSnap) => {
      mediaList.push(docSnap.data() as MediaItem);
    });
    return mediaList;
  } catch (error) {
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
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/media`;
  const colRef = collection(db, 'users', userId, 'media');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const mediaList: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        mediaList.push(docSnap.data() as MediaItem);
      });
      onMediaUpdated(mediaList);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore media subscription notice on path:', path, error?.message || error);
    }
  );
}

/**
 * Save custom preset in /users/{userId}/presets/{presetId}
 */
export async function savePresetToFirestore(userId: string, preset: Preset): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete custom preset from /users/{userId}/presets/{presetId}
 */
export async function deletePresetFromFirestore(userId: string, presetId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/presets/${presetId}`;
  try {
    const docRef = doc(db, 'users', userId, 'presets', presetId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all custom presets from /users/{userId}/presets
 */
export async function fetchPresetsFromFirestore(userId: string): Promise<Preset[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
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
    return presetList;
  } catch (error) {
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
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const path = `users/${userId}/presets`;
  const colRef = collection(db, 'users', userId, 'presets');
  const q = query(colRef, orderBy('createdAt', 'desc'));

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
      onPresetsUpdated(presetList);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore presets subscription notice on path:', path, error?.message || error);
    }
  );
}
