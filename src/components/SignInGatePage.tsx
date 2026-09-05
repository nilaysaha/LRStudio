import React, { useState } from 'react';
import {
  Cloud,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { soundFx } from '../utils/audio';

interface SignInGatePageProps {
  onContinueAsGuest?: () => void;
  onClose?: () => void;
}

export const SignInGatePage: React.FC<SignInGatePageProps> = ({
  onContinueAsGuest,
  onClose,
}) => {
  const { loading, signInWithGoogle, signInWithStudioAccount, error, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showOtherEmailOptions, setShowOtherEmailOptions] = useState(false);

  // Standard Google login: Browser natively prompts with all signed-in Google accounts
  const handleGoogleSignIn = async (specificEmail?: string) => {
    soundFx.playHapticTick();
    clearError();
    setIsSigningIn(true);
    try {
      const hint = specificEmail && specificEmail.includes('@') ? specificEmail.trim() : undefined;
      await signInWithGoogle(hint);
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Direct login with chosen email if user wants to use a specific email address
  const handleCustomEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      return;
    }
    soundFx.playHapticTick();
    clearError();
    setIsSigningIn(true);
    try {
      await handleGoogleSignIn(emailInput.trim());
    } catch (err) {
      console.error('Custom email sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      id="signin-gate-overlay"
      className="fixed inset-0 z-[100] bg-[#FAF9F6]/95 backdrop-blur-sm text-[#2A2723] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Background Decorative Gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 bg-radial from-amber-100/50 via-amber-50/20 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-5">
        {/* Branding & Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6E2D3] shadow-xs flex items-center justify-center text-amber-800 mb-1">
            <Sparkles className="w-6 h-6 text-amber-700" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#2A2723]">
            Sign in to LumenLab
          </h1>
          <p className="text-xs sm:text-sm text-[#7E7365] max-w-xs">
            Sync your projects, media library, and custom presets securely to Studio Cloud.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            id="signin-error-alert"
            className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="line-clamp-2">{error}</span>
            </div>
            <button
              id="signin-error-dismiss-btn"
              type="button"
              onClick={clearError}
              className="text-rose-600 hover:text-rose-900 font-bold text-xs shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google Login Block */}
        <div
          id="google-login-block"
          className="bg-white rounded-3xl border border-[#E6E2D3] p-6 sm:p-7 shadow-xl shadow-amber-900/5 flex flex-col gap-4"
        >
          {/* Primary Google Sign-In Action */}
          <button
            id="google-signin-primary-btn"
            type="button"
            onClick={() => handleGoogleSignIn()}
            disabled={isSigningIn || loading}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#2A2723] hover:bg-black text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isSigningIn || loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

          <p className="text-[11px] text-center text-[#A39989]">
            Detects all Google accounts logged in on your browser.
          </p>

          {/* Collapsible / Integrated Option to Choose Specific or Other Email */}
          <div className="pt-3 border-t border-[#F0EEE6] flex flex-col gap-3">
            <button
              id="toggle-other-email-btn"
              type="button"
              onClick={() => {
                setShowOtherEmailOptions((prev) => !prev);
                soundFx.playHapticTick();
              }}
              className="flex items-center justify-between text-xs font-medium text-[#7E7365] hover:text-[#2A2723] py-1 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-700" />
                <span>Choose another account or email</span>
              </div>
              {showOtherEmailOptions ? (
                <ChevronUp className="w-4 h-4 text-[#A39989]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A39989]" />
              )}
            </button>

            {showOtherEmailOptions && (
              <form
                onSubmit={handleCustomEmailSignIn}
                className="flex flex-col gap-2.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A39989] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="choose-email-input"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter Gmail or Workspace email..."
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] placeholder-[#A8A29E] focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                <button
                  id="submit-chosen-email-btn"
                  type="submit"
                  disabled={!emailInput || isSigningIn || loading}
                  className="w-full py-2 px-4 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] font-semibold text-xs border border-[#E6E2D3] hover:border-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Continue with {emailInput ? emailInput.split('@')[0] : 'this email'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#7E7365]" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Guest Mode or Close */}
        <div className="flex flex-col items-center gap-2">
          {onContinueAsGuest && (
            <button
              id="signin-continue-guest-btn"
              type="button"
              onClick={() => {
                soundFx.playHapticTick();
                onContinueAsGuest();
              }}
              className="text-xs font-semibold text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-black/5"
            >
              Continue as Guest (Explore without signing in)
            </button>
          )}

          {onClose && (
            <button
              id="signin-close-modal-btn"
              type="button"
              onClick={() => {
                soundFx.playHapticTick();
                onClose();
              }}
              className="text-xs text-[#A39989] hover:text-[#2A2723] transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        {/* Security / Cloud Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A39989]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured with Cloud Authentication & Encryption</span>
        </div>
      </div>
    </div>
  );
};
