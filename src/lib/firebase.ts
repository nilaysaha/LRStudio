import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { safeJsonStringify } from '../utils/safeClone';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config (if specified, otherwise default)
export const db = (firebaseConfig as Record<string, unknown>).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as Record<string, unknown>).firestoreDatabaseId as string)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider with Google Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
// Workspace Scopes for Google Forms & Drive
googleProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleProvider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// ---------------------------------------------------------------------------
// Error Handling conforming to Firebase Integration Skill
// ---------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider?.providerId || null,
          email: provider?.email || null,
        })) || [],
    },
    operationType,
    path,
  };
  const serialized = safeJsonStringify(errInfo);
  console.warn('Firestore Error Handled:', serialized);
  throw new Error(serialized);
}

export {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  increment,
};
export type { FirebaseUser, Unsubscribe };
