import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquarePlus,
  Send,
  Star,
  CheckCircle2,
  Mail,
  Copy,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  Filter,
  Search,
  X,
  RefreshCw,
  FileText,
  Check,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';
import {
  FeedbackCategory,
  FeedbackSubmission,
  CATEGORY_LABELS,
  createFeedbackGoogleForm,
  getSavedGoogleFormConfig,
  submitFeedbackToFirestore,
  subscribeToFeedbackList,
  upvoteFeedbackItem,
  formatFeedbackEmailBody,
  generateFeedbackMailtoUrl,
  GoogleFormConfig,
} from '../services/googleFormsService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user, accessToken, signInWithGoogle } = useAuth();

  // Active Tab: 'submit' | 'google-form' | 'roadmap'
  const [activeTab, setActiveTab] = useState<'submit' | 'google-form' | 'roadmap'>('submit');

  // Helper to identify platform admin email addresses that must not appear in feedback forms
  const isPlatformAdminEmail = (email?: string | null): boolean => {
    if (!email) return false;
    const lower = email.trim().toLowerCase();
    return lower.includes('saha.nilay') || lower === 'saha.nilay@gmail.com';
  };

  // Form input state
  const [category, setCategory] = useState<FeedbackCategory>('feature_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (user?.email && !isPlatformAdminEmail(user.email)) {
      return user.email;
    }
    return '';
  });
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);

  // Status & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedItem, setSubmittedItem] = useState<FeedbackSubmission | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Google Forms API State
  const [googleFormConfig, setGoogleFormConfig] = useState<GoogleFormConfig | null>(() => getSavedGoogleFormConfig());
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Community Roadmap / Submissions list
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [roadmapSearch, setRoadmapSearch] = useState('');
  const [roadmapFilter, setRoadmapFilter] = useState<string>('all');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('lumenlab_upvoted_feedback_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Ensure platform admin email is never prefilled or retained in the form
  useEffect(() => {
    if (user?.email && !isPlatformAdminEmail(user.email)) {
      if (!userEmail || isPlatformAdminEmail(userEmail)) {
        setUserEmail(user.email);
      }
    } else if (isPlatformAdminEmail(userEmail)) {
      setUserEmail('');
    }
  }, [user?.email, userEmail]);

  // Whenever modal opens, purge any legacy session containing platform admin email and ensure input is clean
  useEffect(() => {
    if (isOpen) {
      if (isPlatformAdminEmail(userEmail) || isPlatformAdminEmail(user?.email)) {
        setUserEmail('');
      }
      try {
        const storedSession = localStorage.getItem('lumenlab_studio_user_session_v1');
        if (storedSession && storedSession.toLowerCase().includes('saha.nilay')) {
          localStorage.removeItem('lumenlab_studio_user_session_v1');
        }
      } catch {}
    }
  }, [isOpen, userEmail, user?.email]);

  // Subscribe to community feedback when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToFeedbackList(
      (items) => setFeedbackList(items),
      (err) => console.warn('Roadmap list fetch note:', err)
    );
    return () => unsubscribe();
  }, [isOpen]);

  // Handle Form Submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setSubmitError('Please enter both a title and details for your feedback/feature request.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submissionId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const submission: FeedbackSubmission = {
        id: submissionId,
        category,
        title: title.trim(),
        description: description.trim(),
        rating,
        userEmail:
          userEmail.trim() && !isPlatformAdminEmail(userEmail.trim())
            ? userEmail.trim()
            : user?.email && !isPlatformAdminEmail(user.email)
            ? user.email
            : undefined,
        userName: user?.displayName || undefined,
        userId: user?.uid || undefined,
        googleFormId: googleFormConfig?.formId || undefined,
        upvotes: 0,
        systemInfo: includeSystemInfo
          ? {
              screenResolution: `${window.innerWidth}x${window.innerHeight}`,
              userAgent: navigator.userAgent,
              url: window.location.href,
            }
          : undefined,
        createdAt: Date.now(),
      };

      // 1. Persist to Firestore
      await submitFeedbackToFirestore(submission);

      // 2. Play tactile chime
      soundFx.playShutter();

      setSubmittedItem(submission);
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setSubmitError(err?.message || 'Failed to submit feedback. Please try again or email directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create or Re-link Google Form via Google Forms API v1
  const handleCreateGoogleForm = async () => {
    setFormError(null);
    if (!accessToken) {
      try {
        await signInWithGoogle();
      } catch (err: any) {
        setFormError('Please sign in with Google to grant permission to create the Google Form.');
        return;
      }
    }

    // Double check token
    if (!accessToken) {
      setFormError('Google authorization token not detected. Please sign in with your Google account.');
      return;
    }

    setIsCreatingForm(true);
    try {
      soundFx.playHapticTick();
      const config = await createFeedbackGoogleForm(accessToken);
      setGoogleFormConfig(config);
      soundFx.playShutter();
    } catch (err: any) {
      console.error('Create Google Form error:', err);
      setFormError(err?.message || 'Failed to generate Google Form via API.');
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Upvote an existing request
  const handleUpvote = async (item: FeedbackSubmission) => {
    if (upvotedIds.has(item.id)) return;
    soundFx.playHapticTick();

    const nextUpvotes = new Set(upvotedIds);
    nextUpvotes.add(item.id);
    setUpvotedIds(nextUpvotes);
    try {
      localStorage.setItem('lumenlab_upvoted_feedback_ids', JSON.stringify(Array.from(nextUpvotes)));
    } catch {}

    try {
      await upvoteFeedbackItem(item.id);
    } catch (e) {
      console.warn('Upvote error note:', e);
    }
  };

  // Copy email text to clipboard
  const handleCopyEmail = (item: FeedbackSubmission) => {
    soundFx.playHapticTick();
    const text = formatFeedbackEmailBody(item);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    });
  };

  // Filtered roadmap items
  const filteredRoadmap = useMemo(() => {
    return feedbackList.filter((item) => {
      if (roadmapFilter !== 'all' && item.category !== roadmapFilter) return false;
      if (roadmapSearch.trim()) {
        const query = roadmapSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          CATEGORY_LABELS[item.category]?.label.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [feedbackList, roadmapFilter, roadmapSearch]);

  if (!isOpen) return null;

  return (
    <div
      id="feedback-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playHapticTick();
          onClose();
        }
      }}
    >
      <div
        id="feedback-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 leading-tight">
                Feedback & Feature Requests
              </h2>
              <p className="text-xs text-stone-500">
                Help improve LumenLab • Share suggestions, bug reports & feature ideas
              </p>
            </div>
          </div>
          <button
            id="feedback-modal-close-btn"
            onClick={() => {
              soundFx.playHapticTick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-stone-100 bg-white">
          <button
            id="tab-submit-feedback"
            onClick={() => {
              soundFx.playHapticTick();
              setActiveTab('submit');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Feedback</span>
          </button>

          <button
            id="tab-google-form"
            onClick={() => {
              soundFx.playHapticTick();
              setActiveTab('google-form');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'google-form'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Google Form</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold">
              Live
            </span>
          </button>

          <button
            id="tab-roadmap"
            onClick={() => {
              soundFx.playHapticTick();
              setActiveTab('roadmap');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roadmap'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature Roadmap</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700">
              {feedbackList.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: SUBMIT FEEDBACK */}
          {activeTab === 'submit' && (
            <div>
              {submittedItem ? (
                /* Success View */
                <div className="py-6 px-4 text-center max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">Thank you for your feedback!</h3>
                    <p className="text-xs text-stone-600 mt-1">
                      Your suggestion has been logged to help improve LumenLab. An email dispatch has been formatted for the product engineering team.
                    </p>
                  </div>

                  {/* Submission Confirmation Box */}
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Received by Development Team</span>
                    </div>
                    <p className="text-xs text-stone-600">
                      Your feedback has been logged to help improve LumenLab and queued in the backend for engineer review.
                    </p>
                    <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200/80">
                      Subject: [{CATEGORY_LABELS[submittedItem.category].label}] {submittedItem.title}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      id="feedback-copy-email-btn"
                      onClick={() => handleCopyEmail(submittedItem)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Formatted Summary'}</span>
                    </button>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        soundFx.playHapticTick();
                        setSubmittedItem(null);
                        setTitle('');
                        setDescription('');
                      }}
                      className="text-xs text-amber-700 hover:text-amber-800 font-medium underline cursor-pointer"
                    >
                      Submit another feature request or feedback
                    </button>
                  </div>
                </div>
              ) : (
                /* Input Form */
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  {/* Notice Banner */}
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
                    <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Direct Product Delivery</p>
                      <p className="text-amber-800/90 text-[11px] mt-0.5">
                        Your submission is securely logged and routed to our engineering queue via backend dispatch.
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                      <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            id={`feedback-cat-${cat}`}
                            onClick={() => {
                              soundFx.playHapticTick();
                              setCategory(cat);
                            }}
                            className={`px-2.5 py-2 rounded-xl text-left border text-xs transition-all cursor-pointer flex flex-col gap-0.5 ${
                              isSelected
                                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                            }`}
                          >
                            <span className="font-medium">{CATEGORY_LABELS[cat].label}</span>
                            <span className={`text-[10px] leading-tight ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                              {CATEGORY_LABELS[cat].description.slice(0, 38)}...
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feature Title */}
                  <div>
                    <label htmlFor="feedback-title-input" className="block text-xs font-medium text-stone-700 mb-1">
                      Title / Summary <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="feedback-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Add batch image collage export, or Kodak Ektar 100 preset"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                      maxLength={180}
                      required
                    />
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label htmlFor="feedback-desc-input" className="block text-xs font-medium text-stone-700 mb-1">
                      Detailed Description & Desired Features <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="feedback-desc-input"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what capabilities you would like to see added, how they should work, and what problems they would solve for you..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none"
                      maxLength={4000}
                      required
                    />
                  </div>

                  {/* Satisfaction Rating */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Overall App Satisfaction
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            id={`feedback-star-${star}`}
                            onClick={() => {
                              soundFx.playHapticTick();
                              setRating(star);
                            }}
                            className="p-1 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-stone-500">
                        {rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Loving it'}
                        {rating === 4 && '⭐️⭐️⭐️⭐️ Good experience'}
                        {rating === 3 && '⭐️⭐️⭐️ Neutral'}
                        {rating === 2 && '⭐️⭐️ Needs improvement'}
                        {rating === 1 && '⭐️ Significant issues'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Email & Diagnostic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label htmlFor="feedback-email-input" className="block text-xs font-medium text-stone-700 mb-1">
                        Your Email (For Follow-Up)
                      </label>
                      <input
                        id="feedback-email-input"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600">
                        <input
                          id="feedback-include-system-info"
                          type="checkbox"
                          checked={includeSystemInfo}
                          onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                          className="rounded text-stone-900 focus:ring-stone-900"
                        />
                        <span>Include device & screen diagnostics</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playHapticTick();
                        setActiveTab('google-form');
                      }}
                      className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                      <span>Use Google Form instead</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playHapticTick();
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="feedback-submit-btn"
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL GOOGLE FORM INTEGRATION */}
          {activeTab === 'google-form' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-semibold text-stone-900">
                      Official Google Forms Integration
                    </h3>
                  </div>
                  {googleFormConfig && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Form Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600">
                  LumenLab uses Google Forms with the official Google Forms API. Form submissions help steer product development and are tracked by our engineering team.
                </p>

                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {formError}
                  </div>
                )}

                {/* Google Form Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {googleFormConfig ? (
                    <>
                      <a
                        id="google-form-open-tab-btn"
                        href={googleFormConfig.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Google Form in New Tab</span>
                      </a>
                      <a
                        id="google-form-edit-btn"
                        href={googleFormConfig.editUri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Edit Form Questions</span>
                      </a>
                    </>
                  ) : null}

                  <button
                    id="google-form-generate-btn"
                    onClick={handleCreateGoogleForm}
                    disabled={isCreatingForm}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCreatingForm ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    <span>
                      {isCreatingForm
                        ? 'Creating via Google Forms API...'
                        : googleFormConfig
                        ? 'Re-create Google Form via API'
                        : 'Create Official Google Form via API'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Form View / Fallback Embed */}
              {googleFormConfig ? (
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-2.5 bg-stone-100/80 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
                    <span className="font-medium">Live Google Form View</span>
                    <a
                      href={googleFormConfig.responderUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-medium underline"
                    >
                      <span>Open full page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="h-96 w-full relative bg-stone-50">
                    <iframe
                      src={googleFormConfig.responderUri}
                      title="LumenLab Google Form"
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-stone-300 rounded-xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                  <h4 className="text-xs font-semibold text-stone-800">
                    Ready to Connect Google Form
                  </h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Click "Create Official Google Form via API" above to generate a configured feedback form with preset questions on your Google Workspace account.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROADMAP & COMMUNITY REQUESTS */}
          {activeTab === 'roadmap' && (
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={roadmapSearch}
                    onChange={(e) => setRoadmapSearch(e.target.value)}
                    placeholder="Search feature requests or feedback..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-3 h-3 text-stone-400 flex-shrink-0" />
                  {['all', 'feature_request', 'bug_report', 'preset_request'].map((catKey) => (
                    <button
                      key={catKey}
                      onClick={() => {
                        soundFx.playHapticTick();
                        setRoadmapFilter(catKey);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        roadmapFilter === catKey
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                      }`}
                    >
                      {catKey === 'all' ? 'All' : CATEGORY_LABELS[catKey as FeedbackCategory]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredRoadmap.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-500 space-y-2 border border-dashed border-stone-200 rounded-xl">
                    <HelpCircle className="w-6 h-6 text-stone-400 mx-auto" />
                    <p>No feature requests matching this filter.</p>
                    <button
                      onClick={() => {
                        soundFx.playHapticTick();
                        setActiveTab('submit');
                      }}
                      className="text-amber-700 hover:text-amber-900 font-medium underline"
                    >
                      Be the first to submit one!
                    </button>
                  </div>
                ) : (
                  filteredRoadmap.map((item) => {
                    const hasUpvoted = upvotedIds.has(item.id);
                    const catMeta = CATEGORY_LABELS[item.category];

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-stone-50/70 hover:bg-stone-50 border border-stone-200 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${catMeta.badgeColor}`}
                              >
                                {catMeta.label}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-stone-900">{item.title}</h4>
                          </div>

                          <button
                            id={`upvote-btn-${item.id}`}
                            onClick={() => handleUpvote(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              hasUpvoted
                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                            }`}
                            title={hasUpvoted ? 'Upvoted!' : 'Upvote this request'}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-amber-600 text-amber-600' : ''}`} />
                            <span>{item.upvotes || 0}</span>
                          </button>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-200/60">
                          <span>
                            From:{' '}
                            {item.userName && !item.userName.toLowerCase().includes('saha')
                              ? item.userName
                              : item.userEmail && !isPlatformAdminEmail(item.userEmail)
                              ? item.userEmail.split('@')[0]
                              : 'Community User'}
                          </span>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{item.rating}/5</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
