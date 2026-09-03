/**
 * LumenLab - WebGL Photo & Video Filter Editor with LumenLabs Project Templates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, Adjustments, MediaItem, Preset, Project, ProjectTemplate, CollageTemplate } from './types';
import { BUILT_IN_PRESETS, SAMPLE_MEDIA_GALLERY } from './constants/presets';
import { LUMENLAB_PROJECT_TEMPLATES } from './constants/projectTemplates';
import { COLLAGE_TEMPLATES } from './constants/collageTemplates';
import { defaultAdjustments, createAdjustmentsCopy } from './constants/defaultAdjustments';
import { safeJsonStringify } from './utils/safeClone';
import { HistorySnapshot, createHistorySnapshot, cloneMediaItem, cloneCollageTemplate } from './utils/history';
import { EditorHeader } from './components/EditorHeader';
import { useAuth } from './contexts/AuthContext';
import {
  saveProjectToFirestore,
  subscribeToProjects,
  deleteProjectFromFirestore,
  fetchProjectsFromFirestore,
  saveMediaToFirestore,
  subscribeToMedia,
  deleteMediaFromFirestore,
  fetchMediaFromFirestore,
  savePresetToFirestore,
  subscribeToPresets,
  deletePresetFromFirestore,
  fetchPresetsFromFirestore,
} from './lib/firestoreService';
import { ViewportCanvas } from './components/ViewportCanvas';
import { AdjustmentsBar } from './components/AdjustmentsBar';
import { CameraView } from './components/CameraView';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { SavePresetModal } from './components/SavePresetModal';
import { ExportModal } from './components/ExportModal';
import { ProjectsModal } from './components/ProjectsModal';
import { SignInGatePage } from './components/SignInGatePage';
import { TemplateCanvasRenderer } from './components/template/TemplateCanvasRenderer';
import { TemplateCustomizerBar } from './components/template/TemplateCustomizerBar';
import { TemplateSelectorDrawer } from './components/template/TemplateSelectorDrawer';
import { SlidePresentationPreviewModal } from './components/template/SlidePresentationPreviewModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { soundFx } from './utils/audio';
import {
  Sparkles, Grid, Eye, RefreshCw, LayoutTemplate, Sliders, ChevronUp,
  Layers, Plus, Copy, Trash2, ChevronLeft, ChevronRight, FolderPlus,
  FolderOpen, Play
} from 'lucide-react';

const STORAGE_KEY_CUSTOM_PRESETS = 'lumenlab_custom_presets_v1';
const STORAGE_KEY_FAVORITES = 'lumenlab_favorite_presets_v1';
const STORAGE_KEY_PROJECTS = 'lumenlab_user_projects_v2';
const STORAGE_KEY_CURRENT_PROJECT_ID = 'lumenlab_current_project_id_v2';
const STORAGE_KEY_USER_MEDIA = 'lumenlab_user_media_library_v2';

// Seed initial default single project from LumenLabs templates if storage is empty
const INITIAL_SEEDED_PROJECTS: Project[] = [
  {
    id: 'proj-default-sunbath',
    name: 'Sunbath Summer Days',
    templateId: 'tpl-sunbath-golden',
    templateTag: 'sunbath',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 5,
    media: LUMENLAB_PROJECT_TEMPLATES[2].sampleMedia,
    adjustments: createAdjustmentsCopy(LUMENLAB_PROJECT_TEMPLATES[2].adjustments),
    thumbnailUrl: LUMENLAB_PROJECT_TEMPLATES[2].sampleMedia.url,
  },
];

export default function App() {
  // -------------------------------------------------------------
  // 1. Projects State & Persistence
  // -------------------------------------------------------------
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (savedProjects) {
        const parsed = JSON.parse(savedProjects);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            adjustments: createAdjustmentsCopy(p.adjustments),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_SEEDED_PROJECTS;
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_PROJECT_ID);
      if (savedId) return savedId;
    } catch {
      // Fallback
    }
    return 'proj-default-sunbath';
  });

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 2. Active Media, Adjustments & Collage State
  // -------------------------------------------------------------
  const activeInitialProject = projects.find((p) => p.id === currentProjectId) || projects[0] || INITIAL_SEEDED_PROJECTS[0];

  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(() => {
    return activeInitialProject ? activeInitialProject.media : SAMPLE_MEDIA_GALLERY[0];
  });

  const [adjustments, setAdjustments] = useState<Adjustments>(() => {
    return activeInitialProject
      ? createAdjustmentsCopy(activeInitialProject.adjustments)
      : createAdjustmentsCopy(defaultAdjustments);
  });

  // Current active project object
  const currentProject = projects.find((p) => p.id === currentProjectId) || null;

  // Collage & Template Customizer State
  const [activeCollage, setActiveCollage] = useState<CollageTemplate | null>(() => {
    return activeInitialProject?.activeCollage || null;
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [isPlayingMaster, setIsPlayingMaster] = useState(true);
  const [isBottomDrawerCollapsed, setIsBottomDrawerCollapsed] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const slotUploadInputRef = useRef<HTMLInputElement>(null);
  const appBatchFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlotId, setActiveUploadSlotId] = useState<string | null>(null);

  // History Stack for Full App Undo / Redo (Adjustments, Media, Templates, Slots, Text, Slides)
  const [history, setHistory] = useState<HistorySnapshot[]>(() => [
    createHistorySnapshot(
      activeInitialProject ? activeInitialProject.adjustments : defaultAdjustments,
      activeInitialProject ? activeInitialProject.media : SAMPLE_MEDIA_GALLERY[0],
      activeInitialProject?.activeCollage || null,
      null,
      null,
      activeInitialProject || null,
      'Initial State'
    ),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const lastPushTimeRef = useRef<number>(0);
  const lastPushTypeRef = useRef<string>('');

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('presets');

  // Compare Mode: 'none' | 'split' | 'hold'
  const [compareMode, setCompareMode] = useState<'none' | 'split' | 'hold'>('none');

  // Copied Recipe (Copy/Paste edits)
  const [copiedRecipe, setCopiedRecipe] = useState<Adjustments | null>(null);

  // Presets collection (Built-in + Custom + Favorites from localStorage)
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
      const savedFavorites = localStorage.getItem(STORAGE_KEY_FAVORITES);
      const customList: Preset[] = savedCustom ? JSON.parse(savedCustom) : [];
      const favList: string[] = savedFavorites ? JSON.parse(savedFavorites) : ['inso', 'yum', '1984'];

      const combined = [...BUILT_IN_PRESETS, ...customList].map((p) => ({
        ...p,
        isFavorite: favList.includes(p.id),
      }));

      return combined;
    } catch {
      return BUILT_IN_PRESETS;
    }
  });

  // Modals
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [libraryTargetSlotId, setLibraryTargetSlotId] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraInitialMode, setCameraInitialMode] = useState<'photo' | 'video'>('photo');
  const [cameraTargetSlotId, setCameraTargetSlotId] = useState<string | null>(null);
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportInitialScope, setExportInitialScope] = useState<'all-slides' | 'current' | undefined>(undefined);
  const [exportInitialSingleFileType, setExportInitialSingleFileType] = useState<'pdf' | 'strip' | 'zip' | undefined>(undefined);
  const [isSlidePreviewOpen, setIsSlidePreviewOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [projectsModalTab, setProjectsModalTab] = useState<'my-projects' | 'templates' | 'library'>('my-projects');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const handleOpenExportWithOptions = (options?: { scope?: 'all-slides' | 'current'; singleFileType?: 'pdf' | 'strip' | 'zip' }) => {
    setExportInitialScope(options?.scope);
    setExportInitialSingleFileType(options?.singleFileType);
    setIsExportOpen(true);
    soundFx.playHapticTick();
  };

  // User Media Library (recorded videos, camera captures, and uploaded items)
  const [userMediaLibrary, setUserMediaLibrary] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_MEDIA);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Storage unavailable
    }
    return [];
  });

  // Helper to compute deterministic project signature for change detection
  const computeProjectSignature = (project: Project | null | undefined): string => {
    if (!project) return '';
    return JSON.stringify({
      id: project.id,
      name: project.name,
      templateId: project.templateId,
      templateTag: project.templateTag,
      media: project.media
        ? {
            id: project.media.id,
            url: project.media.url,
            type: project.media.type,
            aspectRatio: project.media.aspectRatio,
          }
        : null,
      adjustments: project.adjustments,
      activeCollageIndex: project.activeCollageIndex ?? 0,
      activeCollage: project.activeCollage || null,
      collages: project.collages || [],
    });
  };

  // -------------------------------------------------------------
  // 4. Firebase Cloud Direct Persistence & Real-Time Sync Engine
  // -------------------------------------------------------------
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(Date.now());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProjectSignaturesRef = useRef<Map<string, string>>(new Map());
  const initialCloudProjectSyncDoneRef = useRef<boolean>(false);

  // Real-time Firestore Cloud Project Synchronization (Linked to user.uid)
  useEffect(() => {
    if (!user?.uid) {
      initialCloudProjectSyncDoneRef.current = false;
      return;
    }

    const unsubscribe = subscribeToProjects(
      user.uid,
      (cloudProjects) => {
        if (cloudProjects && cloudProjects.length > 0) {
          // Register signatures of all cloud projects so auto-save won't redundantly re-save them
          cloudProjects.forEach((p) => {
            lastSavedProjectSignaturesRef.current.set(p.id, computeProjectSignature(p));
          });

          setProjects(cloudProjects);
          setCurrentProjectId((prevId) => {
            if (prevId && cloudProjects.some((p) => p.id === prevId)) return prevId;
            return cloudProjects[0].id;
          });

          const activeProj =
            (currentProjectId && cloudProjects.find((p) => p.id === currentProjectId)) ||
            cloudProjects[0];

          if (activeProj) {
            setCurrentMedia((prevM) => {
              if (prevM?.id === activeProj.media?.id && prevM?.url === activeProj.media?.url) {
                return prevM;
              }
              return activeProj.media;
            });
            setAdjustments((prevAdj) => {
              if (JSON.stringify(prevAdj) === JSON.stringify(activeProj.adjustments)) {
                return prevAdj;
              }
              return createAdjustmentsCopy(activeProj.adjustments);
            });
            const activeCol =
              activeProj.activeCollage ||
              (activeProj.collages && activeProj.collages[activeProj.activeCollageIndex || 0]) ||
              null;
            setActiveCollage((prevCol) => {
              if (JSON.stringify(prevCol || null) === JSON.stringify(activeCol || null)) {
                return prevCol;
              }
              return activeCol;
            });
          }
          setLastSavedAt(Date.now());
          setSaveStatus('saved');
          initialCloudProjectSyncDoneRef.current = true;
        }
      },
      (err) => {
        console.warn('Firestore real-time subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time Firestore Cloud Media Synchronization (Linked to user.uid)
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToMedia(
      user.uid,
      (cloudMedia) => {
        if (cloudMedia && cloudMedia.length > 0) {
          setUserMediaLibrary(cloudMedia);
        }
      },
      (err) => {
        console.warn('Firestore media subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time Firestore Cloud Preset Synchronization (Linked to user.uid)
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToPresets(
      user.uid,
      (cloudPresets) => {
        if (cloudPresets && cloudPresets.length > 0) {
          setPresets((prev) => {
            const builtIn = prev.filter((p) => !p.isCustom);
            return [...builtIn, ...cloudPresets];
          });
        }
      },
      (err) => {
        console.warn('Firestore preset subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Always mirror projects and active ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, safeJsonStringify(projects));
      localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT_ID, currentProjectId);
    } catch (e) {
      console.warn('Local storage project mirror warning:', e);
    }
  }, [projects, currentProjectId]);

  // Always mirror user media library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_MEDIA, safeJsonStringify(userMediaLibrary));
    } catch (e) {
      console.warn('Local storage media mirror warning:', e);
    }
  }, [userMediaLibrary]);

  // Direct Firebase Cloud Auto-Save (TRIGGERS ONLY WHEN REAL USER CHANGES OCCUR)
  useEffect(() => {
    if (!user?.uid || !currentProjectId) {
      setSaveStatus('saved');
      return;
    }

    const activeProj = projects.find((p) => p.id === currentProjectId);
    if (!activeProj) {
      return;
    }

    const currentSig = computeProjectSignature(activeProj);
    const lastSavedSig = lastSavedProjectSignaturesRef.current.get(activeProj.id);

    // If signature hasn't changed since last save/load, NO ACTION IS NEEDED
    if (lastSavedSig === currentSig) {
      return;
    }

    // A real change has occurred
    setSaveStatus('saving');

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveProjectToFirestore(user.uid, activeProj);
        lastSavedProjectSignaturesRef.current.set(activeProj.id, currentSig);
        setLastSavedAt(Date.now());
        setSaveStatus('saved');
      } catch (err) {
        console.warn('Direct Firebase auto-save notice:', err);
        lastSavedProjectSignaturesRef.current.set(activeProj.id, currentSig);
        setLastSavedAt(Date.now());
        setSaveStatus('saved');
      }
    }, 600);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [projects, currentProjectId, user?.uid]);

  // Sync active project state whenever currentMedia, adjustments, or activeCollage change
  useEffect(() => {
    if (!currentProjectId || !currentMedia) return;

    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === currentProjectId);
      if (idx === -1) return prev;

      const currentP = prev[idx];
      const isMediaSame =
        currentP.media?.id === currentMedia.id &&
        currentP.media?.url === currentMedia.url &&
        currentP.media?.aspectRatio === currentMedia.aspectRatio;
      const isAdjSame = JSON.stringify(currentP.adjustments) === JSON.stringify(adjustments);
      const isCollageSame =
        JSON.stringify(currentP.activeCollage || null) === JSON.stringify(activeCollage || null);

      if (isMediaSame && isAdjSame && isCollageSame) {
        // No functional change, preserve same array/object reference to prevent cascading effect runs
        return prev;
      }

      const updated = [...prev];
      updated[idx] = {
        ...currentP,
        updatedAt: Date.now(),
        media: currentMedia,
        adjustments: createAdjustmentsCopy(adjustments),
        thumbnailUrl: activeCollage ? activeCollage.previewThumbnail : currentMedia.url,
        activeCollage: activeCollage || undefined,
      };
      return updated;
    });
  }, [adjustments, currentMedia, currentProjectId, activeCollage]);

  // Manual Force Save Direct to Firebase Cloud & Local Storage
  const handleForceSaveToCloud = useCallback(async () => {
    soundFx.playHapticTick();
    setSaveStatus('saving');
    try {
      if (user?.uid && currentProjectId) {
        const activeProj = projects.find((p) => p.id === currentProjectId);
        if (activeProj) {
          await saveProjectToFirestore(user.uid, activeProj);
          lastSavedProjectSignaturesRef.current.set(activeProj.id, computeProjectSignature(activeProj));
        }
      }
      setLastSavedAt(Date.now());
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Manual save completed with local persistence:', err);
      setSaveStatus('saved');
    }
  }, [projects, currentProjectId, user?.uid]);

  // Manual Reload directly from Firebase Cloud
  const handleReloadFromCloud = useCallback(async () => {
    if (!user?.uid) return;
    setSaveStatus('saving');
    try {
      const cloudProjects = await fetchProjectsFromFirestore(user.uid);
      const cloudMedia = await fetchMediaFromFirestore(user.uid);
      const cloudPresets = await fetchPresetsFromFirestore(user.uid);

      if (cloudProjects && cloudProjects.length > 0) {
        cloudProjects.forEach((p) => {
          lastSavedProjectSignaturesRef.current.set(p.id, computeProjectSignature(p));
        });
        setProjects(cloudProjects);
        const activeProj = cloudProjects.find((p) => p.id === currentProjectId) || cloudProjects[0];
        if (activeProj) {
          setCurrentProjectId(activeProj.id);
          setCurrentMedia(activeProj.media);
          setAdjustments(createAdjustmentsCopy(activeProj.adjustments));
          const activeCol =
            activeProj.activeCollage ||
            (activeProj.collages && activeProj.collages[activeProj.activeCollageIndex || 0]) ||
            null;
          setActiveCollage(activeCol);
        }
      }
      if (cloudMedia && cloudMedia.length > 0) {
        setUserMediaLibrary(cloudMedia);
      }
      if (cloudPresets && cloudPresets.length > 0) {
        setPresets((prev) => {
          const builtIn = prev.filter((p) => !p.isCustom);
          return [...builtIn, ...cloudPresets];
        });
      }
      setLastSavedAt(Date.now());
      setSaveStatus('saved');
      soundFx.playHapticTick();
    } catch (err) {
      console.warn('Manual reload from Firebase failed:', err);
      setSaveStatus('error');
    }
  }, [user?.uid, currentProjectId]);

  // Sync favorites & custom presets to localStorage
  useEffect(() => {
    try {
      const customPresets = presets.filter((p) => p.isCustom);
      const favIds = presets.filter((p) => p.isFavorite).map((p) => p.id);
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, safeJsonStringify(customPresets));
      localStorage.setItem(STORAGE_KEY_FAVORITES, safeJsonStringify(favIds));
    } catch {
      // Storage unavailable
    }
  }, [presets]);

  // -------------------------------------------------------------
  // 5. Universal History Record & Undo/Redo Engine
  // -------------------------------------------------------------
  const recordHistory = useCallback(
    (
      snapshot: HistorySnapshot,
      options?: { isDiscrete?: boolean; actionType?: string }
    ) => {
      const now = Date.now();
      const isDiscrete = options?.isDiscrete ?? true;
      const actionType = options?.actionType ?? 'general';
      const isContinuous =
        !isDiscrete &&
        actionType === lastPushTypeRef.current &&
        now - lastPushTimeRef.current < 600;

      lastPushTimeRef.current = now;
      lastPushTypeRef.current = actionType;

      setHistory((prev) => {
        if (isContinuous && prev.length > 0 && historyIndex === prev.length - 1) {
          const copy = [...prev];
          copy[copy.length - 1] = snapshot;
          return copy;
        }
        const truncated = prev.slice(0, historyIndex + 1);
        const nextHistory = [...truncated, snapshot];
        if (nextHistory.length > 60) {
          return nextHistory.slice(nextHistory.length - 60);
        }
        return nextHistory;
      });

      if (!isContinuous || historyIndex !== history.length - 1) {
        setHistoryIndex((prev) => Math.min(prev + 1, 59));
      }
    },
    [historyIndex]
  );

  // Push adjustment changes to History stack
  const updateAdjustments = useCallback(
    (newAdj: Adjustments, pushToHistory = true, isDiscrete = false) => {
      setAdjustments(newAdj);

      if (pushToHistory) {
        const snapshot = createHistorySnapshot(
          newAdj,
          currentMedia,
          activeCollage,
          selectedSlotId,
          selectedTextId,
          currentProject,
          'Adjustments'
        );
        recordHistory(snapshot, { isDiscrete, actionType: 'adjustments' });
      }
    },
    [currentMedia, activeCollage, selectedSlotId, selectedTextId, currentProject, recordHistory]
  );

  // Add user media and auto-sync to Firestore for authenticated users
  const handleAddUserMedia = useCallback(
    (newMedia: MediaItem) => {
      setUserMediaLibrary((prev) => [newMedia, ...prev]);
      if (user?.uid) {
        saveMediaToFirestore(user.uid, newMedia).catch((e) =>
          console.warn('Firestore save media error:', e)
        );
      }
    },
    [user?.uid]
  );

  // Delete user media and remove from Firestore for authenticated users
  const handleDeleteUserMedia = useCallback(
    (mediaId: string) => {
      setUserMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
      if (user?.uid) {
        deleteMediaFromFirestore(user.uid, mediaId).catch((e) =>
          console.warn('Firestore delete media error:', e)
        );
      }
    },
    [user?.uid]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetSnapshot = history[targetIndex];
      if (!targetSnapshot) return;

      soundFx.playHapticTick();
      setHistoryIndex(targetIndex);

      // 1. Restore adjustments
      setAdjustments(createAdjustmentsCopy(targetSnapshot.adjustments));

      // 2. Restore current media
      if (targetSnapshot.currentMedia) {
        setCurrentMedia(cloneMediaItem(targetSnapshot.currentMedia));
      }

      // 3. Restore active collage and selection
      const restoredCollage = targetSnapshot.activeCollage ? cloneCollageTemplate(targetSnapshot.activeCollage) : null;
      setActiveCollage(restoredCollage);
      setSelectedSlotId(targetSnapshot.selectedSlotId);
      setSelectedTextId(targetSnapshot.selectedTextId);

      // 4. Restore project slides if applicable
      if (currentProjectId && targetSnapshot.projectCollages) {
        const restoredCollages = targetSnapshot.projectCollages.map((c) => cloneCollageTemplate(c)!);
        const restoredIdx = targetSnapshot.activeCollageIndex ?? 0;
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== currentProjectId) return p;
            return {
              ...p,
              updatedAt: Date.now(),
              collages: restoredCollages,
              activeCollageIndex: restoredIdx,
              activeCollage: restoredCollages[restoredIdx] || restoredCollage || undefined,
              thumbnailUrl: (restoredCollages[restoredIdx] || restoredCollage)?.previewThumbnail || p.thumbnailUrl,
            };
          })
        );
      }
    }
  }, [historyIndex, history, currentProjectId]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetSnapshot = history[targetIndex];
      if (!targetSnapshot) return;

      soundFx.playHapticTick();
      setHistoryIndex(targetIndex);

      // 1. Restore adjustments
      setAdjustments(createAdjustmentsCopy(targetSnapshot.adjustments));

      // 2. Restore current media
      if (targetSnapshot.currentMedia) {
        setCurrentMedia(cloneMediaItem(targetSnapshot.currentMedia));
      }

      // 3. Restore active collage and selection
      const restoredCollage = targetSnapshot.activeCollage ? cloneCollageTemplate(targetSnapshot.activeCollage) : null;
      setActiveCollage(restoredCollage);
      setSelectedSlotId(targetSnapshot.selectedSlotId);
      setSelectedTextId(targetSnapshot.selectedTextId);

      // 4. Restore project slides if applicable
      if (currentProjectId && targetSnapshot.projectCollages) {
        const restoredCollages = targetSnapshot.projectCollages.map((c) => cloneCollageTemplate(c)!);
        const restoredIdx = targetSnapshot.activeCollageIndex ?? 0;
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== currentProjectId) return p;
            return {
              ...p,
              updatedAt: Date.now(),
              collages: restoredCollages,
              activeCollageIndex: restoredIdx,
              activeCollage: restoredCollages[restoredIdx] || restoredCollage || undefined,
              thumbnailUrl: (restoredCollages[restoredIdx] || restoredCollage)?.previewThumbnail || p.thumbnailUrl,
            };
          })
        );
      }
    }
  }, [historyIndex, history, currentProjectId]);

  // Reset to original
  const handleReset = () => {
    soundFx.playHapticTick();
    const originalPreset = BUILT_IN_PRESETS.find((p) => p.id === 'none');
    const targetAdj = originalPreset ? createAdjustmentsCopy(originalPreset.adjustments) : createAdjustmentsCopy(defaultAdjustments);
    updateAdjustments(targetAdj, true, true);
  };

  // -------------------------------------------------------------
  // 6. Project Lifecycle & Slide Handlers
  // -------------------------------------------------------------
  // Create Project (from LumenLabs template or blank)
  const handleCreateProject = (
    name: string,
    template?: ProjectTemplate,
    customMedia?: MediaItem,
    customAdjustments?: Adjustments,
    collageData?: CollageTemplate
  ) => {
    const collageToUse = collageData || template?.collageData || null;
    const newMedia = customMedia || collageToUse?.slots?.[0]?.media || template?.sampleMedia || SAMPLE_MEDIA_GALLERY[0];
    const newAdj = customAdjustments
      ? createAdjustmentsCopy(customAdjustments)
      : collageToUse
      ? createAdjustmentsCopy(collageToUse.adjustments)
      : template
      ? createAdjustmentsCopy(template.adjustments)
      : createAdjustmentsCopy(defaultAdjustments);

    const collagesList: CollageTemplate[] = collageToUse ? [{ ...collageToUse }] : [];

    const newProject: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || collageToUse?.name || template?.name || 'Untitled Project',
      templateId: template?.id || collageToUse?.id,
      templateTag: template?.tag || (collageToUse ? 'bento' : 'custom'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      media: newMedia,
      adjustments: newAdj,
      thumbnailUrl: collageToUse ? collageToUse.previewThumbnail : newMedia.url,
      collages: collagesList,
      activeCollageIndex: collagesList.length > 0 ? 0 : undefined,
      activeCollage: collageToUse || undefined,
    };

    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setCurrentMedia(newMedia);
    setActiveCollage(collageToUse);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    setAdjustments(newAdj);
    setHistory([
      createHistorySnapshot(
        newAdj,
        newMedia,
        collageToUse,
        null,
        null,
        newProject,
        'Create Project'
      ),
    ]);
    setHistoryIndex(0);
    setIsProjectsModalOpen(false);
    soundFx.playShutter();
  };

  // Select an existing project
  const handleSelectProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setCurrentMedia(project.media);
    const activeCol =
      project.activeCollage ||
      (project.collages && project.collages[project.activeCollageIndex || 0]) ||
      null;
    setActiveCollage(activeCol);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    const newAdj = createAdjustmentsCopy(project.adjustments);
    setAdjustments(newAdj);
    setHistory([
      createHistorySnapshot(
        newAdj,
        project.media,
        activeCol,
        null,
        null,
        project,
        'Open Project'
      ),
    ]);
    setHistoryIndex(0);
    setIsProjectsModalOpen(false);
    soundFx.playHapticTick();
  };

  // Update active collage and auto-persist to active project slide with History recording
  const handleUpdateActiveCollage = useCallback(
    (updated: CollageTemplate | null, pushToHistory = true, isDiscrete = true) => {
      setActiveCollage(updated);
      let updatedProjects = projects;
      if (currentProjectId && updated) {
        updatedProjects = projects.map((p) => {
          if (p.id !== currentProjectId) return p;
          const currentCollages =
            p.collages && p.collages.length > 0 ? [...p.collages] : [updated];
          const idx = p.activeCollageIndex ?? 0;
          if (idx >= 0 && idx < currentCollages.length) {
            currentCollages[idx] = updated;
          } else {
            currentCollages.push(updated);
          }
          return {
            ...p,
            updatedAt: Date.now(),
            activeCollage: updated,
            collages: currentCollages,
            thumbnailUrl: updated.previewThumbnail || p.thumbnailUrl,
          };
        });
        setProjects(updatedProjects);
      }

      if (pushToHistory && updated) {
        const activeProj = updatedProjects.find((p) => p.id === currentProjectId) || currentProject;
        const snapshot = createHistorySnapshot(
          adjustments,
          currentMedia,
          updated,
          selectedSlotId,
          selectedTextId,
          activeProj,
          'Update Template'
        );
        recordHistory(snapshot, { isDiscrete, actionType: 'collage' });
      }
    },
    [projects, currentProjectId, currentProject, adjustments, currentMedia, selectedSlotId, selectedTextId, recordHistory]
  );

  // Add a new collage / template slide into the currently open project
  const handleAddCollageToCurrentProject = (newCollage: CollageTemplate) => {
    if (!currentProjectId) {
      handleCreateProject(newCollage.name, undefined, undefined, undefined, newCollage);
      return;
    }

    const currentSlideCount = currentProject?.collages?.length || 1;
    const clonedCollage: CollageTemplate = {
      ...newCollage,
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${newCollage.name} #${currentSlideCount + 1}`,
      slots: newCollage.slots.map((s, idx) => ({
        ...s,
        id: `slot-${Date.now()}-${idx}`,
      })),
    };

    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProjectId) return p;
        const existing =
          p.collages && p.collages.length > 0
            ? [...p.collages]
            : p.activeCollage
            ? [p.activeCollage]
            : [];
        const updatedList = [...existing, clonedCollage];
        updatedProject = {
          ...p,
          updatedAt: Date.now(),
          collages: updatedList,
          activeCollageIndex: updatedList.length - 1,
          activeCollage: clonedCollage,
        };
        return updatedProject;
      })
    );

    setActiveCollage(clonedCollage);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    const targetAdj = clonedCollage.adjustments
      ? createAdjustmentsCopy(clonedCollage.adjustments)
      : adjustments;
    if (clonedCollage.adjustments) {
      setAdjustments(targetAdj);
    }

    const snapshot = createHistorySnapshot(
      targetAdj,
      currentMedia,
      clonedCollage,
      null,
      null,
      updatedProject,
      'Add Slide'
    );
    recordHistory(snapshot, { isDiscrete: true, actionType: 'slide' });
    soundFx.playShutter();
  };

  // Switch between slides in the current project
  const handleSelectProjectSlide = (index: number) => {
    if (!currentProject || !currentProject.collages || !currentProject.collages[index]) return;
    const targetCollage = currentProject.collages[index];
    setActiveCollage(targetCollage);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === currentProjectId) {
          updatedProject = { ...p, activeCollageIndex: index, activeCollage: targetCollage };
          return updatedProject;
        }
        return p;
      })
    );
    const targetAdj = targetCollage.adjustments
      ? createAdjustmentsCopy(targetCollage.adjustments)
      : adjustments;
    if (targetCollage.adjustments) {
      setAdjustments(targetAdj);
    }
    const snapshot = createHistorySnapshot(
      targetAdj,
      currentMedia,
      targetCollage,
      null,
      null,
      updatedProject,
      'Select Slide'
    );
    recordHistory(snapshot, { isDiscrete: true, actionType: 'slide' });
    soundFx.playHapticTick();
  };

  // Duplicate the current project slide
  const handleDuplicateProjectSlide = (index?: number) => {
    if (!currentProject) return;
    const targetIdx =
      typeof index === 'number'
        ? index
        : (currentProject.activeCollageIndex ?? 0);
    const source =
      (currentProject.collages && currentProject.collages[targetIdx]) ||
      currentProject.activeCollage ||
      activeCollage;
    if (!source) return;

    const cloned: CollageTemplate = {
      ...source,
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
      slots: source.slots.map((s, idx) => ({ ...s, id: `slot-${Date.now()}-${idx}` })),
    };

    const existing =
      currentProject.collages && currentProject.collages.length > 0
        ? [...currentProject.collages]
        : [source];
    const updatedList = [...existing, cloned];
    const newIdx = updatedList.length - 1;

    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === currentProjectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            collages: updatedList,
            activeCollageIndex: newIdx,
            activeCollage: cloned,
          };
          return updatedProject;
        }
        return p;
      })
    );

    setActiveCollage(cloned);
    setSelectedSlotId(null);
    setSelectedTextId(null);

    const snapshot = createHistorySnapshot(
      adjustments,
      currentMedia,
      cloned,
      null,
      null,
      updatedProject,
      'Duplicate Slide'
    );
    recordHistory(snapshot, { isDiscrete: true, actionType: 'slide' });
    soundFx.playShutter();
  };

  // Delete a slide from the current project
  const handleDeleteProjectSlide = (index: number) => {
    if (!currentProject || !currentProject.collages || currentProject.collages.length <= 1) return;
    const updatedList = currentProject.collages.filter((_, i) => i !== index);
    const nextIdx = Math.max(0, Math.min(index, updatedList.length - 1));
    const nextCollage = updatedList[nextIdx];

    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === currentProjectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            collages: updatedList,
            activeCollageIndex: nextIdx,
            activeCollage: nextCollage,
          };
          return updatedProject;
        }
        return p;
      })
    );

    setActiveCollage(nextCollage);
    setSelectedSlotId(null);
    setSelectedTextId(null);

    const snapshot = createHistorySnapshot(
      adjustments,
      currentMedia,
      nextCollage,
      null,
      null,
      updatedProject,
      'Delete Slide'
    );
    recordHistory(snapshot, { isDiscrete: true, actionType: 'slide' });
    soundFx.playHapticTick();
  };

  // Reorder slides in the current project (drag & drop / nudge)
  const handleReorderProjectSlides = (fromIndex: number, toIndex: number) => {
    if (!currentProjectId || !currentProject) return;
    const list =
      currentProject.collages && currentProject.collages.length > 0
        ? [...currentProject.collages]
        : currentProject.activeCollage
        ? [currentProject.activeCollage]
        : [];

    if (
      fromIndex < 0 ||
      fromIndex >= list.length ||
      toIndex < 0 ||
      toIndex >= list.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [movedItem] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, movedItem);

    // Track new active index
    const currentActiveIdx = currentProject.activeCollageIndex ?? 0;
    let newActiveIdx = currentActiveIdx;
    if (currentActiveIdx === fromIndex) {
      newActiveIdx = toIndex;
    } else if (fromIndex < currentActiveIdx && toIndex >= currentActiveIdx) {
      newActiveIdx = currentActiveIdx - 1;
    } else if (fromIndex > currentActiveIdx && toIndex <= currentActiveIdx) {
      newActiveIdx = currentActiveIdx + 1;
    }

    const activeCol = list[newActiveIdx] || currentProject.activeCollage || activeCollage;

    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === currentProjectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            collages: list,
            activeCollageIndex: newActiveIdx,
            activeCollage: activeCol,
          };
          return updatedProject;
        }
        return p;
      })
    );

    setActiveCollage(activeCol);

    const snapshot = createHistorySnapshot(
      adjustments,
      currentMedia,
      activeCol,
      selectedSlotId,
      selectedTextId,
      updatedProject,
      'Reorder Slides'
    );
    recordHistory(snapshot, { isDiscrete: true, actionType: 'slide' });
    soundFx.playHapticTick();
  };

  // Switch to a new collage template directly
  const handleSelectCollageTemplate = (template: CollageTemplate) => {
    handleUpdateActiveCollage(template, true, true);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    if (template.adjustments) {
      updateAdjustments(createAdjustmentsCopy(template.adjustments), true, true);
    }
    soundFx.playShutter();
  };

  // Trigger file upload for a specific slot in the active template
  const handleTriggerSlotUpload = (slotId: string) => {
    setActiveUploadSlotId(slotId);
    if (slotUploadInputRef.current) {
      slotUploadInputRef.current.click();
    }
  };

  // Handle uploaded file for active slot
  const handleSlotUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadSlotId || !activeCollage) return;

    soundFx.playShutter();
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
    const url = URL.createObjectURL(file);
    const newMedia: MediaItem = {
      id: `media-${Date.now()}`,
      name: file.name,
      type: isVideo ? 'video' : 'image',
      url,
      file,
      aspectRatio: isVideo ? 16 / 9 : 4 / 5,
      width: 1080,
      height: 1920,
    };

    const updatedSlots = activeCollage.slots.map((s) =>
      s.id === activeUploadSlotId ? { ...s, media: newMedia } : s
    );
    handleUpdateActiveCollage({ ...activeCollage, slots: updatedSlots }, true, true);
    setActiveUploadSlotId(null);
    if (slotUploadInputRef.current) slotUploadInputRef.current.value = '';
  };

  // Choose media from user library specifically for a collage slot
  const handleChooseFromLibraryForSlot = (slotId: string) => {
    setLibraryTargetSlotId(slotId);
    setIsMediaLibraryOpen(true);
    soundFx.playHapticTick();
  };

  // Record live video specifically for a collage slot
  const handleRecordVideoForSlot = (slotId: string) => {
    setCameraInitialMode('video');
    setCameraTargetSlotId(slotId);
    setIsCameraOpen(true);
    soundFx.playHapticTick();
  };

  // Take live photo specifically for a collage slot
  const handleTakePhotoForSlot = (slotId: string) => {
    setCameraInitialMode('photo');
    setCameraTargetSlotId(slotId);
    setIsCameraOpen(true);
    soundFx.playHapticTick();
  };

  // Batch insert multiple photos and videos into collage slots
  const handleBatchUploadMultipleMedia = () => {
    if (appBatchFileInputRef.current) {
      appBatchFileInputRef.current.click();
      soundFx.playHapticTick();
    }
  };

  // Handle batch file selection to populate multiple frames at once
  const handleAppBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundFx.playShutter();
    const fileArray: File[] = Array.from(files);

    // If no collage is currently active, pick an appropriate collage template
    let targetCollage = activeCollage;
    if (!targetCollage) {
      const match = COLLAGE_TEMPLATES.find((t) => (t.slots?.length || 0) >= fileArray.length) || COLLAGE_TEMPLATES[0];
      targetCollage = { ...match };
    }

    const batchMediaItems: MediaItem[] = [];
    const collageSlots = targetCollage.slots || [];
    const updatedSlots = collageSlots.map((slot, index) => {
      if (index < fileArray.length) {
        const file = fileArray[index];
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
        const url = URL.createObjectURL(file);
        const item: MediaItem = {
          id: `media-batch-${Date.now()}-${index}`,
          name: file.name,
          type: isVideo ? ('video' as const) : ('image' as const),
          url,
          file,
          aspectRatio: isVideo ? 16 / 9 : 4 / 5,
          width: 1080,
          height: 1920,
          createdAt: Date.now(),
          source: 'upload',
        };
        batchMediaItems.push(item);
        return {
          ...slot,
          media: item,
        };
      }
      return slot;
    });

    if (batchMediaItems.length > 0) {
      batchMediaItems.forEach((item) => handleAddUserMedia(item));
    }

    handleUpdateActiveCollage({ ...targetCollage, slots: updatedSlots }, true, true);
    if (appBatchFileInputRef.current) appBatchFileInputRef.current.value = '';
  };

  // Duplicate an existing project
  const handleDuplicateProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    const duplicated: Project = {
      ...target,
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      adjustments: createAdjustmentsCopy(target.adjustments),
    };

    setProjects((prev) => [duplicated, ...prev]);
    soundFx.playHapticTick();
  };

  // Delete a project
  const handleDeleteProject = (projectId: string) => {
    soundFx.playHapticTick();
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);

    // Delete from Firestore if authenticated
    if (user?.uid) {
      lastSavedProjectSignaturesRef.current.delete(projectId);
      deleteProjectFromFirestore(user.uid, projectId).catch((e) =>
        console.warn('Firestore delete project error:', e)
      );
    }

    // If deleting the active project, switch to the first remaining or create a new blank one
    if (currentProjectId === projectId) {
      if (remaining.length > 0) {
        handleSelectProject(remaining[0]);
      } else {
        // Fallback to default sunbath template
        const fallbackTpl = LUMENLAB_PROJECT_TEMPLATES[0];
        handleCreateProject(fallbackTpl.name, fallbackTpl);
      }
    }
  };

  // Rename a project
  const handleRenameProject = (projectId: string, newName: string) => {
    if (!newName.trim()) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, name: newName.trim(), updatedAt: Date.now() } : p
      )
    );
    soundFx.playHapticTick();
  };

  // -------------------------------------------------------------
  // 7. Presets & Recipe Handlers
  // -------------------------------------------------------------
  // Select Preset Handler
  const handleSelectPreset = (preset: Preset) => {
    if (preset.id === 'none') {
      updateAdjustments(createAdjustmentsCopy(defaultAdjustments), true, true);
    } else {
      updateAdjustments(
        {
          ...createAdjustmentsCopy(preset.adjustments),
          presetStrength: 1.0,
        },
        true,
        true
      );
    }
  };

  // Toggle Preset Favorite
  const handleToggleFavoritePreset = (presetId: string) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === presetId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  // Save Custom Preset
  const handleSaveCustomPreset = (newPreset: Preset) => {
    setPresets((prev) => [...prev, newPreset]);
    if (user?.uid) {
      savePresetToFirestore(user.uid, newPreset).catch((e) =>
        console.warn('Firestore save preset error:', e)
      );
    }
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (user?.uid) {
      deletePresetFromFirestore(user.uid, presetId).catch((e) =>
        console.warn('Firestore delete preset error:', e)
      );
    }
  };

  // Import / Export JSON Presets
  const handleExportPresetJSON = (preset: Preset) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(preset, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `lumenlab_${preset.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    soundFx.playHapticTick();
  };

  const handleImportPresetJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && parsed.adjustments) {
          const importedPreset: Preset = {
            ...parsed,
            id: `custom-import-${Date.now()}`,
            category: 'Custom',
            isCustom: true,
          };
          setPresets((prev) => [...prev, importedPreset]);
          handleSelectPreset(importedPreset);
          soundFx.playHapticTick();
        }
      } catch (err) {
        alert('Invalid preset JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Copy & Paste Recipe
  const handleCopyRecipe = () => {
    setCopiedRecipe(createAdjustmentsCopy(adjustments));
  };

  const handlePasteRecipe = () => {
    if (copiedRecipe) {
      updateAdjustments(createAdjustmentsCopy(copiedRecipe), true, true);
    }
  };

  // Direct Import Media File (from device)
  const handleImportMediaFile = (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const url = URL.createObjectURL(file);

    const finishImport = (newMedia: MediaItem) => {
      setCurrentMedia(newMedia);
      handleAddUserMedia(newMedia);
      const snapshot = createHistorySnapshot(
        adjustments,
        newMedia,
        activeCollage,
        selectedSlotId,
        selectedTextId,
        currentProject,
        'Import Media'
      );
      recordHistory(snapshot, { isDiscrete: true, actionType: 'media' });
      soundFx.playHapticTick();
    };

    if (isVideo) {
      const newMedia: MediaItem = {
        id: `user-${Date.now()}`,
        name: file.name,
        type: 'video',
        url: url,
        file: file,
        aspectRatio: 16 / 9,
        width: 1920,
        height: 1080,
        createdAt: Date.now(),
        source: 'upload',
      };
      finishImport(newMedia);
    } else {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1200;
        const h = img.naturalHeight || 1200;
        const newMedia: MediaItem = {
          id: `user-${Date.now()}`,
          name: file.name,
          type: 'image',
          url: url,
          file: file,
          aspectRatio: w / h,
          width: w,
          height: h,
          createdAt: Date.now(),
          source: 'upload',
        };
        finishImport(newMedia);
      };
      img.onerror = () => {
        const newMedia: MediaItem = {
          id: `user-${Date.now()}`,
          name: file.name,
          type: 'image',
          url: url,
          file: file,
          aspectRatio: 4 / 5,
          width: 1200,
          height: 1200,
          createdAt: Date.now(),
          source: 'upload',
        };
        finishImport(newMedia);
      };
      img.src = url;
    }
  };

  // Camera capture callback (supports both photo capture and video recording)
  const handleCameraCapture = (
    capturedUrl: string,
    capturedAdjustments?: Adjustments,
    mediaType: 'image' | 'video' = 'image',
    targetSlotId?: string | null
  ) => {
    const isVideo = mediaType === 'video';
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const capturedMedia: MediaItem = {
      id: `capture-${now}`,
      name: `${isVideo ? 'Recorded Video' : 'Camera Photo'} ${timeStr}`,
      type: mediaType,
      url: capturedUrl,
      aspectRatio: isVideo ? 16 / 9 : 4 / 5,
      width: isVideo ? 1920 : 1920,
      height: isVideo ? 1080 : 1440,
      createdAt: now,
      source: 'camera',
    };

    // Store in persistent user media library
    handleAddUserMedia(capturedMedia);

    if (targetSlotId && activeCollage) {
      // Direct insertion into specific collage frame
      const updatedSlots = activeCollage.slots.map((s) =>
        s.id === targetSlotId ? { ...s, media: capturedMedia } : s
      );
      handleUpdateActiveCollage({ ...activeCollage, slots: updatedSlots }, true, true);
      setSelectedSlotId(targetSlotId);
      soundFx.playShutter();
    } else {
      // Normal single media canvas update
      setCurrentMedia(capturedMedia);
      const targetAdj = capturedAdjustments ? createAdjustmentsCopy(capturedAdjustments) : adjustments;
      if (capturedAdjustments) {
        setAdjustments(targetAdj);
      }
      const snapshot = createHistorySnapshot(
        targetAdj,
        capturedMedia,
        activeCollage,
        selectedSlotId,
        selectedTextId,
        currentProject,
        'Camera Capture'
      );
      recordHistory(snapshot, { isDiscrete: true, actionType: 'media' });
      soundFx.playShutter();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyRecipe();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && copiedRecipe) {
        e.preventDefault();
        handlePasteRecipe();
      } else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
        // 'P' hotkey for Projects Studio
        setProjectsModalTab('my-projects');
        setIsProjectsModalOpen(true);
      } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        // 'T' hotkey for LumenLabs Templates
        setProjectsModalTab('templates');
        setIsProjectsModalOpen(true);
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        setCameraInitialMode('photo');
        setCameraTargetSlotId(null);
        setIsCameraOpen(true);
      } else if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !copiedRecipe) {
        setCameraInitialMode('video');
        setCameraTargetSlotId(null);
        setIsCameraOpen(true);
      } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        setIsMediaLibraryOpen(true);
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        setIsBottomDrawerCollapsed((prev) => !prev);
        soundFx.playHapticTick();
      } else if (e.key === '\\' || (e.key.toLowerCase() === 'b' && (e.ctrlKey || e.metaKey))) {
        // Toggle Desktop Right Sidebar / Full Canvas mode
        e.preventDefault();
        setIsDesktopSidebarCollapsed((prev) => !prev);
        soundFx.playHapticTick();
      } else if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsExportOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, copiedRecipe]);

  return (
    <main className="w-full h-full h-[100dvh] w-screen h-screen flex flex-col bg-[#FAF9F6] text-[#2A2723] overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <EditorHeader
        currentMedia={currentMedia}
        currentProject={currentProject}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        compareMode={compareMode}
        onToggleCompareSplit={() =>
          setCompareMode((prev) => (prev === 'split' ? 'none' : 'split'))
        }
        onHoldCompareStart={() => setCompareMode('hold')}
        onHoldCompareEnd={() => setCompareMode('none')}
        onCopyRecipe={handleCopyRecipe}
        onPasteRecipe={handlePasteRecipe}
        hasCopiedRecipe={copiedRecipe !== null}
        onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        onOpenCamera={() => {
          setCameraInitialMode('photo');
          setCameraTargetSlotId(null);
          setIsCameraOpen(true);
        }}
        onOpenRecordVideo={() => {
          setCameraInitialMode('video');
          setCameraTargetSlotId(null);
          setIsCameraOpen(true);
        }}
        onOpenCollages={() => setIsTemplateDrawerOpen(true)}
        onOpenPreview={() => {
          setIsSlidePreviewOpen(true);
          soundFx.playHapticTick();
        }}
        onOpenExport={handleOpenExportWithOptions}
        onImportMediaFile={handleImportMediaFile}
        onOpenProjectsModal={() => {
          setProjectsModalTab('my-projects');
          setIsProjectsModalOpen(true);
        }}
        onOpenTemplatesGallery={() => {
          setProjectsModalTab('templates');
          setIsProjectsModalOpen(true);
        }}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        totalProjectsCount={projects.length}
        onForceSave={handleForceSaveToCloud}
        onReloadFromStorage={handleReloadFromCloud}
        onOpenSignIn={() => setShowSignInModal(true)}
        onLogout={() => {
          setIsGuestMode(false);
          setShowSignInModal(true);
        }}
        isSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleSidebarCollapse={() => {
          setIsDesktopSidebarCollapsed((prev) => !prev);
          soundFx.playHapticTick();
        }}
      />

      {/* Hidden File Input for Customizing Active Template Slot */}
      <input
        ref={slotUploadInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        onChange={handleSlotUploadChange}
        className="hidden"
      />

      {/* Hidden File Input for Global Batch Media Collage Loading */}
      <input
        ref={appBatchFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        multiple
        onChange={handleAppBatchFilesChange}
        className="hidden"
      />

      {/* Center Workspace (Canvas + Desktop Sidebar) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full overflow-hidden relative">
        {/* Main Canvas Viewport Area */}
        <section className="flex-1 relative w-full h-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 bg-[#F5F2EB]">
          {/* Template & Project Mode Controls Header Bar */}
          {activeCollage && (
            <div className="absolute top-2 left-3 right-3 sm:top-3 sm:left-4 sm:right-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pointer-events-none">
              {/* Left: Project Badge & Active Template Info / Slide Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-2xl border border-[#E6E2D3] shadow-md max-w-full overflow-x-auto no-scrollbar">
                {/* Project Title Tag */}
                {currentProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectsModalTab('my-projects');
                      setIsProjectsModalOpen(true);
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] border border-[#E6E2D3] text-[11px] font-semibold transition-colors"
                    title="Open Project Studio"
                  >
                    <FolderOpen className="w-3 h-3 text-[#A69480]" />
                    <span className="max-w-[120px] truncate">{currentProject.name}</span>
                  </button>
                )}

                {/* Multi-Slide Chips with < > Arrows (if project has collages list) */}
                {currentProject?.collages && currentProject.collages.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {/* Previous Slide Arrow < */}
                    <button
                      type="button"
                      onClick={() => {
                        const total = currentProject.collages.length;
                        const currentIdx = currentProject.activeCollageIndex ?? 0;
                        const prevIdx = (currentIdx - 1 + total) % total;
                        handleSelectProjectSlide(prevIdx);
                      }}
                      className="p-1 rounded-md text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95 transition-all cursor-pointer"
                      title="Previous Slide (<)"
                      aria-label="Previous Slide"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {currentProject.collages.map((col, idx) => {
                      const isSlideActive = (currentProject.activeCollageIndex ?? 0) === idx;
                      return (
                        <button
                          key={col.id || idx}
                          type="button"
                          onClick={() => handleSelectProjectSlide(idx)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            isSlideActive
                              ? 'bg-[#2A2723] text-white shadow-xs'
                              : 'bg-[#FAF9F6] text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                          }`}
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>Slide {idx + 1}</span>
                        </button>
                      );
                    })}

                    {/* Next Slide Arrow > */}
                    <button
                      type="button"
                      onClick={() => {
                        const total = currentProject.collages.length;
                        const currentIdx = currentProject.activeCollageIndex ?? 0;
                        const nextIdx = (currentIdx + 1) % total;
                        handleSelectProjectSlide(nextIdx);
                      }}
                      className="p-1 rounded-md text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95 transition-all cursor-pointer"
                      title="Next Slide (>)"
                      aria-label="Next Slide"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Add Slide Quick Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setProjectsModalTab('templates');
                        setIsProjectsModalOpen(true);
                        soundFx.playHapticTick();
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#FAF9F6] hover:bg-[#EAE6DF] text-[#2A2723] border border-dashed border-[#A69480] text-[10px] font-semibold transition-colors cursor-pointer"
                      title="Add Template as New Slide"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span className="hidden xs:inline">Slide</span>
                    </button>

                    {/* Slide actions: Duplicate / Delete */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateProjectSlide()}
                      className="p-1 rounded-md text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
                      title="Duplicate active slide"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {currentProject.collages.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteProjectSlide(
                            currentProject.activeCollageIndex ?? 0
                          )
                        }
                        className="p-1 rounded-md text-[#7E7365] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete active slide"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-[#2A2723]" />
                    <span className="text-xs font-bold text-[#2A2723]">
                      {activeCollage.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3]">
                      {activeCollage.aspectLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!activeCollage ? (
            <ViewportCanvas
              media={currentMedia}
              adjustments={adjustments}
              compareMode={compareMode}
              activeTab={activeTab}
              onChangeAdjustments={(newAdj) => updateAdjustments(newAdj, true, false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 sm:p-5 pt-3 sm:pt-4 overflow-y-auto">
              <TemplateCanvasRenderer
                template={activeCollage}
                onChangeTemplate={handleUpdateActiveCollage}
                selectedSlotId={selectedSlotId}
                onSelectSlot={setSelectedSlotId}
                selectedTextId={selectedTextId}
                onSelectText={setSelectedTextId}
                isPlayingMaster={isPlayingMaster}
                onTogglePlayMaster={() => setIsPlayingMaster((prev) => !prev)}
                onChooseFromLibraryForSlot={handleChooseFromLibraryForSlot}
                onRecordVideoForSlot={handleRecordVideoForSlot}
                onTakePhotoForSlot={handleTakePhotoForSlot}
                onOpenTemplateSelector={() => setIsTemplateDrawerOpen(true)}
                onOpenExport={() => setIsExportOpen(true)}
                onImportFileForSlot={async (slotId, file) => {
                  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
                  const url = URL.createObjectURL(file);
                  const newMedia: MediaItem = {
                    id: `media-${Date.now()}`,
                    name: file.name,
                    type: isVideo ? 'video' : 'image',
                    url,
                    file,
                    aspectRatio: isVideo ? 16 / 9 : 4 / 5,
                    width: 1080,
                    height: 1920,
                    createdAt: Date.now(),
                    source: 'upload',
                  };
                  setUserMediaLibrary((prev) => [newMedia, ...prev]);
                  const updatedSlots = activeCollage.slots.map((s) =>
                    s.id === slotId ? { ...s, media: newMedia } : s
                  );
                  handleUpdateActiveCollage({ ...activeCollage, slots: updatedSlots });
                }}
              />
            </div>
          )}
          {/* Floating Slide Navigation Arrows on Canvas (< and >) */}
          {currentProject?.collages && currentProject.collages.length > 1 && (
            <>
              {/* Left < (Previous Slide) Navigation Arrow */}
              <button
                type="button"
                onClick={() => {
                  const total = currentProject.collages.length;
                  const currentIdx = currentProject.activeCollageIndex ?? 0;
                  const prevIdx = (currentIdx - 1 + total) % total;
                  handleSelectProjectSlide(prevIdx);
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-[#2A2723] border border-[#E6E2D3] shadow-lg backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer group"
                title="Previous Slide (<)"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#2A2723] group-hover:-translate-x-0.5 transition-transform" />
              </button>

              {/* Right > (Next Slide) Navigation Arrow */}
              <button
                type="button"
                onClick={() => {
                  const total = currentProject.collages.length;
                  const currentIdx = currentProject.activeCollageIndex ?? 0;
                  const nextIdx = (currentIdx + 1) % total;
                  handleSelectProjectSlide(nextIdx);
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-[#2A2723] border border-[#E6E2D3] shadow-lg backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer group"
                title="Next Slide (>)"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#2A2723] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}

          {/* Floating Canvas Top-Right Quick Expand Tools Pill (Desktop Only, Visible when Sidebar is Collapsed) */}
          {isDesktopSidebarCollapsed && (
            <button
              type="button"
              id="canvas-expand-tools-floating-btn"
              onClick={() => {
                setIsDesktopSidebarCollapsed(false);
                soundFx.playHapticTick();
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#2A2723] border border-[#E6E2D3] shadow-lg backdrop-blur-md text-xs font-semibold absolute top-4 right-4 z-30 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in zoom-in-95 group"
              title="Show Design Tools (\)"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-45 transition-transform" />
              <span>Design Tools</span>
              <span className="text-[10px] text-[#7E7365] font-mono bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[#E6E2D3]">\</span>
            </button>
          )}
        </section>

        {/* Desktop Pro Sidebar (Right side, wide screens) */}
        <DesktopSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          adjustments={adjustments}
          onChangeAdjustments={(newAdj) => updateAdjustments(newAdj)}
          presets={presets}
          onSelectPreset={handleSelectPreset}
          onOpenSavePresetModal={() => setIsSavePresetOpen(true)}
          onToggleFavoritePreset={handleToggleFavoritePreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          onImportPresetJSON={handleImportPresetJSON}
          onExportPresetJSON={handleExportPresetJSON}
          activeCollage={activeCollage}
          onChangeTemplate={handleUpdateActiveCollage}
          selectedSlotId={selectedSlotId}
          onSelectSlot={setSelectedSlotId}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
          onTriggerSlotUpload={handleTriggerSlotUpload}
          onChooseFromLibraryForSlot={handleChooseFromLibraryForSlot}
          onRecordVideoForSlot={handleRecordVideoForSlot}
          onTakePhotoForSlot={handleTakePhotoForSlot}
          onBatchUploadMultipleMedia={handleBatchUploadMultipleMedia}
          onOpenTemplateSelector={() => setIsTemplateDrawerOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          currentProject={currentProject}
          onSelectProjectSlide={handleSelectProjectSlide}
          onDuplicateProjectSlide={handleDuplicateProjectSlide}
          onDeleteProjectSlide={handleDeleteProjectSlide}
          onReorderProjectSlides={handleReorderProjectSlides}
          onAddNewSlide={() => {
            setProjectsModalTab('templates');
            setIsProjectsModalOpen(true);
          }}
          isCollapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile-Only Bottom Drawer (Hidden on md: breakpoint, fixed height to prevent CLS) */}
      <div className="block md:hidden flex-shrink-0">
        {activeCollage ? (
          <TemplateCustomizerBar
            template={activeCollage}
            onChangeTemplate={handleUpdateActiveCollage}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onTriggerSlotUpload={handleTriggerSlotUpload}
            onChooseFromLibraryForSlot={handleChooseFromLibraryForSlot}
            onRecordVideoForSlot={handleRecordVideoForSlot}
            onTakePhotoForSlot={handleTakePhotoForSlot}
            onBatchUploadMultipleMedia={handleBatchUploadMultipleMedia}
            presets={presets}
            onApplyPresetToTemplate={(preset) => {
              updateAdjustments(createAdjustmentsCopy(preset.adjustments), true, true);
            }}
            onOpenTemplateSelector={() => setIsTemplateDrawerOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            isCollapsed={isBottomDrawerCollapsed}
            onToggleCollapse={() => setIsBottomDrawerCollapsed((prev) => !prev)}
            project={currentProject}
            onSelectProjectSlide={handleSelectProjectSlide}
            onDuplicateProjectSlide={handleDuplicateProjectSlide}
            onDeleteProjectSlide={handleDeleteProjectSlide}
            onReorderProjectSlides={handleReorderProjectSlides}
            onAddNewSlide={() => {
              setProjectsModalTab('templates');
              setIsProjectsModalOpen(true);
            }}
          />
        ) : (
          <AdjustmentsBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            adjustments={adjustments}
            onChangeAdjustments={(newAdj) => updateAdjustments(newAdj, true, false)}
            presets={presets}
            onSelectPreset={handleSelectPreset}
            onOpenSavePresetModal={() => setIsSavePresetOpen(true)}
            onToggleFavoritePreset={handleToggleFavoritePreset}
            onDeleteCustomPreset={handleDeleteCustomPreset}
            onImportPresetJSON={handleImportPresetJSON}
            onExportPresetJSON={handleExportPresetJSON}
            isCollapsed={isBottomDrawerCollapsed}
            onToggleCollapse={() => setIsBottomDrawerCollapsed((prev) => !prev)}
          />
        )}
      </div>

      {/* Template Selector Drawer */}
      <TemplateSelectorDrawer
        isOpen={isTemplateDrawerOpen}
        onClose={() => setIsTemplateDrawerOpen(false)}
        currentTemplateId={activeCollage?.id || null}
        onSelectTemplate={handleSelectCollageTemplate}
      />

      {/* LumenLabs Project Templates & Project Management Studio Modal */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        initialTab={projectsModalTab}
        userMediaLibrary={userMediaLibrary}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onAddCollageToCurrentProject={handleAddCollageToCurrentProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onDeleteUserMedia={handleDeleteUserMedia}
        onAddUserMedia={handleAddUserMedia}
        onOpenCamera={() => {
          setCameraInitialMode('photo');
          setCameraTargetSlotId(null);
          setIsCameraOpen(true);
        }}
        onRecordVideo={() => {
          setCameraInitialMode('video');
          setCameraTargetSlotId(null);
          setIsCameraOpen(true);
        }}
      />

      {/* Live Camera Viewfinder Modal */}
      <CameraView
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraTargetSlotId(null);
        }}
        onCapture={handleCameraCapture}
        presets={presets}
        initialMode={cameraInitialMode}
        targetSlotId={cameraTargetSlotId}
      />

      {/* Media Library Import Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => {
          setIsMediaLibraryOpen(false);
          setLibraryTargetSlotId(null);
        }}
        userMediaLibrary={userMediaLibrary}
        title={libraryTargetSlotId ? 'SELECT FOR COLLAGE FRAME' : 'MEDIA LIBRARY'}
        subtitle={
          libraryTargetSlotId
            ? 'Choose recorded video or camera photo to place in selected frame'
            : 'Captures, Videos & Editorial Gallery'
        }
        onSelectMedia={(media) => {
          if (libraryTargetSlotId && activeCollage) {
            const updatedSlots = activeCollage.slots.map((s) =>
              s.id === libraryTargetSlotId ? { ...s, media } : s
            );
            handleUpdateActiveCollage({ ...activeCollage, slots: updatedSlots }, true, true);
            setSelectedSlotId(libraryTargetSlotId);
            setLibraryTargetSlotId(null);
            setIsMediaLibraryOpen(false);
          } else {
            setCurrentMedia(media);
            const snapshot = createHistorySnapshot(
              adjustments,
              media,
              activeCollage,
              selectedSlotId,
              selectedTextId,
              currentProject,
              'Select Media'
            );
            recordHistory(snapshot, { isDiscrete: true, actionType: 'media' });
            setIsMediaLibraryOpen(false);
          }
          soundFx.playHapticTick();
        }}
        onDeleteMedia={handleDeleteUserMedia}
        onAddMedia={handleAddUserMedia}
        onOpenCamera={() => {
          setCameraInitialMode('photo');
          setCameraTargetSlotId(libraryTargetSlotId);
          setIsCameraOpen(true);
        }}
        onRecordVideo={() => {
          setCameraInitialMode('video');
          setCameraTargetSlotId(libraryTargetSlotId);
          setIsCameraOpen(true);
        }}
        currentMediaId={currentMedia?.id}
      />

      {/* Save Custom Preset Modal */}
      <SavePresetModal
        isOpen={isSavePresetOpen}
        onClose={() => setIsSavePresetOpen(false)}
        adjustments={adjustments}
        onSavePreset={handleSaveCustomPreset}
      />

      {/* High-Resolution Export Modal (Supports Single Media, Templates, and Multi-Slide Projects) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        media={currentMedia}
        adjustments={adjustments}
        template={activeCollage}
        project={currentProject}
        initialExportScope={exportInitialScope}
        initialSingleFileType={exportInitialSingleFileType}
      />

      {/* Fullscreen Project Slideshow & Carousel Preview Modal */}
      <SlidePresentationPreviewModal
        isOpen={isSlidePreviewOpen}
        onClose={() => setIsSlidePreviewOpen(false)}
        project={currentProject}
        activeCollage={activeCollage}
        adjustments={adjustments}
        onSelectSlide={handleSelectProjectSlide}
        onOpenExportModal={() => {
          setIsSlidePreviewOpen(false);
          setIsExportOpen(true);
        }}
      />

      {/* Sign-In Page Gateway / Login Screen: Displayed when not logged in unless guest mode is active */}
      {!user && (!isGuestMode || showSignInModal) && (
        <SignInGatePage
          onContinueAsGuest={() => {
            setIsGuestMode(true);
            setShowSignInModal(false);
          }}
          onClose={isGuestMode ? () => setShowSignInModal(false) : undefined}
        />
      )}
    </main>
  );
}

