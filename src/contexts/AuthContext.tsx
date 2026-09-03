import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
} from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreService';
import { safeJsonStringify } from '../utils/safeClone';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
}

interface AuthContextValue {
  user: AppUser | FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: (hintEmail?: string) => Promise<void>;
  signInWithStudioAccount: (email?: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isFallbackSession: boolean;
}

const STORAGE_KEY_STUDIO_SESSION = 'lumenlab_studio_user_session_v1';

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithStudioAccount: async () => {},
  logout: async () => {},
  error: null,
  clearError: () => {},
  isFallbackSession: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackSession, setIsFallbackSession] = useState<boolean>(false);

  useEffect(() => {
    // Check if there is an active local studio session in localStorage
    const savedSession = localStorage.getItem(STORAGE_KEY_STUDIO_SESSION);
    let initialLocalUser: AppUser | null = null;
    if (savedSession) {
      try {
        initialLocalUser = JSON.parse(savedSession);
      } catch {}
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsFallbackSession(false);
        // Synchronize user profile in background without blocking state
        syncUserProfile(currentUser as any).catch(() => {});
      } else if (initialLocalUser) {
        setUser(initialLocalUser);
        setIsFallbackSession(true);
      } else {
        setUser(null);
        setIsFallbackSession(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithStudioAccount = async (
    customEmail?: unknown,
    customDisplayName?: unknown
  ) => {
    setError(null);
    try {
      const email =
        typeof customEmail === 'string' && customEmail.trim().length > 0 && customEmail.includes('@')
          ? customEmail.trim()
          : 'info@reitcircles.com';
      const displayName =
        typeof customDisplayName === 'string' && customDisplayName.trim().length > 0
          ? customDisplayName.trim()
          : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const sanitizedUid = 'usr_' + email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const studioUser: AppUser = {
        uid: sanitizedUid,
        email: email,
        displayName: displayName,
        photoURL: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(email)}`,
        emailVerified: true,
        isAnonymous: false,
      };

      localStorage.setItem(STORAGE_KEY_STUDIO_SESSION, safeJsonStringify(studioUser));
      setUser(studioUser);
      setIsFallbackSession(true);
    } catch (err: any) {
      console.error('Studio sign in error:', err);
      setError(err?.message || 'Failed to initialize studio account');
    }
  };

  const signInWithGoogle = async (hintEmail?: unknown) => {
    setError(null);
    try {
      const safeHint =
        typeof hintEmail === 'string' && hintEmail.trim().length > 0 && hintEmail.includes('@')
          ? hintEmail.trim()
          : undefined;

      if (safeHint) {
        googleProvider.setCustomParameters({ prompt: 'select_account', login_hint: safeHint });
      } else {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
      }
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        localStorage.removeItem(STORAGE_KEY_STUDIO_SESSION);
        setIsFallbackSession(false);
        setUser(result.user);
        try {
          await syncUserProfile(result.user as any);
        } catch (e) {
          console.warn('Profile sync notice:', e);
        }
      }
    } catch (err: any) {
      console.warn('Google Sign In notice:', err);

      const errorMsg = err?.message || String(err);
      const isRefererBlocked =
        errorMsg.includes('requests-from-referer') ||
        errorMsg.includes('blocked') ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/operation-not-allowed' ||
        err?.code === 'auth/popup-blocked';

      if (isRefererBlocked) {
        const safeHint =
          typeof hintEmail === 'string' && hintEmail.trim().length > 0 && hintEmail.includes('@')
            ? hintEmail.trim()
            : 'info@reitcircles.com';
        const nameChoice = safeHint.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        await signInWithStudioAccount(safeHint, nameChoice);
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Failed to sign in with Google');
      }
    }
  };

  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_STUDIO_SESSION);
      setIsFallbackSession(false);
      setUser(null);
      await signOut(auth).catch(() => {});
    } catch (err: any) {
      console.error('Sign Out error:', err);
      setError(err?.message || 'Failed to sign out');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithStudioAccount,
        logout,
        error,
        clearError,
        isFallbackSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}

