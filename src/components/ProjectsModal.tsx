import React, { useState, useRef } from 'react';
import {
  X, Plus, Sparkles, FolderOpen, Trash2, Copy, Edit2, Check,
  Search, ArrowRight, Upload, Calendar, Clock, Film, Camera, Video,
  Layers, Heart, Sun, Eye, Zap, Compass, PenTool, Flame, RefreshCw
} from 'lucide-react';
import { Project, ProjectTemplate, ProjectTemplateTag, MediaItem, Adjustments } from '../types';
import { PROJECT_TEMPLATE_TAGS, LUMENLAB_PROJECT_TEMPLATES } from '../constants/projectTemplates';
import { soundFx } from '../utils/audio';
import { defaultAdjustments, createAdjustmentsCopy } from '../constants/defaultAdjustments';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string | null;
  initialTab?: 'my-projects' | 'templates';
  userMediaLibrary?: MediaItem[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (
    name: string,
    template?: ProjectTemplate,
    customMedia?: MediaItem,
    customAdjustments?: Adjustments
  ) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onImportFileToProject?: (file: File) => Promise<MediaItem | null>;
  onOpenCamera?: () => void;
  onRecordVideo?: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  initialTab,
  userMediaLibrary = [],
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onImportFileToProject,
  onOpenCamera,
  onRecordVideo,
}) => {
  // Modal active tab: 'my-projects' | 'templates'
  const [activeTab, setActiveTab] = useState<'my-projects' | 'templates'>(
    initialTab || (projects.length === 0 ? 'templates' : 'my-projects')
  );

  // Sync activeTab when modal is reopened or initialTab changes
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Template filter states
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected template for detail / custom creation step
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Blank project creation modal step
  const [isBlankProjectMode, setIsBlankProjectMode] = useState<boolean>(false);
  const [blankProjectName, setBlankProjectName] = useState<string>('Untitled Project');
  const [blankProjectMedia, setBlankProjectMedia] = useState<MediaItem | null>(null);

  // Inline rename state in My Projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter templates
  const filteredTemplates = LUMENLAB_PROJECT_TEMPLATES.filter((tpl) => {
    const matchesTag = selectedTag === 'all' || tpl.tag === selectedTag;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.subtitle.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.tagLabel.toLowerCase().includes(q) ||
      tpl.moodKeywords.some((k) => k.toLowerCase().includes(q));

    return matchesTag && matchesSearch;
  });

  // Handle open template preview drawer
  const handleOpenTemplatePreview = (tpl: ProjectTemplate) => {
    soundFx.playHapticTick();
    setSelectedTemplate(tpl);
    setNewProjectName(`${tpl.name} Project`);
    setUploadedMedia(null);
  };

  // Handle create project from template
  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    soundFx.playShutter();

    const mediaToUse = uploadedMedia || selectedTemplate.sampleMedia;
    const nameToUse = newProjectName.trim() || selectedTemplate.name;
    const adjustmentsToUse = createAdjustmentsCopy(selectedTemplate.adjustments);

    onCreateProject(nameToUse, selectedTemplate, mediaToUse, adjustmentsToUse);
    setSelectedTemplate(null);
    onClose();
  };

  // Handle create blank project
  const handleCreateBlankProject = () => {
    soundFx.playShutter();
    const nameToUse = blankProjectName.trim() || 'Untitled Project';
    onCreateProject(nameToUse, undefined, blankProjectMedia || undefined, createAdjustmentsCopy(defaultAdjustments));
    setIsBlankProjectMode(false);
    setBlankProjectMedia(null);
    onClose();
  };

  // File upload for template
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);

      if (isVideo) {
        const video = document.createElement('video');
        video.src = url;
        await new Promise((res) => {
          video.onloadedmetadata = res;
        });
        setUploadedMedia({
          id: `media-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'video',
          url,
          file,
          aspectRatio: (video.videoWidth || 1920) / (video.videoHeight || 1080),
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          duration: video.duration || 10,
        });
      } else {
        const img = new Image();
        img.src = url;
        await new Promise((res) => {
          img.onload = res;
        });
        setUploadedMedia({
          id: `media-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          url,
          file,
          aspectRatio: (img.width || 1200) / (img.height || 1500),
          width: img.width || 1200,
          height: img.height || 1500,
        });
      }
      soundFx.playHapticTick();
    } catch (err) {
      console.error('File import failed:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Save inline rename
  const handleSaveRename = (projectId: string) => {
    if (editingProjectName.trim()) {
      onRenameProject(projectId, editingProjectName.trim());
    }
    setEditingProjectId(null);
    soundFx.playHapticTick();
  };

  const getTagIcon = (tagId: string) => {
    switch (tagId) {
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
      <div className="bg-[#FAF9F6] w-full max-w-5xl h-[92vh] max-h-[840px] rounded-2xl shadow-2xl border border-[#E6E2D3] flex flex-col overflow-hidden">
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
          onChange={handleFileUpload}
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
                  LumenLabs Templates
                </span>
              </div>
              <p className="text-[11px] text-[#7E7365] hidden sm:block">
                Create new photo & video projects initialized with LumenLabs standard aesthetic templates
              </p>
            </div>
          </div>

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

        {/* 2. TAB CONTROLS & TOP ACTIONS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-2.5 bg-[#F5F2EB] border-b border-[#E6E2D3] gap-2">
          {/* Tabs Switcher */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#E6E2D3] shadow-xs">
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setActiveTab('my-projects');
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>LumenLabs Templates</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'templates' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {LUMENLAB_PROJECT_TEMPLATES.length}
              </span>
            </button>
          </div>

          {/* Quick Create Buttons */}
          <div className="flex items-center gap-2">
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
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2A2723] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Explore Templates</span>
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
                  Start your creative journey by picking a LumenLabs project template with curated film grading, light leaks, and retro stamps.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      setActiveTab('templates');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-semibold hover:bg-black transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Choose a LumenLabs Template</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      setIsBlankProjectMode(true);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E6E2D3] bg-white text-xs font-semibold text-[#2A2723] hover:bg-[#FAF9F6] transition-all cursor-pointer"
                  >
                    Create Blank
                  </button>
                </div>
              </div>
            ) : (
              /* Projects Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((proj) => {
                  const isCurrent = proj.id === currentProjectId;
                  const isEditing = editingProjectId === proj.id;
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
                        {proj.media.type === 'video' ? (
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
                          {/* Template Tag Badge */}
                          {proj.templateTag && proj.templateTag !== 'custom' && tagInfo ? (
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
                            <span className="uppercase font-mono">{proj.media.type}</span>
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
                            <span>Edit</span>
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
            )}
          </div>
        )}

        {/* 4. TAB 2: LUMENLABS STANDARD TEMPLATES EXPLORER */}
        {activeTab === 'templates' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tag Filter Pills Bar & Search */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E6E2D3] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Tag Categories Horizontal Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => {
                    soundFx.playHapticTick();
                    setSelectedTag('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTag === 'all'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723] hover:border-[#C5BDB2]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>All Tags ({LUMENLAB_PROJECT_TEMPLATES.length})</span>
                </button>

                {PROJECT_TEMPLATE_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag.id;
                  const count = LUMENLAB_PROJECT_TEMPLATES.filter((t) => t.tag === tag.id).length;

                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        soundFx.playHapticTick();
                        setSelectedTag(tag.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2A2723] text-white shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723] hover:border-[#C5BDB2]'
                      }`}
                    >
                      {getTagIcon(tag.id)}
                      <span>{tag.label}</span>
                      <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Template Search Bar */}
              <div className="relative w-full md:w-64 flex-shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E7365]" />
                <input
                  type="text"
                  placeholder="Search LumenLabs templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E6E2D3] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2A2723] placeholder-[#7E7365] focus:outline-none focus:border-[#2A2723] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map((tpl) => {
                  const tagInfo = PROJECT_TEMPLATE_TAGS.find((t) => t.id === tpl.tag);

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleOpenTemplatePreview(tpl)}
                      className="group bg-white rounded-2xl border border-[#E6E2D3] hover:border-[#2A2723] hover:shadow-md transition-all flex flex-col overflow-hidden cursor-pointer shadow-xs"
                    >
                      {/* Image Preview with Tag Badge */}
                      <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden">
                        <img
                          src={tpl.previewThumbnail}
                          alt={tpl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                          {/* Tag badge */}
                          {tagInfo && (
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
                          )}

                          {tpl.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A2723] text-white shadow-xs">
                              {tpl.badge}
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
                            <span>Use Template</span>
                          </span>
                        </div>
                      </div>

                      {/* Template Details */}
                      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
                        <div>
                          <h4 className="text-xs font-bold text-[#2A2723] mb-1 group-hover:text-black">
                            {tpl.name}
                          </h4>
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
                            {tpl.adjustments.frameType !== 'none' ? tpl.adjustments.frameType : 'Frameless'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. TEMPLATE DETAIL & CREATION MODAL DRAWER */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-[#FAF9F6] w-full max-w-2xl rounded-2xl border border-[#E6E2D3] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
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
                    Initialize Project: {selectedTemplate.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-1.5 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                {/* Preview Image with template grading */}
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-neutral-900 border border-[#E6E2D3]">
                  <img
                    src={uploadedMedia ? uploadedMedia.url : selectedTemplate.previewThumbnail}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2.5 left-2.5 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                    {uploadedMedia ? `Custom Media: ${uploadedMedia.name}` : 'Template Sample Media'}
                  </div>
                </div>

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
                    {/* Option A: Use Template Sample */}
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
                      <p className="text-[10px] text-[#7E7365]">
                        Curated editorial photography
                      </p>
                    </button>

                    {/* Option B: Upload Custom Media */}
                    <button
                      onClick={() => {
                        soundFx.playHapticTick();
                        fileInputRef.current?.click();
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        uploadedMedia && !userMediaLibrary.some((m) => m.id === uploadedMedia.id)
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#2A2723]">
                          Upload From Device
                        </span>
                        <Upload className="w-3.5 h-3.5 text-[#7E7365]" />
                      </div>
                      <p className="text-[10px] text-[#7E7365] truncate">
                        Select file from computer
                      </p>
                    </button>
                  </div>

                  {/* Option C: User Library Items (Recorded Videos & Captures) */}
                  {userMediaLibrary.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#2A2723] flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-amber-500" />
                          <span>Choose from My Library ({userMediaLibrary.length} Captures & Videos):</span>
                        </span>
                        {uploadedMedia && userMediaLibrary.some((m) => m.id === uploadedMedia.id) && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            Selected: {uploadedMedia.name}
                          </span>
                        )}
                      </div>

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
                              className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                                isSelected
                                  ? 'border-[#2A2723] ring-2 ring-[#2A2723] scale-105 shadow-sm'
                                  : 'border-[#E6E2D3] hover:border-[#2A2723] opacity-85 hover:opacity-100'
                              }`}
                              title={media.name}
                            >
                              {isVideo ? (
                                <video
                                  src={media.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={media.url}
                                  alt={media.name}
                                  className="w-full h-full object-cover"
                                />
                              )}

                              {/* Badge */}
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
                                <div className="absolute inset-0 bg-[#2A2723]/30 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}

                              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[8px] text-white truncate">
                                {media.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

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
                    {selectedTemplate.adjustments.dateStamp?.enabled && (
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] font-medium text-[#2A2723]">
                        Date Stamp: {selectedTemplate.adjustments.dateStamp.style}
                      </span>
                    )}
                    {selectedTemplate.adjustments.lightLeakType !== 'none' && (
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] font-medium text-[#2A2723]">
                        Light Leak: {selectedTemplate.adjustments.lightLeakType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-white border-t border-[#E6E2D3]">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7E7365] hover:text-[#2A2723]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromTemplate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. CREATE BLANK PROJECT MODAL STEP */}
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

                {userMediaLibrary.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#2A2723] uppercase tracking-wider flex items-center justify-between">
                      <span>Start with Library Media (Optional)</span>
                      {blankProjectMedia && (
                        <button
                          onClick={() => setBlankProjectMedia(null)}
                          className="text-[10px] text-[#7E7365] hover:text-[#2A2723] underline"
                        >
                          Clear selection
                        </button>
                      )}
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white rounded-xl border border-[#E6E2D3] no-scrollbar">
                      {userMediaLibrary.map((media) => {
                        const isSelected = blankProjectMedia?.id === media.id;
                        const isVideo = media.type === 'video';
                        return (
                          <div
                            key={media.id}
                            onClick={() => {
                              soundFx.playHapticTick();
                              setBlankProjectMedia(isSelected ? null : media);
                            }}
                            className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden cursor-pointer border transition-all ${
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
                              <div className="absolute inset-0 bg-[#2A2723]/30 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-[#7E7365]">
                  Initializes a clean project canvas with raw capturing defaults ready for custom adjustments.
                </p>
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
                  Create Blank
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
