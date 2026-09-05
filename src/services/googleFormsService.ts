import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  increment,
  onSnapshot,
  Unsubscribe,
} from '../lib/firebase';
import { safeJsonStringify } from '../utils/safeClone';

export type FeedbackCategory =
  | 'feature_request'
  | 'bug_report'
  | 'preset_request'
  | 'performance'
  | 'general';

export const CATEGORY_LABELS: Record<FeedbackCategory, { label: string; badgeColor: string; description: string }> = {
  feature_request: {
    label: 'Feature Request',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Propose a new tool, workflow, or capability you need in LumenLab',
  },
  bug_report: {
    label: 'Bug Report',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Report an issue, visual glitch, or unexpected behavior',
  },
  preset_request: {
    label: 'Preset / Aesthetic Idea',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Suggest film stocks, grading recipes, or template layouts',
  },
  performance: {
    label: 'Performance / Usability',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Feedback on export speeds, rendering, or mobile responsiveness',
  },
  general: {
    label: 'General Feedback',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'General thoughts or praise for the team',
  },
};

export interface FeedbackSubmission {
  id: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  rating: number;
  userEmail?: string;
  userName?: string;
  userId?: string;
  googleFormId?: string;
  recipientEmails?: string[];
  upvotes: number;
  systemInfo?: {
    screenResolution?: string;
    userAgent?: string;
    url?: string;
  };
  createdAt: number;
  updatedAt?: number;
}

export interface GoogleFormConfig {
  formId: string;
  responderUri: string;
  editUri: string;
  title: string;
  createdAt: number;
}

const STORAGE_KEY_FORM_CONFIG = 'lumenlab_google_form_config_v1';

/**
 * Retrieve cached or saved Google Form config from local storage
 */
export function getSavedGoogleFormConfig(): GoogleFormConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORM_CONFIG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save Google Form config to local storage
 */
export function saveGoogleFormConfig(config: GoogleFormConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORM_CONFIG, safeJsonStringify(config));
  } catch (err) {
    console.warn('Failed to save Google Form config to local storage:', err);
  }
}

/**
 * Create a live Google Form via Google Forms API v1
 * Configures questions: Category, Title, Desired Features & Details, Rating, and Email
 */
export async function createFeedbackGoogleForm(accessToken: string): Promise<GoogleFormConfig> {
  // Step 1: Create top-level form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: 'LumenLab - Feedback & Feature Requests',
        documentTitle: 'LumenLab User Feedback & Feature Requests',
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Google Forms creation failed (${createRes.status}): ${errText}`);
  }

  const formData = await createRes.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
  const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

  // Step 2: Batch update to add questions and description
  const batchUpdateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeFormInResponse: true,
      requests: [
        {
          updateFormInfo: {
            info: {
              description:
                'Help us improve LumenLab! Share your valuable feedback, bug reports, and desired user features.',
            },
            updateMask: 'description',
          },
        },
        {
          createItem: {
            item: {
              title: 'Feedback Type',
              description: 'What kind of feedback or feature request are you submitting?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Feature Request' },
                      { value: 'Bug Report' },
                      { value: 'Preset / Color Grade Idea' },
                      { value: 'Performance / Usability' },
                      { value: 'General Feedback' },
                    ],
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Summary / Title',
              description: 'Brief headline of the feature or issue',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Detailed Description & Desired Features',
              description:
                'Describe the requested feature or improvement in detail. How should it work? What problem does it solve?',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: true },
                },
              },
            },
            location: { index: 2 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Satisfaction Rating (1 to 5)',
              description: '1 = Needs significant work, 5 = Excellent',
              questionItem: {
                question: {
                  required: false,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'Needs Work',
                    highLabel: 'Loving It',
                  },
                },
              },
            },
            location: { index: 3 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Your Contact Email (Optional for follow-up)',
              description: 'Your email address so the team can reply regarding your request',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: false },
                },
              },
            },
            location: { index: 4 },
          },
        },
      ],
    }),
  });

  if (!batchUpdateRes.ok) {
    console.warn('Google Forms batch update warning:', await batchUpdateRes.text());
  }

  const config: GoogleFormConfig = {
    formId,
    responderUri,
    editUri,
    title: 'LumenLab - Feedback & Feature Requests',
    createdAt: Date.now(),
  };

  saveGoogleFormConfig(config);
  return config;
}

/**
 * Fetch Google Form responses using the Google Forms API v1
 */
export async function fetchGoogleFormResponses(formId: string, accessToken: string): Promise<any> {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to load Google Form responses (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Persist feedback submission to Firestore
 */
export async function submitFeedbackToFirestore(submission: FeedbackSubmission): Promise<void> {
  const feedbackDocRef = doc(db, 'user_feedback', submission.id);
  await setDoc(feedbackDocRef, {
    id: submission.id,
    category: submission.category,
    title: submission.title.trim().slice(0, 200),
    description: submission.description.trim().slice(0, 5000),
    rating: submission.rating,
    userEmail: submission.userEmail?.trim() || null,
    userName: submission.userName?.trim() || null,
    userId: submission.userId || null,
    googleFormId: submission.googleFormId || null,
    recipientEmails: submission.recipientEmails || [],
    upvotes: submission.upvotes || 0,
    systemInfo: submission.systemInfo || null,
    createdAt: submission.createdAt || Date.now(),
  });
}

/**
 * Upvote a community feedback or feature request
 */
export async function upvoteFeedbackItem(feedbackId: string): Promise<void> {
  const feedbackDocRef = doc(db, 'user_feedback', feedbackId);
  await updateDoc(feedbackDocRef, {
    upvotes: increment(1),
    updatedAt: Date.now(),
  });
}

/**
 * Subscribe to feedback submissions in Firestore
 */
export function subscribeToFeedbackList(
  onData: (items: FeedbackSubmission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const feedbackColRef = collection(db, 'user_feedback');
  const q = query(feedbackColRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: FeedbackSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          category: d.category || 'feature_request',
          title: d.title || 'Untitled Feedback',
          description: d.description || '',
          rating: typeof d.rating === 'number' ? d.rating : 5,
          userEmail: d.userEmail || undefined,
          userName: d.userName || undefined,
          userId: d.userId || undefined,
          googleFormId: d.googleFormId || undefined,
          recipientEmails: d.recipientEmails || [],
          upvotes: typeof d.upvotes === 'number' ? d.upvotes : 0,
          systemInfo: d.systemInfo || undefined,
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || undefined,
        });
      });
      onData(items);
    },
    (err) => {
      console.warn('Feedback subscription notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Generate formatted email text for copying
 */
export function formatFeedbackEmailBody(submission: FeedbackSubmission): string {
  const catLabel = CATEGORY_LABELS[submission.category]?.label || submission.category;
  return `Hi LumenLab Team,

I am submitting the following user feedback and feature request to help improve the application:

--------------------------------------------------
LUMENLAB FEEDBACK & DESIRED USER FEATURES
--------------------------------------------------
Category: ${catLabel}
Title: ${submission.title}
Satisfaction Rating: ${submission.rating} / 5 Stars
Submitted By: ${submission.userName || 'LumenLab User'} (${submission.userEmail || 'Anonymous'})
Date: ${new Date(submission.createdAt).toLocaleString()}

DESIRED FEATURES & DETAILED FEEDBACK:
${submission.description}

TECHNICAL CONTEXT:
URL: ${submission.systemInfo?.url || window.location.href}
Screen Resolution: ${submission.systemInfo?.screenResolution || `${window.innerWidth}x${window.innerHeight}`}
Browser: ${submission.systemInfo?.userAgent || navigator.userAgent}

--------------------------------------------------
Dispatched via LumenLab Feedback Studio`;
}

/**
 * Generate mailto URL to launch user's default email client
 */
export function generateFeedbackMailtoUrl(submission: FeedbackSubmission): string {
  const catLabel = CATEGORY_LABELS[submission.category]?.label || submission.category;
  const subject = encodeURIComponent(`[LumenLab Feedback] [${catLabel}] ${submission.title}`);
  const body = encodeURIComponent(formatFeedbackEmailBody(submission));
  return `mailto:?subject=${subject}&body=${body}`;
}
