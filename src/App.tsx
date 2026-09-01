/**
 * LumenLab - WebGL Photo & Video Filter Editor with LumenLabs Project Templates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, Adjustments, MediaItem, Preset, Project, ProjectTemplate, CollageTemplate } from './types';
import { BUILT_IN_PRESETS, SAMPLE_MEDIA_GALLERY } from './constants/presets';
import { LUMENLAB_PROJECT_TEMPLATES } from './constants/projectTemplates';
import { COLLAGE_TEMPLATES } from './constants/collageTemplates';
import { defaultAdjustments, createAdjustmentsCopy } from './constants/defaultAdjustments';
import { EditorHeader } from './components/EditorHeader';
import { ViewportCanvas } from './components/ViewportCanvas';
import { AdjustmentsBar } from './components/AdjustmentsBar';
import { CameraView } from './components/CameraView';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { SavePresetModal } from './components/SavePresetModal';
import { ExportModal } from './components/ExportModal';
import { ProjectsModal } from './components/ProjectsModal';
import { TemplateCanvasRenderer } from './components/template/TemplateCanvasRenderer';
import { TemplateCustomizerBar } from './components/template/TemplateCustomizerBar';
import { TemplateSelectorDrawer } from './components/template/TemplateSelectorDrawer';
import { soundFx } from './utils/audio';
import { Sparkles, Grid, Eye, RefreshCw, LayoutTemplate, Sliders, ChevronUp } from 'lucide-react';

const STORAGE_KEY_CUSTOM_PRESETS = 'lumenlab_custom_presets_v1';
const STORAGE_KEY_FAVORITES = 'lumenlab_favorite_presets_v1';
const STORAGE_KEY_PROJECTS = 'lumenlab_user_projects_v2';
const STORAGE_KEY_CURRENT_PROJECT_ID = 'lumenlab_current_project_id_v2';
const STORAGE_KEY_USER_MEDIA = 'lumenlab_user_media_library_v2';

// Seed initial default projects from LumenLabs templates if storage is empty
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
  {
    id: 'proj-default-clean',
    name: 'Clean Minimalist Journal',
    templateId: 'tpl-clean-crisp',
    templateTag: 'clean',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 1,
    media: LUMENLAB_PROJECT_TEMPLATES[0].sampleMedia,
    adjustments: createAdjustmentsCopy(LUMENLAB_PROJECT_TEMPLATES[0].adjustments),
    thumbnailUrl: LUMENLAB_PROJECT_TEMPLATES[0].sampleMedia.url,
  },
  {
    id: 'proj-default-editorial',
    name: 'Vogue Sepia Editorial',
    templateId: 'tpl-editorial-vogue',
    templateTag: 'editorial',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 3,
    media: LUMENLAB_PROJECT_TEMPLATES[6].sampleMedia,
    adjustments: createAdjustmentsCopy(LUMENLAB_PROJECT_TEMPLATES[6].adjustments),
    thumbnailUrl: LUMENLAB_PROJECT_TEMPLATES[6].sampleMedia.url,
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
          return parsed;
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
  // 2. Active Media & Adjustments State
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

  // History Stack for Undo / Redo
  const [history, setHistory] = useState<Adjustments[]>([createAdjustmentsCopy(adjustments)]);
  const [historyIndex, setHistoryIndex] = useState(0);

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
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [projectsModalTab, setProjectsModalTab] = useState<'my-projects' | 'templates'>('my-projects');

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

  // Current active project object
  const currentProject = projects.find((p) => p.id === currentProjectId) || null;

  // -------------------------------------------------------------
  // 3. Collage & Template Customizer State
  // -------------------------------------------------------------
  const [activeCollage, setActiveCollage] = useState<CollageTemplate | null>(() => {
    return activeInitialProject?.activeCollage || null;
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [isPlayingMaster, setIsPlayingMaster] = useState(true);
  const [isBottomDrawerCollapsed, setIsBottomDrawerCollapsed] = useState(false);
  const slotUploadInputRef = useRef<HTMLInputElement>(null);
  const appBatchFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlotId, setActiveUploadSlotId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 4. Auto-save & LocalStorage Sync
  // -------------------------------------------------------------
  // Save user media library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_MEDIA, JSON.stringify(userMediaLibrary));
    } catch {
      // Storage quota or disabled
    }
  }, [userMediaLibrary]);

  // Save projects and active project id to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      if (currentProjectId) {
        localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT_ID, currentProjectId);
      }
    } catch {
      // Storage quota or disabled
    }
  }, [projects, currentProjectId]);

  // Sync active project state whenever currentMedia, adjustments, or activeCollage change
  useEffect(() => {
    if (!currentProjectId || !currentMedia) return;

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === currentProjectId) {
          return {
            ...proj,
            updatedAt: Date.now(),
            media: currentMedia,
            adjustments: createAdjustmentsCopy(adjustments),
            thumbnailUrl: activeCollage ? activeCollage.previewThumbnail : currentMedia.url,
            activeCollage: activeCollage || undefined,
          };
        }
        return proj;
      })
    );
  }, [adjustments, currentMedia, currentProjectId, activeCollage]);

  // Sync favorites & custom presets to localStorage
  useEffect(() => {
    try {
      const customPresets = presets.filter((p) => p.isCustom);
      const favIds = presets.filter((p) => p.isFavorite).map((p) => p.id);
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(customPresets));
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favIds));
    } catch {
      // Storage unavailable
    }
  }, [presets]);

  // -------------------------------------------------------------
  // 4. Adjustments & History Handlers
  // -------------------------------------------------------------
  // Push adjustment changes to History stack with debounce
  const updateAdjustments = useCallback(
    (newAdj: Adjustments, pushToHistory = true) => {
      setAdjustments(newAdj);

      if (pushToHistory) {
        setHistory((prev) => {
          const truncated = prev.slice(0, historyIndex + 1);
          return [...truncated, createAdjustmentsCopy(newAdj)];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex]
  );

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setAdjustments(createAdjustmentsCopy(history[targetIndex]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setAdjustments(createAdjustmentsCopy(history[targetIndex]));
    }
  };

  // Reset to original
  const handleReset = () => {
    soundFx.playHapticTick();
    const originalPreset = BUILT_IN_PRESETS.find((p) => p.id === 'none');
    if (originalPreset) {
      updateAdjustments(createAdjustmentsCopy(originalPreset.adjustments));
    } else {
      updateAdjustments(createAdjustmentsCopy(defaultAdjustments));
    }
  };

  // -------------------------------------------------------------
  // 5. Project Lifecycle Handlers
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
    const newMedia = customMedia || collageToUse?.slots[0]?.media || template?.sampleMedia || SAMPLE_MEDIA_GALLERY[0];
    const newAdj = customAdjustments
      ? createAdjustmentsCopy(customAdjustments)
      : collageToUse
      ? createAdjustmentsCopy(collageToUse.adjustments)
      : template
      ? createAdjustmentsCopy(template.adjustments)
      : createAdjustmentsCopy(defaultAdjustments);

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
      activeCollage: collageToUse || undefined,
    };

    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setCurrentMedia(newMedia);
    setActiveCollage(collageToUse);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    setAdjustments(newAdj);
    setHistory([createAdjustmentsCopy(newAdj)]);
    setHistoryIndex(0);
    setIsProjectsModalOpen(false);
    soundFx.playShutter();
  };

  // Select an existing project
  const handleSelectProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setCurrentMedia(project.media);
    setActiveCollage(project.activeCollage || null);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    const newAdj = createAdjustmentsCopy(project.adjustments);
    setAdjustments(newAdj);
    setHistory([createAdjustmentsCopy(newAdj)]);
    setHistoryIndex(0);
    setIsProjectsModalOpen(false);
    soundFx.playHapticTick();
  };

  // Switch to a new collage template directly
  const handleSelectCollageTemplate = (template: CollageTemplate) => {
    setActiveCollage(template);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    if (template.adjustments) {
      updateAdjustments(createAdjustmentsCopy(template.adjustments));
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
    setActiveCollage({ ...activeCollage, slots: updatedSlots });
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
      const match = COLLAGE_TEMPLATES.find((t) => t.slots.length >= fileArray.length) || COLLAGE_TEMPLATES[0];
      targetCollage = { ...match };
    }

    const batchMediaItems: MediaItem[] = [];
    const updatedSlots = targetCollage.slots.map((slot, index) => {
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
      setUserMediaLibrary((prev) => [...batchMediaItems, ...prev]);
    }

    setActiveCollage({ ...targetCollage, slots: updatedSlots });
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
  // 6. Presets & Recipe Handlers
  // -------------------------------------------------------------
  // Select Preset Handler
  const handleSelectPreset = (preset: Preset) => {
    if (preset.id === 'none') {
      updateAdjustments(createAdjustmentsCopy(defaultAdjustments));
    } else {
      updateAdjustments({
        ...createAdjustmentsCopy(preset.adjustments),
        presetStrength: 1.0,
      });
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
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
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
      updateAdjustments(createAdjustmentsCopy(copiedRecipe));
    }
  };

  // Direct Import Media File (from device)
  const handleImportMediaFile = (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const url = URL.createObjectURL(file);

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
      setCurrentMedia(newMedia);
      setUserMediaLibrary((prev) => [newMedia, ...prev]);
      soundFx.playHapticTick();
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
        setCurrentMedia(newMedia);
        setUserMediaLibrary((prev) => [newMedia, ...prev]);
        soundFx.playHapticTick();
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
        setCurrentMedia(newMedia);
        setUserMediaLibrary((prev) => [newMedia, ...prev]);
        soundFx.playHapticTick();
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
    setUserMediaLibrary((prev) => [capturedMedia, ...prev]);

    if (targetSlotId && activeCollage) {
      // Direct insertion into specific collage frame
      const updatedSlots = activeCollage.slots.map((s) =>
        s.id === targetSlotId ? { ...s, media: capturedMedia } : s
      );
      setActiveCollage({ ...activeCollage, slots: updatedSlots });
      setSelectedSlotId(targetSlotId);
      soundFx.playShutter();
    } else {
      // Normal single media canvas update
      setCurrentMedia(capturedMedia);
      if (capturedAdjustments) {
        updateAdjustments(createAdjustmentsCopy(capturedAdjustments));
      }
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
      } else if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsExportOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, copiedRecipe]);

  return (
    <main className="w-screen h-screen flex flex-col bg-[#FAF9F6] text-[#2A2723] overflow-hidden select-none font-sans">
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
        onOpenExport={() => setIsExportOpen(true)}
        onImportMediaFile={handleImportMediaFile}
        onOpenProjectsModal={() => {
          setProjectsModalTab('my-projects');
          setIsProjectsModalOpen(true);
        }}
        onOpenTemplatesGallery={() => {
          setProjectsModalTab('templates');
          setIsProjectsModalOpen(true);
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

      {/* Main Canvas Viewport Area */}
      <section className="flex-1 relative w-full h-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 bg-[#F5F2EB]">
        {/* Template Mode Controls Header Bar */}
        {activeCollage && (
          <div className="absolute top-2 left-3 right-3 sm:top-3 sm:left-4 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E6E2D3] shadow-sm">
              <LayoutTemplate className="w-3.5 h-3.5 text-[#2A2723]" />
              <span className="text-xs font-bold text-[#2A2723]">
                {activeCollage.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3]">
                {activeCollage.aspectLabel}
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-900 text-white">
                {activeCollage.slots.length} Frames
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setIsTemplateDrawerOpen(true);
                  soundFx.playHapticTick();
                }}
                className="px-3 py-1.5 rounded-full bg-[#2A2723] text-white text-xs font-semibold shadow-sm hover:bg-black flex items-center gap-1.5 transition-all"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCollage(null);
                  soundFx.playHapticTick();
                }}
                className="px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3] text-xs font-medium shadow-xs transition-colors"
                title="Edit Single Photo/Video"
              >
                Single Media
              </button>
            </div>
          </div>
        )}

        {!activeCollage ? (
          <ViewportCanvas
            media={currentMedia}
            adjustments={adjustments}
            compareMode={compareMode}
            activeTab={activeTab}
            onChangeAdjustments={(newAdj) => updateAdjustments(newAdj, false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 pt-10 sm:pt-12 overflow-y-auto">
            <TemplateCanvasRenderer
              template={activeCollage}
              onChangeTemplate={(updated) => setActiveCollage(updated)}
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
                setActiveCollage({ ...activeCollage, slots: updatedSlots });
              }}
            />
          </div>
        )}
      </section>

      {/* Bottom Toolbars & Presets Shelf (Collapsible Drawer) */}
      {activeCollage ? (
        <TemplateCustomizerBar
          template={activeCollage}
          onChangeTemplate={(updated) => setActiveCollage(updated)}
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
            updateAdjustments(createAdjustmentsCopy(preset.adjustments));
          }}
          onOpenTemplateSelector={() => setIsTemplateDrawerOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          isCollapsed={isBottomDrawerCollapsed}
          onToggleCollapse={() => setIsBottomDrawerCollapsed((prev) => !prev)}
        />
      ) : (
        <AdjustmentsBar
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
          isCollapsed={isBottomDrawerCollapsed}
          onToggleCollapse={() => setIsBottomDrawerCollapsed((prev) => !prev)}
        />
      )}

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
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onDeleteUserMedia={(mediaId) => {
          setUserMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
        }}
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
            setActiveCollage({ ...activeCollage, slots: updatedSlots });
            setSelectedSlotId(libraryTargetSlotId);
            setLibraryTargetSlotId(null);
            setIsMediaLibraryOpen(false);
          } else {
            setCurrentMedia(media);
            setIsMediaLibraryOpen(false);
          }
          soundFx.playHapticTick();
        }}
        onDeleteMedia={(mediaId) => {
          setUserMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
        }}
        onAddMedia={(newMedia) => {
          setUserMediaLibrary((prev) => [newMedia, ...prev]);
        }}
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

      {/* High-Resolution Export Modal (Supports both Single Media and Collage Templates) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        media={currentMedia}
        adjustments={adjustments}
        template={activeCollage}
      />
    </main>
  );
}

