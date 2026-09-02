import React, { useState } from 'react';
import {
  Cloud,
  Lock,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  AlertCircle,
  Loader2,
  Database,
  UserCheck,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import { soundFx } from '../utils/audio';

interface SignInGatePageProps {
  projects: Project[];
  onKeepSingleProject?: (keepProjectId: string) => void;
  onContinueAsGuest?: () => void;
}

export const SignInGatePage: React.FC<SignInGatePageProps> = ({
  projects = [],
  onKeepSingleProject,
  onContinueAsGuest,
}) => {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const { user, loading, signInWithGoogle, signInWithStudioAccount, error, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [customEmail, setCustomEmail] = useState('info@reitcircles.com');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedFallbackProjectId, setSelectedFallbackProjectId] = useState<string>(
    safeProjects[0]?.id || ''
  );

  const handleGoogleSignIn = async (emailHint?: unknown) => {
    soundFx.playHapticTick();
    clearError();
    setIsSigningIn(true);
    try {
      const hint = typeof emailHint === 'string' && emailHint.includes('@')
        ? emailHint.trim()
        : (customEmail && customEmail.includes('@') ? customEmail.trim() : undefined);
      await signInWithGoogle(hint);
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleStudioSignIn = async (emailToUse?: unknown) => {
    soundFx.playHapticTick();
    clearError();
    setIsSigningIn(true);
    try {
      const email = (typeof emailToUse === 'string' && emailToUse.includes('@')
        ? emailToUse
        : (customEmail || 'info@reitcircles.com')).trim();
      const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      await signInWithStudioAccount(email, displayName);
    } catch (err) {
      console.error('Studio sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSelectSingleProject = () => {
    soundFx.playHapticTick();
    if (onKeepSingleProject && selectedFallbackProjectId) {
      onKeepSingleProject(selectedFallbackProjectId);
    } else if (onContinueAsGuest) {
      onContinueAsGuest();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAF9F6] text-[#2A2723] flex flex-col items-center justify-between overflow-y-auto px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-radial from-amber-100/40 via-amber-50/10 to-transparent pointer-events-none" />

      {/* Header / Brand */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E6E2D3] shadow-xs text-xs font-semibold text-[#7E7365] mb-4">
          <Cloud className="w-3.5 h-3.5 text-amber-700" />
          <span>LumenLab Cloud Sync & Security</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-[#2A2723] leading-tight mb-3">
          {safeProjects.length > 1 ? 'Sign in to manage multiple projects' : 'Sign in to LumenLab Studio'}
        </h1>
        <p className="text-sm sm:text-base text-[#7E7365] leading-relaxed max-w-md">
          {safeProjects.length > 1
            ? `You currently have ${safeProjects.length} projects in your workspace. Connect your account to sync your projects and custom presets across all your devices with Firebase Cloud Firestore.`
            : 'Connect your Google or Workspace account to sync your projects, media library, and custom presets seamlessly with Firebase Cloud Firestore.'}
        </p>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl mx-auto my-6 flex flex-col gap-6">
        {/* Error Alert if any */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-rose-600 hover:text-rose-900 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Sign-In Card */}
        <div className="bg-white rounded-3xl border border-[#E6E2D3] p-6 sm:p-8 shadow-xl shadow-amber-900/5 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-1 shadow-inner">
              <Lock className="w-7 h-7 text-[#2A2723]" />
            </div>
            <h2 className="text-lg font-bold text-[#2A2723]">
              Unlock Multi-Project Workspace
            </h2>
            <p className="text-xs text-[#7E7365] max-w-sm">
              Instant authentication powered by Firebase. No passwords required.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Primary Google Sign-In Action Button */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={isSigningIn || loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#2A2723] hover:bg-black text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn || loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Account Choice Section */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E6E2D3] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label htmlFor="custom-email-input" className="text-xs font-bold text-[#2A2723] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-800" />
                  <span>Choose Gmail / Workspace Email</span>
                </label>
                <span className="text-[10px] text-[#7E7365] font-mono">Select or type</span>
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-[#7E7365] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="custom-email-input"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com or work email..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#E6E2D3] text-xs text-[#2A2723] placeholder-[#A8A29E] focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-2xs font-medium"
                />
              </div>

              {/* Quick Suggestion Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#7E7365]">Quick pick:</span>
                <button
                  type="button"
                  onClick={() => setCustomEmail('info@reitcircles.com')}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-mono ${
                    customEmail === 'info@reitcircles.com'
                      ? 'bg-amber-100 border-amber-300 text-[#2A2723] font-bold'
                      : 'bg-white border-[#E6E2D3] text-[#7E7365] hover:border-amber-300'
                  }`}
                >
                  info@reitcircles.com
                </button>
                <button
                  type="button"
                  onClick={() => setCustomEmail('')}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723] hover:border-amber-300 transition-all cursor-pointer"
                >
                  Clear / Type other
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(customEmail)}
                  disabled={isSigningIn || loading}
                  className="py-2.5 px-3.5 rounded-xl bg-[#2A2723] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-xs disabled:opacity-60 cursor-pointer"
                  title="Sign in with Google Account Selection"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google Sign In Prompt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStudioSignIn(customEmail)}
                  disabled={isSigningIn || loading}
                  className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-amber-50 text-[#2A2723] font-semibold text-xs border border-amber-300 flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.98] shadow-xs cursor-pointer"
                  title="Instant sign-in with the chosen email"
                >
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Use This Email</span>
                </button>
              </div>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F0EEE6]">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]/60">
              <Cloud className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#2A2723]">Automatic Cloud Backup</div>
                <div className="text-[11px] text-[#7E7365]">Real-time Firestore persistence</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]/60">
              <FolderOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#2A2723]">Unlimited Projects</div>
                <div className="text-[11px] text-[#7E7365]">Organize multi-slide layouts</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]/60">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#2A2723]">Sync Custom Presets</div>
                <div className="text-[11px] text-[#7E7365]">Save and recall color grades</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]/60">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#2A2723]">Private & Encrypted</div>
                <div className="text-[11px] text-[#7E7365]">Secure rules & Google Cloud</div>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Projects Preview Box or Guest Mode Continue */}
        {safeProjects.length > 1 ? (
          <div className="bg-white/80 rounded-2xl border border-[#E6E2D3] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-[#7E7365]">
              <span className="font-semibold text-[#2A2723] uppercase tracking-wider text-[10px]">
                Projects Waiting to Sync ({safeProjects.length})
              </span>
              <span>Local Cache Safe</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {safeProjects.map((proj) => {
                const slideCount = proj.collages?.length || 1;
                const thumb = proj.thumbnailUrl || proj.media?.url || proj.collages?.[0]?.previewThumbnail;
                const isSelected = selectedFallbackProjectId === proj.id;

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedFallbackProjectId(proj.id)}
                    className={`p-2 rounded-xl border flex flex-col gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-[#FAF9F6] border-[#E6E2D3] hover:border-[#CCC7B5]'
                    }`}
                  >
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/5 relative">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={proj.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#A39989]">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-black/70 text-white text-[9px] font-bold rounded">
                        {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#2A2723] truncate">
                      {proj.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alternative: Continue in single project guest mode */}
            <div className="pt-2 border-t border-[#F0EEE6] flex items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-[#7E7365]">
                Or continue with a single project in guest mode:
              </span>
              <button
                type="button"
                onClick={handleSelectSingleProject}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] font-semibold text-xs border border-[#E6E2D3] transition-colors cursor-pointer whitespace-nowrap"
              >
                Keep 1 Project & Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl border border-[#E6E2D3] p-3.5 flex items-center justify-between gap-3 text-xs">
            <span className="text-xs text-[#7E7365]">
              Want to explore the editor in guest mode without signing in?
            </span>
            <button
              type="button"
              onClick={handleSelectSingleProject}
              className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] font-semibold text-xs border border-[#E6E2D3] transition-colors cursor-pointer whitespace-nowrap active:scale-95"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="relative z-10 text-center text-xs text-[#A39989] flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-amber-700" />
        <span>LumenLab Cloud Database (us-west1)</span>
      </div>
    </div>
  );
};

