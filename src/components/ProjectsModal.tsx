import React, { useState, useRef, useEffect } from 'react';
import {
  X, Plus, Sparkles, FolderOpen, Trash2, Copy, Edit2, Check,
  Search, ArrowRight, Upload, Film, Camera, Video,
  Layers, Heart, Sun, Eye, Zap, Compass, PenTool, Flame,
  Smartphone, BookOpen, Paperclip, Grid, LayoutGrid, LayoutTemplate,
  Sliders, Image as ImageIcon, CheckCircle2, HardDrive, CheckSquare,
  Square, Wand2, Filter, Clock, ArrowUpRight, Shuffle, Cloud, LogIn, LogOut, User as UserIcon, Globe,
  MessageSquarePlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  Project, ProjectTemplate, ProjectTemplateTag, MediaItem, Adjustments,
  CollageTemplate, TemplateSlot, TemplateTextElement
} from '../types';
import { PROJECT_TEMPLATE_TAGS, LUMENLAB_PROJECT_TEMPLATES } from '../constants/projectTemplates';
import { COLLAGE_TEMPLATES } from '../constants/collageTemplates';
import { soundFx } from '../utils/audio';
import { defaultAdjustments, createAdjustmentsCopy } from '../constants/defaultAdjustments';
import { safeClone } from '../utils/safeClone';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string | null;
  initialTab?: 'my-projects' | 'templates' | 'library';
  userMediaLibrary?: MediaItem[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (
    name: string,
    template?: ProjectTemplate,
    customMedia?: MediaItem,
    customAdjustments?: Adjustments,
    collageData?: CollageTemplate
  ) => void;
  onAddCollageToCurrentProject?: (collageData: CollageTemplate) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteUserMedia?: (mediaId: string) => void;
  onAddUserMedia?: (media: MediaItem) => void;
  onImportFileToProject?: (file: File) => Promise<MediaItem | null>;
  onOpenCamera?: () => void;
  onRecordVideo?: () => void;
  onOpenMarketplace?: () => void;
  onOpenFeedback?: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects = [],
  currentProjectId,
  initialTab,
  userMediaLibrary = [],
  onSelectProject,
  onCreateProject,
  onAddCollageToCurrentProject,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onDeleteUserMedia,
  onAddUserMedia,
  onOpenCamera,
  onRecordVideo,
  onOpenMarketplace,
  onOpenFeedback,
}) => {
  const { user, signInWithGoogle, logout } = useAuth();

  // Modal active tab: 'my-projects' | 'templates' | 'library'
  const [activeTab, setActiveTab] = useState<'my-projects' | 'templates' | 'library'>(
    initialTab || (projects.length === 0 ? 'templates' : 'my-projects')
  );

  // Sync activeTab when modal is reopened or initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Scope filter inside templates: 'all' | 'collages' | 'film'
  const [templateScope, setTemplateScope] = useState<'all' | 'collages' | 'film'>('all');

  // Tag filter & search states in Templates
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [slotCountFilter, setSlotCountFilter] = useState<'all' | '2' | '3' | '4' | '6' | '9'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected template for detail / custom creation step
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [newProjectName, setNewProjectName] = useState<string>('');
  
  // Single Media template state
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Collage template custom state (for multi-slot configuration before project creation)
  const [customCollage, setCustomCollage] = useState<CollageTemplate | null>(null);
  const [activeSlotUploadId, setActiveSlotUploadId] = useState<string | null>(null);
  const [slotPickerDrawerSlotId, setSlotPickerDrawerSlotId] = useState<string | null>(null);

  // Blank project creation modal step
  const [isBlankProjectMode, setIsBlankProjectMode] = useState<boolean>(false);
  const [blankProjectType, setBlankProjectType] = useState<'single' | 'split-2' | 'strip-3' | 'bento-4' | 'grid-9'>('single');
  const [blankProjectName, setBlankProjectName] = useState<string>('Untitled Project');
  const [blankProjectMedia, setBlankProjectMedia] = useState<MediaItem | null>(null);
  const [blankProjectSelectedMediaIds, setBlankProjectSelectedMediaIds] = useState<string[]>([]);

  // Inline rename state in My Projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  // Library tab filter & multi-select states
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'image' | 'video'>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [activeLibraryPreviewMedia, setActiveLibraryPreviewMedia] = useState<MediaItem | null>(null);
  const [isCreatingCollageFromLibrary, setIsCreatingCollageFromLibrary] = useState<boolean>(false);
  const [selectedLibraryCollageFormat, setSelectedLibraryCollageFormat] = useState<string>('auto');

  // Quick media selector for applying templates to user photo
  const [activeTemplateUserMedia, setActiveTemplateUserMedia] = useState<MediaItem | null>(null);

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const libraryBatchUploadRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter templates
  const filteredTemplates = LUMENLAB_PROJECT_TEMPLATES.filter((tpl) => {
    const isCollage = Boolean(tpl.collageData);

    // Filter by scope
    if (templateScope === 'collages' && !isCollage) return false;
    if (templateScope === 'film' && isCollage) return false;

    // Filter by tag
    if (selectedTag !== 'all' && tpl.tag !== selectedTag) return false;

    // Filter by slot count if collage
    if (slotCountFilter !== 'all' && isCollage && tpl.collageData) {
      if ((tpl.collageData.slots?.length || 0).toString() !== slotCountFilter) return false;
    }

    // Filter by search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      tpl.name.toLowerCase().includes(q) ||
      tpl.subtitle.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.tagLabel.toLowerCase().includes(q) ||
      tpl.moodKeywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const collageCount = LUMENLAB_PROJECT_TEMPLATES.filter((t) => Boolean(t.collageData)).length;
  const filmCount = LUMENLAB_PROJECT_TEMPLATES.filter((t) => !t.collageData).length;

  // Filter library media
  const filteredUserMedia = userMediaLibrary.filter((m) => {
    if (libraryFilter !== 'all' && m.type !== libraryFilter) return false;
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase().trim();
      return m.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Handle open template preview drawer
  const handleOpenTemplatePreview = (tpl: ProjectTemplate) => {
    soundFx.playHapticTick();
    setSelectedTemplate(tpl);
    setNewProjectName(`${tpl.name} Project`);
    setUploadedMedia(activeTemplateUserMedia || null);

    if (tpl.collageData) {
      // Clone collage data for custom editing
      const clonedCollage: CollageTemplate = safeClone(tpl.collageData);
      if (activeTemplateUserMedia && clonedCollage.slots && clonedCollage.slots[0]) {
        clonedCollage.slots[0].media = activeTemplateUserMedia;
      }
      setCustomCollage(clonedCollage);
    } else {
      setCustomCollage(null);
    }
  };

  // Handle create project from template
  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    soundFx.playShutter();

    const nameToUse = newProjectName.trim() || selectedTemplate.name;

    if (customCollage) {
      // Multi-slot collage project creation
      const primaryMedia = customCollage.slots?.[0]?.media || selectedTemplate.sampleMedia;
      const adjustmentsToUse = createAdjustmentsCopy(customCollage.adjustments || selectedTemplate.adjustments);
      onCreateProject(nameToUse, selectedTemplate, primaryMedia, adjustmentsToUse, customCollage);
    } else {
      // Single-media project creation
      const mediaToUse = uploadedMedia || selectedTemplate.sampleMedia;
      const adjustmentsToUse = createAdjustmentsCopy(selectedTemplate.adjustments);
      onCreateProject(nameToUse, selectedTemplate, mediaToUse, adjustmentsToUse);
    }

    setSelectedTemplate(null);
    setCustomCollage(null);
    onClose();
  };

  // Start direct single-media project from any user library image
  const handleStartProjectFromLibraryMedia = (media: MediaItem) => {
    soundFx.playShutter();
    onCreateProject(
      `${media.name} Project`,
      undefined,
      media,
      createAdjustmentsCopy(defaultAdjustments)
    );
    onClose();
  };

  // Apply template to library media item
  const handleApplyTemplateToLibraryMedia = (media: MediaItem, tpl: ProjectTemplate) => {
    soundFx.playShutter();
    if (tpl.collageData) {
      const clonedCollage: CollageTemplate = safeClone(tpl.collageData);
      if (clonedCollage.slots && clonedCollage.slots[0]) {
        clonedCollage.slots[0].media = media;
      }
      onCreateProject(
        `${media.name} • ${tpl.name}`,
        tpl,
        media,
        createAdjustmentsCopy(clonedCollage.adjustments || tpl.adjustments),
        clonedCollage
      );
    } else {
      onCreateProject(
        `${media.name} • ${tpl.name}`,
        tpl,
        media,
        createAdjustmentsCopy(tpl.adjustments)
      );
    }
    onClose();
  };

  // Create collage from multi-selected library images
  const handleCreateCollageFromSelectedLibraryItems = () => {
    const selectedItems = userMediaLibrary.filter((m) => selectedLibraryIds.includes(m.id));
    if (selectedItems.length === 0) return;
    soundFx.playShutter();

    const count = selectedItems.length;
    let baseCollage: CollageTemplate;

    if (count === 2) {
      baseCollage = COLLAGE_TEMPLATES.find((t) => t.slots.length === 2) || COLLAGE_TEMPLATES[0];
    } else if (count === 3) {
      baseCollage = COLLAGE_TEMPLATES.find((t) => t.slots.length === 3) || COLLAGE_TEMPLATES[0];
    } else if (count === 4) {
      baseCollage = COLLAGE_TEMPLATES.find((t) => t.slots.length === 4) || COLLAGE_TEMPLATES[0];
    } else if (count >= 5 && count <= 6) {
      baseCollage = COLLAGE_TEMPLATES.find((t) => t.slots.length === 6) || COLLAGE_TEMPLATES[0];
    } else {
      baseCollage = COLLAGE_TEMPLATES.find((t) => t.slots.length === 9) || COLLAGE_TEMPLATES[0];
    }

    const clonedCollage: CollageTemplate = safeClone(baseCollage);
    // Assign selected items into slots in order
    clonedCollage.slots = clonedCollage.slots.map((slot, index) => {
      const assignedMedia = selectedItems[index % selectedItems.length];
      return {
        ...slot,
        media: assignedMedia || slot.media,
      };
    });

    onCreateProject(
      `Library Collage (${selectedItems.length} Captures)`,
      undefined,
      selectedItems[0],
      createAdjustmentsCopy(clonedCollage.adjustments),
      clonedCollage
    );
    setSelectedLibraryIds([]);
    setIsCreatingCollageFromLibrary(false);
    onClose();
  };

  // Auto-fill all collage slots from library in template preview drawer
  const handleAutoFillCollageFromLibrary = () => {
    if (!customCollage || userMediaLibrary.length === 0) return;
    soundFx.playShutter();

    const updatedSlots = customCollage.slots.map((slot, index) => {
      const libraryMedia = userMediaLibrary[index % userMediaLibrary.length];
      return {
        ...slot,
        media: libraryMedia || slot.media,
      };
    });

    setCustomCollage({ ...customCollage, slots: updatedSlots });
  };

  // Handle create blank project
  const handleCreateBlankProject = () => {
    soundFx.playShutter();
    const nameToUse = blankProjectName.trim() || 'Untitled Project';

    if (blankProjectType === 'single') {
      onCreateProject(
        nameToUse,
        undefined,
        blankProjectMedia || undefined,
        createAdjustmentsCopy(defaultAdjustments)
      );
    } else {
      // Pick matching blank collage format
      let baseTemplate: CollageTemplate;
      if (blankProjectType === 'split-2') {
        baseTemplate = COLLAGE_TEMPLATES.find((t) => t.slots.length === 2) || COLLAGE_TEMPLATES[0];
      } else if (blankProjectType === 'strip-3') {
        baseTemplate = COLLAGE_TEMPLATES.find((t) => t.slots.length === 3) || COLLAGE_TEMPLATES[0];
      } else if (blankProjectType === 'bento-4') {
        baseTemplate = COLLAGE_TEMPLATES.find((t) => t.slots.length === 4) || COLLAGE_TEMPLATES[0];
      } else {
        baseTemplate = COLLAGE_TEMPLATES.find((t) => t.slots.length === 9) || COLLAGE_TEMPLATES[0];
      }

      const clonedCollage: CollageTemplate = safeClone(baseTemplate);
      
      // If user selected multiple library items in blank creator, fill them in
      if (blankProjectSelectedMediaIds.length > 0) {
        const pickedMedias = userMediaLibrary.filter((m) => blankProjectSelectedMediaIds.includes(m.id));
        clonedCollage.slots = clonedCollage.slots.map((slot, idx) => {
          const picked = pickedMedias[idx % pickedMedias.length];
          return picked ? { ...slot, media: picked } : slot;
        });
      } else if (blankProjectMedia && clonedCollage.slots && clonedCollage.slots[0]) {
        clonedCollage.slots[0].media = blankProjectMedia;
      }

      onCreateProject(
        nameToUse,
        undefined,
        blankProjectMedia || clonedCollage.slots?.[0]?.media,
        createAdjustmentsCopy(clonedCollage.adjustments),
        clonedCollage
      );
    }

    setIsBlankProjectMode(false);
    setBlankProjectMedia(null);
    setBlankProjectSelectedMediaIds([]);
    onClose();
  };

  // Batch or single file upload directly into Library
  const handleBatchLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundFx.playShutter();
    setIsUploading(true);

    try {
      const fileList: File[] = Array.from(files);
      for (const [index, file] of fileList.entries()) {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
        const url = URL.createObjectURL(file);

        if (isVideo) {
          const video = document.createElement('video');
          video.src = url;
          await new Promise((res) => {
            video.onloadedmetadata = res;
            video.onerror = res;
          });
          const newMedia: MediaItem = {
            id: `media-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'video',
            url,
            file,
            aspectRatio: (video.videoWidth || 1920) / (video.videoHeight || 1080),
            width: video.videoWidth || 1920,
            height: video.videoHeight || 1080,
            duration: video.duration || 10,
            createdAt: Date.now(),
            source: 'upload',
          };
          onAddUserMedia?.(newMedia);
        } else {
          const img = new Image();
          img.src = url;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          const newMedia: MediaItem = {
            id: `media-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
            url,
            file,
            aspectRatio: (img.naturalWidth || 1200) / (img.naturalHeight || 1500),
            width: img.naturalWidth || 1200,
            height: img.naturalHeight || 1500,
            createdAt: Date.now(),
            source: 'upload',
          };
          onAddUserMedia?.(newMedia);
        }
      }
    } catch (err) {
      console.error('Batch library upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // File upload for single media template
  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const url = URL.createObjectURL(file);

      let mediaItem: MediaItem;
      if (isVideo) {
        const video = document.createElement('video');
        video.src = url;
        await new Promise((res) => {
          video.onloadedmetadata = res;
          video.onerror = res;
        });
        mediaItem = {
          id: `media-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'video',
          url,
          file,
          aspectRatio: (video.videoWidth || 1920) / (video.videoHeight || 1080),
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          duration: video.duration || 10,
          createdAt: Date.now(),
          source: 'upload',
        };
      } else {
        const img = new Image();
        img.src = url;
        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
        mediaItem = {
          id: `media-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          url,
          file,
          aspectRatio: (img.naturalWidth || 1200) / (img.naturalHeight || 1500),
          width: img.naturalWidth || 1200,
          height: img.naturalHeight || 1500,
          createdAt: Date.now(),
          source: 'upload',
        };
      }
      setUploadedMedia(mediaItem);
      onAddUserMedia?.(mediaItem);
      soundFx.playHapticTick();
    } catch (err) {
      console.error('File import failed:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // File upload for a specific slot in custom collage
  const handleSlotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlotUploadId || !customCollage) return;

    try {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const url = URL.createObjectURL(file);

      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'image',
        url,
        file,
        aspectRatio: isVideo ? 16 / 9 : 4 / 5,
        width: 1080,
        height: 1920,
        createdAt: Date.now(),
        source: 'upload',
      };

      onAddUserMedia?.(newMedia);

      const updatedSlots = customCollage.slots.map((s) =>
        s.id === activeSlotUploadId ? { ...s, media: newMedia } : s
      );

      setCustomCollage({ ...customCollage, slots: updatedSlots });
      soundFx.playHapticTick();
    } catch (err) {
      console.error('Slot upload failed:', err);
    } finally {
      setActiveSlotUploadId(null);
      e.target.value = '';
    }
  };

  // Assign user library item to slot in custom collage
  const handleAssignLibraryMediaToSlot = (slotId: string, media: MediaItem) => {
    if (!customCollage) return;
    const updatedSlots = customCollage.slots.map((s) =>
      s.id === slotId ? { ...s, media } : s
    );
    setCustomCollage({ ...customCollage, slots: updatedSlots });
    setSlotPickerDrawerSlotId(null);
    soundFx.playHapticTick();
  };

  // Toggle selection for library batch actions
  const handleToggleLibraryItemSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundFx.playHapticTick();
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all or clear library selection
  const handleToggleSelectAllLibrary = () => {
    soundFx.playHapticTick();
    if (selectedLibraryIds.length === filteredUserMedia.length) {
      setSelectedLibraryIds([]);
    } else {
      setSelectedLibraryIds(filteredUserMedia.map((m) => m.id));
    }
  };

  // Save inline rename in My Projects
  const handleSaveRename = (projectId: string) => {
    if (editingProjectName.trim()) {
      onRenameProject(projectId, editingProjectName.trim());
    }
    setEditingProjectId(null);
    soundFx.playHapticTick();
  };

  const getTagIcon = (tagId: string) => {
    switch (tagId) {
      case 'airdrop': return <Smartphone className="w-3.5 h-3.5" />;
      case 'notebook': return <BookOpen className="w-3.5 h-3.5" />;
      case 'scrapbook': return <Paperclip className="w-3.5 h-3.5" />;
      case 'polaroid': return <Film className="w-3.5 h-3.5" />;
      case 'bento': return <Grid className="w-3.5 h-3.5" />;
      case 'handwritten': return <PenTool className="w-3.5 h-3.5" />;
      case 'clean': return <Sparkles className="w-3.5 h-3.5" />;
      case 'souveniers': return <Compass className="w-3.5 h-3.5" />;
      case 'sunbath': return <Sun className="w-3.5 h-3.5" />;
      case 'love letters': return <Heart className="w-3.5 h-3.5" />;
      case 'film classic': return <Film className="w-3.5 h-3.5" />;
      case 'film white': return <Layers className="w-3.5 h-3.5" />;
      case 'editorial': return <Eye className="w-3.5 h-3.5" />;
      case 'sketch': return <PenTool className="w-3.5 h-3.5" />;
      case 'cyber': return <Zap className="w-3.5 h-3.5" />;
      case 'pride': return <Flame className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-[#FAF9F6] w-full max-w-5xl h-[92vh] max-h-[880px] rounded-2xl shadow-2xl border border-[#E6E2D3] flex flex-col overflow-hidden">
        
        {/* Hidden File Inputs */}
        <input
          ref={singleFileInputRef}
          type="file"
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
          onChange={handleSingleFileUpload}
          className="hidden"
        />

        <input
          ref={slotFileInputRef}
          type="file"
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
          onChange={handleSlotFileUpload}
          className="hidden"
        />

        <input
          ref={libraryBatchUploadRef}
          type="file"
          multiple
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
          onChange={handleBatchLibraryUpload}
          className="hidden"
        />

        {/* 1. MODAL HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#E6E2D3] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2A2723] text-white flex items-center justify-center shadow-xs">
              <FolderOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-[#2A2723]">
                  PROJECTS STUDIO
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  LumenLabs Studio
                </span>
              </div>
              <p className="text-[11px] text-[#7E7365] hidden sm:block">
                Start projects with your own library images & videos, single-media film recipes, or multi-frame collages
              </p>
            </div>
          </div>

          {/* Right Actions: Close */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] mr-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-4 h-4 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[9px] flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate text-[11px] font-semibold">
                  {user.displayName ? user.displayName.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Creator')}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Cloud Synced" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => {
                soundFx.playHapticTick();
                onClose();
              }}
              className="p-2 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. TAB CONTROLS & TOP ACTIONS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-2.5 bg-[#F5F2EB] border-b border-[#E6E2D3] gap-2">
          {/* Tabs Switcher: My Projects | Templates Studio | My Media Library */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#E6E2D3] shadow-xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setActiveTab('my-projects');
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'my-projects'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>My Projects</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'my-projects' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => {
                soundFx.playHapticTick();
                setActiveTab('templates');
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Templates Studio</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'templates' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {LUMENLAB_PROJECT_TEMPLATES.length}
              </span>
            </button>

            <button
              onClick={() => {
                soundFx.playHapticTick();
                setActiveTab('library');
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'library'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>My Library Media</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'library' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {userMediaLibrary.length}
              </span>
            </button>

            {onOpenMarketplace && (
              <button
                id="projects-modal-marketplace-btn"
                onClick={() => {
                  soundFx.playHapticTick();
                  onClose();
                  onOpenMarketplace();
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-950 hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap bg-amber-50/80 border border-amber-200/90 ml-1"
                title="Browse & Replicate public creations on the Community Marketplace"
              >
                <Globe className="w-3.5 h-3.5 text-amber-700" />
                <span>Community Marketplace</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-400 text-amber-950 uppercase tracking-wider">
                  Ranked
                </span>
              </button>
            )}

            {onOpenFeedback && (
              <button
                id="projects-modal-feedback-btn"
                onClick={() => {
                  soundFx.playHapticTick();
                  onClose();
                  onOpenFeedback();
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-stone-800 hover:bg-stone-100 transition-all cursor-pointer whitespace-nowrap bg-white border border-stone-200 ml-1"
                title="Send Feedback & Feature Requests via Google Forms"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Feedback & Forms</span>
              </button>
            )}
          </div>

          {/* Quick Create Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                soundFx.playHapticTick();
                libraryBatchUploadRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#2A2723] hover:bg-[#FAF9F6] hover:border-[#C5BDB2] transition-colors cursor-pointer shadow-xs"
              title="Upload new photos or videos into your library"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Import Media</span>
            </button>

            <button
              onClick={() => {
                soundFx.playHapticTick();
                setIsBlankProjectMode(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#2A2723] hover:bg-[#FAF9F6] hover:border-[#C5BDB2] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#7E7365]" />
              <span>Blank Project</span>
            </button>

            <button
              onClick={() => {
                soundFx.playHapticTick();
                setActiveTab('templates');
                setTemplateScope('collages');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2A2723] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-300" />
              <span>Collages</span>
            </button>
          </div>
        </div>

        {/* 3. TAB 1: MY PROJECTS VIEW */}
        {activeTab === 'my-projects' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {projects.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#EAE6D8] flex items-center justify-center mb-4 text-[#7E7365]">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#2A2723] mb-1">No Projects Created Yet</h3>
                <p className="text-xs text-[#7E7365] mb-5 leading-relaxed">
                  Start your creative journey with your own library captures, multi-frame collages, or curated film recipes.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      setActiveTab('library');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-semibold hover:bg-black transition-all cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    <span>Choose from My Library</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      setActiveTab('templates');
                      setTemplateScope('collages');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#2A2723] hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs"
                  >
                    <LayoutGrid className="w-4 h-4 text-rose-500" />
                    <span>Collage Templates</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      setIsBlankProjectMode(true);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#7E7365] hover:text-[#2A2723] transition-all cursor-pointer"
                  >
                    Create Blank
                  </button>
                </div>
              </div>
            ) : (
              /* Projects Grid */
              <div className="flex flex-col gap-3.5">
                {user ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-8 h-8 rounded-xl object-cover border border-emerald-300 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center border border-emerald-300 shrink-0">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-[#2A2723] flex items-center gap-1.5">
                          <span className="truncate">{user.displayName || 'Creator Account'}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-950 font-bold font-mono">
                            Connected
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7E7365] truncate font-mono">
                          {user.email} &bull; Studio Cloud Sync Active
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#2A2723]">Multi-Project Cloud Sync</div>
                        <div className="text-[11px] text-[#7E7365]">
                          {projects.length > 1
                            ? 'Sign in with Google to sync and access all your projects across devices.'
                            : 'Guest mode includes 1 project. Sign in with Google to create unlimited synced projects.'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => signInWithGoogle()}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2A2723] hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5 text-amber-300" />
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2A2723]">Your Saved Projects</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAE6D8] text-[#2A2723] font-semibold">
                      {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#7E7365]">
                    <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{user ? `Studio Cloud (${user.email || user.displayName || 'Connected'})` : 'Guest Session (Sign in to sync with Cloud)'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((proj) => {
                  const isCurrent = proj.id === currentProjectId;
                  const isEditing = editingProjectId === proj.id;
                  const isCollage = Boolean(proj.activeCollage);
                  const tagInfo = PROJECT_TEMPLATE_TAGS.find((t) => t.id === proj.templateTag);

                  return (
                    <div
                      key={proj.id}
                      className={`group relative bg-white rounded-2xl border transition-all flex flex-col overflow-hidden shadow-xs hover:shadow-md ${
                        isCurrent
                          ? 'border-[#2A2723] ring-2 ring-[#2A2723]/80'
                          : 'border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      {/* Project Thumbnail Image with Aspect Frame */}
                      <div
                        onClick={() => {
                          soundFx.playHapticTick();
                          onSelectProject(proj);
                          onClose();
                        }}
                        className="relative aspect-[4/3] bg-neutral-900 cursor-pointer overflow-hidden flex items-center justify-center"
                      >
                        {proj.activeCollage ? (
                          <img
                            src={proj.thumbnailUrl || proj.activeCollage.previewThumbnail || proj.media.url}
                            alt={proj.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : proj.media.type === 'video' ? (
                          <video
                            src={proj.media.url}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={proj.coverUrl || proj.media.url}
                            alt={proj.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}

                        {/* Top Overlay Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                          {/* Template or Collage Badge */}
                          {proj.collages && proj.collages.length > 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs flex items-center gap-1 backdrop-blur-md">
                              <Layers className="w-3 h-3" />
                              <span>{proj.collages.length} Slides ({proj.activeCollage?.slots?.length || 0}F)</span>
                            </span>
                          ) : isCollage ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs flex items-center gap-1 backdrop-blur-md">
                              <LayoutGrid className="w-3 h-3" />
                              <span>Collage ({proj.activeCollage?.slots?.length || 0} Frames)</span>
                            </span>
                          ) : proj.templateTag && proj.templateTag !== 'custom' && tagInfo ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 backdrop-blur-md"
                              style={{
                                backgroundColor: tagInfo.bgColor,
                                color: tagInfo.color,
                              }}
                            >
                              {getTagIcon(proj.templateTag)}
                              <span>{tagInfo.label}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                              Custom Project
                            </span>
                          )}

                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A2723] text-white shadow-xs flex items-center gap-1">
                              <Check className="w-3 h-3 text-amber-300" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        {/* Hover Quick Open Overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3.5 py-1.5 rounded-full bg-white text-[#2A2723] text-xs font-bold shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <span>Open Project</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {/* Project Card Body */}
                      <div className="p-3.5 flex flex-col flex-1 justify-between bg-white">
                        {/* Name and Rename Input */}
                        <div>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 mb-1">
                              <input
                                type="text"
                                value={editingProjectName}
                                onChange={(e) => setEditingProjectName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(proj.id)}
                                autoFocus
                                className="flex-1 text-xs font-semibold text-[#2A2723] bg-[#FAF9F6] border border-[#2A2723] rounded px-2 py-0.5 focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveRename(proj.id)}
                                className="p-1 rounded bg-[#2A2723] text-white hover:bg-black"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mb-1">
                              <h4
                                onClick={() => {
                                  soundFx.playHapticTick();
                                  onSelectProject(proj);
                                  onClose();
                                }}
                                className="text-xs font-bold text-[#2A2723] hover:text-black transition-colors truncate cursor-pointer"
                                title={proj.name}
                              >
                                {proj.name}
                              </h4>
                              <button
                                onClick={() => {
                                  soundFx.playHapticTick();
                                  setEditingProjectId(proj.id);
                                  setEditingProjectName(proj.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[#7E7365] hover:text-[#2A2723] transition-opacity cursor-pointer"
                                title="Rename project"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-[#7E7365]">
                            <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="uppercase font-mono">
                              {isCollage ? `${proj.activeCollage?.slots?.length || 0} Slots` : proj.media?.type || 'media'}
                            </span>
                            {proj.adjustments.presetId && proj.adjustments.presetId !== 'none' && (
                              <>
                                <span>•</span>
                                <span className="capitalize font-medium">{proj.adjustments.presetId}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#F0EEE6]">
                          <button
                            onClick={() => {
                              soundFx.playHapticTick();
                              onSelectProject(proj);
                              onClose();
                            }}
                            className="text-xs font-semibold text-[#2A2723] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Edit Project</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                soundFx.playHapticTick();
                                onDuplicateProject(proj.id);
                              }}
                              className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
                              title="Duplicate Project"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                soundFx.playHapticTick();
                                if (window.confirm(`Delete project "${proj.name}"?`)) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-[#7E7365] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. TAB 2: UNIFIED TEMPLATES STUDIO EXPLORER */}
        {activeTab === 'templates' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Template Top Toolbar: Scope Filter + Search + My Library Photo Tray */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E6E2D3] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Main Scope Switcher (All / Collages / Film) */}
              <div className="flex items-center bg-[#FAF9F6] p-1 rounded-xl border border-[#E6E2D3] self-start">
                <button
                  onClick={() => {
                    soundFx.playHapticTick();
                    setTemplateScope('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    templateScope === 'all'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>All Templates</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    templateScope === 'all' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {LUMENLAB_PROJECT_TEMPLATES.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundFx.playHapticTick();
                    setTemplateScope('collages');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    templateScope === 'collages'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3 text-rose-300" />
                  <span>Collages & Layouts</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    templateScope === 'collages' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {collageCount}
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundFx.playHapticTick();
                    setTemplateScope('film');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    templateScope === 'film'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <Film className="w-3 h-3 text-amber-500" />
                  <span>Film & Photo Grades</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    templateScope === 'film' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {filmCount}
                  </span>
                </button>
              </div>

              {/* Template Search Bar */}
              <div className="relative w-full md:w-64 flex-shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E7365]" />
                <input
                  type="text"
                  placeholder="Search collages, AirDrop, film..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E6E2D3] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2A2723] placeholder-[#7E7365] focus:outline-none focus:border-[#2A2723] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Quick Starter: Apply to My Library Photo Banner */}
            {userMediaLibrary.length > 0 && (
              <div className="px-4 sm:px-6 py-2 bg-amber-50/60 border-b border-amber-200/70 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>Apply Template to My Photo:</span>
                  </span>
                  <span className="text-[10px] text-amber-800 hidden lg:inline">
                    (Pick your library image to immediately initialize templates with it)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      setActiveTemplateUserMedia(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                      activeTemplateUserMedia === null
                        ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                        : 'bg-white text-[#2A2723] border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Sample Photography
                  </button>

                  {userMediaLibrary.slice(0, 8).map((media) => {
                    const isSelected = activeTemplateUserMedia?.id === media.id;
                    return (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => {
                          soundFx.playHapticTick();
                          setActiveTemplateUserMedia(isSelected ? null : media);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-900 text-white border-amber-900 shadow-xs ring-1 ring-amber-900'
                            : 'bg-white text-[#2A2723] border-amber-200 hover:bg-amber-100'
                        }`}
                        title={media.name}
                      >
                        <div className="w-4 h-4 rounded overflow-hidden bg-neutral-900 flex-shrink-0">
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="max-w-[80px] truncate">{media.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-amber-300" />}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      setActiveTab('library');
                    }}
                    className="text-[11px] font-bold text-amber-900 hover:underline px-2 whitespace-nowrap"
                  >
                    + All {userMediaLibrary.length} Photos →
                  </button>
                </div>
              </div>
            )}

            {/* Tag Categories Horizontal Carousel */}
            <div className="px-4 sm:px-6 py-2 bg-[#F9F8F5] border-b border-[#E6E2D3] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
                <button
                  onClick={() => {
                    soundFx.playHapticTick();
                    setSelectedTag('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTag === 'all'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'bg-white text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>All Tags</span>
                </button>

                {PROJECT_TEMPLATE_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag.id;
                  const count = LUMENLAB_PROJECT_TEMPLATES.filter((t) => t.tag === tag.id).length;
                  if (count === 0) return null;

                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        soundFx.playHapticTick();
                        setSelectedTag(tag.id);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2A2723] text-white shadow-xs'
                          : 'bg-white text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723]'
                      }`}
                    >
                      {getTagIcon(tag.id)}
                      <span>{tag.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Slot count filter (for collages) */}
              {(templateScope === 'all' || templateScope === 'collages') && (
                <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#7E7365] flex-shrink-0">
                  <span className="font-semibold text-[#2A2723]">Frames:</span>
                  {(['all', '2', '3', '4', '6', '9'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        soundFx.playHapticTick();
                        setSlotCountFilter(s);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer ${
                        slotCountFilter === s
                          ? 'bg-[#2A2723] text-white'
                          : 'bg-white text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723]'
                      }`}
                    >
                      {s === 'all' ? 'All' : `${s}F`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Sparkles className="w-8 h-8 text-[#C5BDB2] mb-2" />
                  <p className="text-xs text-[#7E7365]">No templates match the selected criteria.</p>
                  <button
                    onClick={() => {
                      setSelectedTag('all');
                      setTemplateScope('all');
                      setSearchQuery('');
                      setSlotCountFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-[#E6E2D3] text-xs font-semibold text-[#2A2723]"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTemplates.map((tpl) => {
                    const tagInfo = PROJECT_TEMPLATE_TAGS.find((t) => t.id === tpl.tag);
                    const isCollage = Boolean(tpl.collageData);
                    const previewImgSrc = activeTemplateUserMedia ? activeTemplateUserMedia.url : tpl.previewThumbnail;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleOpenTemplatePreview(tpl)}
                        className="group bg-white rounded-2xl border border-[#E6E2D3] hover:border-[#2A2723] hover:shadow-md transition-all flex flex-col overflow-hidden cursor-pointer shadow-xs"
                      >
                        {/* Image Preview with Badges */}
                        <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden">
                          <img
                            src={previewImgSrc}
                            alt={tpl.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Top Badges */}
                          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                            {/* Tag badge or Collage Badge */}
                            {isCollage ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs flex items-center gap-1 backdrop-blur-md">
                                <LayoutGrid className="w-3 h-3" />
                                <span>{tpl.collageData?.slots.length} Frames</span>
                              </span>
                            ) : tagInfo ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 backdrop-blur-md"
                                style={{
                                  backgroundColor: tagInfo.bgColor,
                                  color: tagInfo.color,
                                }}
                              >
                                {getTagIcon(tpl.tag)}
                                <span>{tagInfo.label}</span>
                              </span>
                            ) : null}

                            {activeTemplateUserMedia && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                                <Camera className="w-2.5 h-2.5" />
                                <span>My Photo</span>
                              </span>
                            )}
                          </div>

                          {/* Aspect Ratio Chip */}
                          <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                            <span className="px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] font-semibold backdrop-blur-xs">
                              {tpl.aspectLabel}
                            </span>
                          </div>

                          {/* Hover Overlay Button */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-4 py-2 rounded-full bg-white text-[#2A2723] text-xs font-bold shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>Init Project</span>
                            </span>
                          </div>
                        </div>

                        {/* Template Details */}
                        <div className="p-4 flex flex-col flex-1 justify-between bg-white">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h4 className="text-xs font-bold text-[#2A2723] group-hover:text-black truncate">
                                {tpl.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-[#7E7365] line-clamp-2 leading-relaxed mb-2.5">
                              {tpl.subtitle}
                            </p>

                            {/* Mood tags pills */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {tpl.moodKeywords.slice(0, 3).map((kw, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3]"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Footer Features */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[10px] text-[#7E7365]">
                            <span className="font-semibold text-[#2A2723] group-hover:underline flex items-center gap-1">
                              <span>Init Project</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                            <span className="font-mono capitalize">
                              {isCollage
                                ? `${tpl.collageData?.slots.length} Frames`
                                : tpl.adjustments.frameType !== 'none'
                                ? tpl.adjustments.frameType
                                : 'Frameless'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. TAB 3: DEDICATED "MY MEDIA LIBRARY" VIEW FOR PROJECT SELECTIONS */}
        {activeTab === 'library' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Library Action Bar & Filters */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E6E2D3] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Type Filters (All / Photos / Videos) */}
              <div className="flex items-center bg-[#FAF9F6] p-1 rounded-xl border border-[#E6E2D3] self-start">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playHapticTick();
                    setLibraryFilter('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    libraryFilter === 'all'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>All Media</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    libraryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {userMediaLibrary.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playHapticTick();
                    setLibraryFilter('image');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    libraryFilter === 'image'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photos</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    libraryFilter === 'image' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {userMediaLibrary.filter((m) => m.type === 'image').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playHapticTick();
                    setLibraryFilter('video');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    libraryFilter === 'video'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Videos</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    libraryFilter === 'video' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                  }`}>
                    {userMediaLibrary.filter((m) => m.type === 'video').length}
                  </span>
                </button>
              </div>

              {/* Search + Camera / Upload Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-52 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E7365]" />
                  <input
                    type="text"
                    placeholder="Search captures..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E6E2D3] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2A2723] placeholder-[#7E7365] focus:outline-none focus:border-[#2A2723] focus:bg-white transition-colors"
                  />
                </div>

                {onOpenCamera && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      onClose();
                      onOpenCamera();
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-[#E6E2D3] bg-white hover:bg-[#FAF9F6] text-xs font-semibold text-[#2A2723] flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Take Photo"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Camera</span>
                  </button>
                )}

                {onRecordVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      onClose();
                      onRecordVideo();
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-900 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Record Video"
                  >
                    <Video className="w-3.5 h-3.5 text-red-600" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Selection Action Strip (when 1 or more media items are selected) */}
            {selectedLibraryIds.length > 0 && (
              <div className="px-4 sm:px-6 py-2.5 bg-[#2A2723] text-white flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    {selectedLibraryIds.length} item{selectedLibraryIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllLibrary}
                    className="text-[11px] text-white/70 hover:text-white underline cursor-pointer"
                  >
                    {selectedLibraryIds.length === filteredUserMedia.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* If 1 selected: Start Single Project */}
                  {selectedLibraryIds.length === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = userMediaLibrary.find((m) => m.id === selectedLibraryIds[0]);
                        if (target) handleStartProjectFromLibraryMedia(target);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#2A2723] rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start Single Project</span>
                    </button>
                  )}

                  {/* If 2+ selected: Create Collage Project */}
                  {selectedLibraryIds.length >= 2 && (
                    <button
                      type="button"
                      onClick={handleCreateCollageFromSelectedLibraryItems}
                      className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Create {selectedLibraryIds.length}-Slot Collage Project</span>
                    </button>
                  )}

                  {/* Delete Selected */}
                  {onDeleteUserMedia && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${selectedLibraryIds.length} item(s) from your library?`)) {
                          selectedLibraryIds.forEach((id) => onDeleteUserMedia(id));
                          setSelectedLibraryIds([]);
                          soundFx.playHapticTick();
                        }
                      }}
                      className="p-1 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 cursor-pointer"
                      title="Delete Selected"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Media Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredUserMedia.length === 0 ? (
                /* Empty Library State */
                <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#EAE6D8] flex items-center justify-center mb-4 text-[#7E7365]">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-[#2A2723] mb-1">Your Media Library is Empty</h3>
                  <p className="text-xs text-[#7E7365] mb-5 leading-relaxed">
                    Import your own high-resolution photos and videos, or use the built-in camera to take fresh captures and turn them into projects.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playHapticTick();
                        libraryBatchUploadRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-semibold hover:bg-black transition-all cursor-pointer shadow-sm"
                    >
                      <Upload className="w-4 h-4 text-amber-300" />
                      <span>Upload Photos / Videos</span>
                    </button>

                    {onOpenCamera && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playHapticTick();
                          onClose();
                          onOpenCamera();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#2A2723] hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs"
                      >
                        <Camera className="w-4 h-4 text-amber-500" />
                        <span>Take Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Rich Media Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {filteredUserMedia.map((media) => {
                    const isSelected = selectedLibraryIds.includes(media.id);
                    const isVideo = media.type === 'video';

                    return (
                      <div
                        key={media.id}
                        onClick={() => handleToggleLibraryItemSelection(media.id)}
                        className={`group relative bg-white rounded-xl border transition-all overflow-hidden flex flex-col shadow-xs cursor-pointer ${
                          isSelected
                            ? 'border-[#2A2723] ring-2 ring-[#2A2723]'
                            : 'border-[#E6E2D3] hover:border-[#2A2723] hover:shadow-md'
                        }`}
                      >
                        {/* Thumbnail Viewport */}
                        <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden flex items-center justify-center">
                          {isVideo ? (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={media.url}
                              alt={media.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}

                          {/* Top Left Media Type Badge */}
                          <div className="absolute top-2 left-2 pointer-events-none z-10">
                            {isVideo ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[9px] font-bold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                                <Video className="w-2.5 h-2.5" />
                                <span>VIDEO</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono font-semibold backdrop-blur-xs">
                                {media.width ? `${media.width}×${media.height}` : 'PHOTO'}
                              </span>
                            )}
                          </div>

                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleLibraryItemSelection(media.id, e)}
                            className={`absolute top-2 right-2 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#2A2723] text-white shadow-xs'
                                : 'bg-black/40 text-white/80 hover:bg-black/60'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-xs border border-white/80" />}
                          </button>

                          {/* Hover Action Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5 z-10">
                            <div className="flex justify-end">
                              {onDeleteUserMedia && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundFx.playHapticTick();
                                    if (window.confirm(`Delete "${media.name}" from library?`)) {
                                      onDeleteUserMedia(media.id);
                                    }
                                  }}
                                  className="p-1 rounded bg-black/50 text-white hover:bg-red-600 transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartProjectFromLibraryMedia(media);
                                }}
                                className="w-full py-1.5 px-2 bg-amber-400 hover:bg-amber-300 text-[#2A2723] text-[10px] font-bold rounded-lg shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Start Project</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.playHapticTick();
                                  setActiveTemplateUserMedia(media);
                                  setActiveTab('templates');
                                }}
                                className="w-full py-1 px-2 bg-white hover:bg-[#F0EEE6] text-[#2A2723] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Apply Recipe</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-2 bg-white flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-[#2A2723] truncate" title={media.name}>
                            {media.name}
                          </span>
                          <span className="text-[9px] text-[#7E7365] font-mono">
                            {media.createdAt ? new Date(media.createdAt).toLocaleDateString() : 'Library Capture'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. TEMPLATE DETAIL & CREATION MODAL DRAWER (Supports Collages & Single-Media) */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-[#FAF9F6] w-full max-w-3xl rounded-2xl border border-[#E6E2D3] shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E6E2D3]">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: selectedTemplate.tagBgColor,
                      color: selectedTemplate.tagColor,
                    }}
                  >
                    {selectedTemplate.tagLabel}
                  </span>
                  <h3 className="text-sm font-bold text-[#2A2723]">
                    Init Project: {selectedTemplate.name}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCustomCollage(null);
                  }}
                  className="p-1.5 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                {/* Project Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full bg-white border border-[#E6E2D3] rounded-xl px-3.5 py-2 text-xs font-medium text-[#2A2723] focus:outline-none focus:border-[#2A2723]"
                  />
                </div>

                {/* A. COLLAGE TEMPLATE CONFIGURATOR */}
                {customCollage ? (
                  <div className="flex flex-col gap-4">
                    {/* Visual Layout Preview */}
                    <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-xl overflow-hidden bg-neutral-900 border border-[#E6E2D3] flex items-center justify-center p-2">
                      <img
                        src={customCollage.previewThumbnail}
                        alt={customCollage.name}
                        className="max-h-full max-w-full object-contain rounded shadow-lg"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1.5">
                        <LayoutGrid className="w-3 h-3 text-amber-300" />
                        <span>Collage Layout: {customCollage.slots.length} Frames ({customCollage.aspectLabel})</span>
                      </div>

                      {userMediaLibrary.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoFillCollageFromLibrary}
                          className="absolute top-2.5 right-2.5 bg-amber-400 hover:bg-amber-300 text-[#2A2723] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 cursor-pointer transition-colors"
                          title="Fill all frame slots automatically using your library images"
                        >
                          <Shuffle className="w-3 h-3" />
                          <span>Auto-Fill from My Library</span>
                        </button>
                      )}
                    </div>

                    {/* Slot Media Configurator List */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Customize Multi-Frame Media ({customCollage.slots.length} Slots):</span>
                        </label>
                        <span className="text-[10px] text-[#7E7365]">Click any frame to replace photo/video</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {customCollage.slots.map((slot, index) => {
                          return (
                            <div
                              key={slot.id}
                              className="p-2.5 bg-white rounded-xl border border-[#E6E2D3] flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-12 h-14 rounded-lg bg-neutral-900 overflow-hidden flex-shrink-0 border border-[#E6E2D3]">
                                  {slot.media.type === 'video' ? (
                                    <video src={slot.media.url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={slot.media.url} alt={slot.label} className="w-full h-full object-cover" />
                                  )}
                                  <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 bg-black/70 text-white text-[8px] font-bold rounded">
                                    #{index + 1}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[#2A2723] block truncate">
                                    {slot.label || `Frame ${index + 1}`}
                                  </span>
                                  <span className="text-[10px] text-[#7E7365] block truncate">
                                    {slot.media.name || 'Sample media'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {userMediaLibrary.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundFx.playHapticTick();
                                      setSlotPickerDrawerSlotId(slotPickerDrawerSlotId === slot.id ? null : slot.id);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Choose from your library"
                                  >
                                    <Camera className="w-3 h-3 text-amber-600" />
                                    <span>Library</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    soundFx.playHapticTick();
                                    setActiveSlotUploadId(slot.id);
                                    slotFileInputRef.current?.click();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-[10px] font-semibold text-[#2A2723] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Upload photo or video for this frame"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Upload</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded Frame Slot Media Picker Tray (when a slot's "Library" is clicked) */}
                      {slotPickerDrawerSlotId && userMediaLibrary.length > 0 && (
                        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col gap-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-600" />
                              <span>Select Media for Frame #{customCollage.slots.findIndex((s) => s.id === slotPickerDrawerSlotId) + 1}:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSlotPickerDrawerSlotId(null)}
                              className="text-[10px] text-amber-900 hover:underline font-semibold"
                            >
                              Done
                            </button>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white rounded-xl border border-amber-200 no-scrollbar">
                            {userMediaLibrary.map((m) => (
                              <div
                                key={m.id}
                                onClick={() => handleAssignLibraryMediaToSlot(slotPickerDrawerSlotId, m)}
                                className="group relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden cursor-pointer border border-[#E6E2D3] hover:border-amber-500 hover:scale-105 transition-all shadow-xs"
                                title={`Use "${m.name}"`}
                              >
                                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[7px] text-white truncate pointer-events-none">
                                  {m.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Choose from Library Carousel for Slots */}
                      {userMediaLibrary.length > 0 && !slotPickerDrawerSlotId && (
                        <div className="mt-2 p-3 bg-white rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
                          <span className="text-[11px] font-bold text-[#2A2723] flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-500" />
                            <span>Quick Insert from Your Media Library ({userMediaLibrary.length} Captures):</span>
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            {userMediaLibrary.map((media) => {
                              const isVideo = media.type === 'video';
                              return (
                                <div
                                  key={media.id}
                                  className="group/item relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-[#E6E2D3] bg-neutral-900"
                                >
                                  {isVideo ? (
                                    <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                                  )}
                                  
                                  {/* Hover action to assign to slot */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 flex flex-col items-center justify-center p-1 gap-1 transition-opacity">
                                    <span className="text-[8px] font-bold text-white text-center leading-tight">Assign to:</span>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {customCollage.slots.slice(0, 4).map((s, idx) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => handleAssignLibraryMediaToSlot(s.id, media)}
                                          className="px-1.5 py-0.5 bg-white text-[#2A2723] text-[8px] font-bold rounded hover:bg-amber-300 cursor-pointer"
                                        >
                                          #{idx + 1}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* B. SINGLE MEDIA TEMPLATE CONFIGURATOR */
                  <div className="flex flex-col gap-4">
                    {/* Preview Image with template grading */}
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-neutral-900 border border-[#E6E2D3] group">
                      <img
                        src={uploadedMedia ? uploadedMedia.url : selectedTemplate.previewThumbnail}
                        alt={selectedTemplate.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2.5 left-2.5 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1.5">
                        <span>{uploadedMedia ? `Custom Media: ${uploadedMedia.name}` : 'Template Sample Media'}</span>
                      </div>
                      {uploadedMedia && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedMedia(null);
                            soundFx.playHapticTick();
                          }}
                          className="absolute top-2.5 right-2.5 px-2 py-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                          title="Remove custom media item"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Use Sample Media</span>
                        </button>
                      )}
                    </div>

                    {/* Media Source Selector */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider">
                          Initial Media Source
                        </label>
                        <div className="flex items-center gap-1.5">
                          {onRecordVideo && (
                            <button
                              onClick={() => {
                                soundFx.playHapticTick();
                                onClose();
                                onRecordVideo();
                              }}
                              className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer border border-red-200"
                            >
                              <Video className="w-3 h-3" />
                              <span>Record Video</span>
                            </button>
                          )}
                          {onOpenCamera && (
                            <button
                              onClick={() => {
                                soundFx.playHapticTick();
                                onClose();
                                onOpenCamera();
                              }}
                              className="flex items-center gap-1 text-[10px] font-semibold text-[#2A2723] hover:text-black bg-[#FAF9F6] hover:bg-[#F0EEE6] px-2 py-0.5 rounded-lg transition-colors cursor-pointer border border-[#E6E2D3]"
                            >
                              <Camera className="w-3 h-3 text-amber-500" />
                              <span>Take Photo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Option Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            soundFx.playHapticTick();
                            setUploadedMedia(null);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            !uploadedMedia
                              ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                              : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#2A2723]">Template Sample</span>
                            {!uploadedMedia && <Check className="w-3.5 h-3.5 text-[#2A2723]" />}
                          </div>
                          <p className="text-[10px] text-[#7E7365]">Curated editorial photography</p>
                        </button>

                        <button
                          onClick={() => {
                            soundFx.playHapticTick();
                            singleFileInputRef.current?.click();
                          }}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            uploadedMedia && !userMediaLibrary.some((m) => m.id === uploadedMedia.id)
                              ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                              : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#2A2723]">Upload From Device</span>
                            <Upload className="w-3.5 h-3.5 text-[#7E7365]" />
                          </div>
                          <p className="text-[10px] text-[#7E7365] truncate">Select file from computer</p>
                        </button>
                      </div>

                      {/* User Library Items */}
                      {userMediaLibrary.length > 0 && (
                        <div className="mt-1 flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-[#2A2723] flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-500" />
                            <span>Choose from My Library ({userMediaLibrary.length} Captures):</span>
                          </span>

                          <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white rounded-xl border border-[#E6E2D3] no-scrollbar">
                            {userMediaLibrary.map((media) => {
                              const isSelected = uploadedMedia?.id === media.id;
                              const isVideo = media.type === 'video';
                              return (
                                <div
                                  key={media.id}
                                  onClick={() => {
                                    soundFx.playHapticTick();
                                    setUploadedMedia(media);
                                  }}
                                  className={`group/item relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                                    isSelected
                                      ? 'border-[#2A2723] ring-2 ring-[#2A2723] scale-105 shadow-sm'
                                      : 'border-[#E6E2D3] hover:border-[#2A2723] opacity-85 hover:opacity-100'
                                  }`}
                                  title={media.name}
                                >
                                  {isVideo ? (
                                    <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute top-1 left-1 pointer-events-none">
                                    {isVideo ? (
                                      <span className="p-0.5 rounded bg-red-600 text-white flex items-center justify-center">
                                        <Video className="w-2.5 h-2.5" />
                                      </span>
                                    ) : (
                                      <span className="p-0.5 rounded bg-amber-500 text-white flex items-center justify-center">
                                        <Camera className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-[#2A2723]/30 flex items-center justify-center pointer-events-none">
                                      <Check className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[8px] text-white truncate pointer-events-none">
                                    {media.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pre-configured Adjustments Highlight */}
                <div className="bg-white p-3.5 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E7365]">
                    Included Aesthetic Recipe:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.adjustments.presetId && (
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] font-medium text-[#2A2723]">
                        Preset: <strong className="uppercase">{selectedTemplate.adjustments.presetId}</strong>
                      </span>
                    )}
                    {selectedTemplate.adjustments.grainAmount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] font-medium text-[#2A2723]">
                        Film Grain: {Math.round(selectedTemplate.adjustments.grainAmount * 100)}%
                      </span>
                    )}
                    {selectedTemplate.adjustments.frameType !== 'none' && (
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] font-medium text-[#2A2723]">
                        Border: {selectedTemplate.adjustments.frameType}
                      </span>
                    )}
                    {customCollage && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px] font-semibold text-rose-800">
                        Multi-Slot Canvas: {customCollage.slots.length} Frames
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-t border-[#E6E2D3]">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCustomCollage(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7E7365] hover:text-[#2A2723]"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  {currentProjectId && onAddCollageToCurrentProject && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playShutter();
                        const collageToAdd = customCollage || selectedTemplate.collageData;
                        if (collageToAdd) {
                          onAddCollageToCurrentProject(collageToAdd);
                        } else {
                          const singleSlotCollage: CollageTemplate = {
                            id: `slide-${Date.now()}-${selectedTemplate.id}`,
                            name: selectedTemplate.name,
                            category: 'polaroid-stack',
                            categoryLabel: selectedTemplate.tagLabel,
                            description: selectedTemplate.description,
                            subtitle: selectedTemplate.subtitle,
                            aspectRatio: selectedTemplate.aspectRatio,
                            aspectLabel: selectedTemplate.aspectLabel,
                            previewThumbnail: selectedTemplate.previewThumbnail,
                            slots: [
                              {
                                id: `slot-${Date.now()}`,
                                label: selectedTemplate.name,
                                media: uploadedMedia || selectedTemplate.sampleMedia,
                                x: 0,
                                y: 0,
                                width: 100,
                                height: 100,
                                fit: 'cover',
                                borderRadius: 0,
                                shadow: 'none',
                                zIndex: 1,
                              }
                            ],
                            textElements: [],
                            overlays: {},
                            adjustments: createAdjustmentsCopy(selectedTemplate.adjustments),
                            moodKeywords: selectedTemplate.moodKeywords,
                          };
                          onAddCollageToCurrentProject(singleSlotCollage);
                        }
                        setSelectedTemplate(null);
                        setCustomCollage(null);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
                      title="Add this template as a slide to currently active project"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>+ Add to Current Project</span>
                    </button>
                  )}
                  <button
                    onClick={handleCreateFromTemplate}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Init Project</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. CREATE BLANK PROJECT MODAL STEP */}
        {isBlankProjectMode && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-[#FAF9F6] w-full max-w-md rounded-2xl border border-[#E6E2D3] shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E6E2D3]">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#2A2723]" />
                  <h3 className="text-sm font-bold text-[#2A2723]">Create Blank Project</h3>
                </div>
                <button
                  onClick={() => setIsBlankProjectMode(false)}
                  className="p-1.5 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Project Format Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider">
                    Project Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBlankProjectType('single')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        blankProjectType === 'single'
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="text-xs font-bold text-[#2A2723] block">Single Media</span>
                        <span className="text-[10px] text-[#7E7365]">1 Photo or Video</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBlankProjectType('strip-3')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        blankProjectType === 'strip-3'
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 text-rose-600" />
                      <div>
                        <span className="text-xs font-bold text-[#2A2723] block">Collage (3 Frames)</span>
                        <span className="text-[10px] text-[#7E7365]">Filmstrip Story</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBlankProjectType('bento-4')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        blankProjectType === 'bento-4'
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <Grid className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="text-xs font-bold text-[#2A2723] block">Bento Grid (4)</span>
                        <span className="text-[10px] text-[#7E7365]">Editorial Lookbook</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBlankProjectType('grid-9')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        blankProjectType === 'grid-9'
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <Grid className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="text-xs font-bold text-[#2A2723] block">9-Grid Layout</span>
                        <span className="text-[10px] text-[#7E7365]">Instagram Feed</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Project Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={blankProjectName}
                    onChange={(e) => setBlankProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    autoFocus
                    className="w-full bg-white border border-[#E6E2D3] rounded-xl px-3.5 py-2 text-xs font-medium text-[#2A2723] focus:outline-none focus:border-[#2A2723]"
                  />
                </div>

                {/* Choose from Library for Blank Project */}
                {userMediaLibrary.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider flex items-center justify-between">
                      <span>Start with Library Media ({userMediaLibrary.length} available)</span>
                      {(blankProjectMedia || blankProjectSelectedMediaIds.length > 0) && (
                        <button
                          onClick={() => {
                            setBlankProjectMedia(null);
                            setBlankProjectSelectedMediaIds([]);
                          }}
                          className="text-[10px] text-[#7E7365] hover:text-[#2A2723] underline"
                        >
                          Clear selection
                        </button>
                      )}
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white rounded-xl border border-[#E6E2D3] no-scrollbar">
                      {userMediaLibrary.map((media) => {
                        const isSelected = blankProjectType === 'single'
                          ? blankProjectMedia?.id === media.id
                          : blankProjectSelectedMediaIds.includes(media.id);
                        const isVideo = media.type === 'video';
                        return (
                          <div
                            key={media.id}
                            onClick={() => {
                              soundFx.playHapticTick();
                              if (blankProjectType === 'single') {
                                setBlankProjectMedia(isSelected ? null : media);
                              } else {
                                setBlankProjectSelectedMediaIds((prev) =>
                                  prev.includes(media.id)
                                    ? prev.filter((id) => id !== media.id)
                                    : [...prev, media.id]
                                );
                              }
                            }}
                            className={`group/blankitem relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                              isSelected
                                ? 'border-[#2A2723] ring-2 ring-[#2A2723] scale-105 shadow-sm'
                                : 'border-[#E6E2D3] hover:border-[#2A2723] opacity-80 hover:opacity-100'
                            }`}
                            title={media.name}
                          >
                            {isVideo ? (
                              <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                            ) : (
                              <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute top-1 left-1 pointer-events-none">
                              {isVideo ? (
                                <span className="p-0.5 rounded bg-red-600 text-white flex items-center justify-center">
                                  <Video className="w-2 h-2" />
                                </span>
                              ) : (
                                <span className="p-0.5 rounded bg-amber-500 text-white flex items-center justify-center">
                                  <Camera className="w-2 h-2" />
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#2A2723]/30 flex items-center justify-center pointer-events-none">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-white border-t border-[#E6E2D3]">
                <button
                  onClick={() => setIsBlankProjectMode(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7E7365] hover:text-[#2A2723]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBlankProject}
                  className="px-5 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-md"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
