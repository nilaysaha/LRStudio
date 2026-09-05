import React, { useRef, useState, useEffect } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, Eye, SplitSquareVertical, Sparkles, Upload,
  RotateCcw, Menu, X, ChevronRight, Sliders, Info, FolderOpen,
  ChevronDown, Video, LayoutGrid, FileText, Package, Layers, Share2,
  CheckCircle2, AlertCircle, Loader2,
  Cloud, LogIn, LogOut, Globe, Flame,
  MessageSquarePlus, PenTool, ExternalLink, Mail
} from 'lucide-react';
import { MediaItem, Project } from '../types';
import { PROJECT_TEMPLATE_TAGS } from '../constants/projectTemplates';
import { soundFx } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';

export type TopMenuTab = 'design' | 'media' | 'marketplace' | 'export' | 'feedback' | 'login';

interface EditorHeaderProps {
  currentMedia: MediaItem | null;
  currentProject?: Project | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  compareMode: 'none' | 'split' | 'hold';
  onToggleCompareSplit: () => void;
  onHoldCompareStart: () => void;
  onHoldCompareEnd: () => void;
  onCopyRecipe: () => void;
  onPasteRecipe: () => void;
  hasCopiedRecipe: boolean;
  onOpenMediaLibrary: () => void;
  onOpenCamera: () => void;
  onOpenRecordVideo?: () => void;
  onOpenCollages?: () => void;
  onOpenPreview?: () => void;
  onOpenExport: (options?: { scope?: 'all-slides' | 'current'; singleFileType?: 'pdf' | 'strip' | 'zip' }) => void;
  onImportMediaFile?: (file: File) => void;
  onOpenProjectsModal?: () => void;
  onOpenTemplatesGallery?: () => void;
  onOpenMarketplace?: () => void;
  onOpenDisclaimer?: () => void;
  onOpenFeedback?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: number | null;
  totalProjectsCount?: number;
  onForceSave?: () => void;
  onReloadFromStorage?: () => void;
  onOpenSignIn?: () => void;
  onLogout?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  currentMedia,
  currentProject,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  compareMode,
  onToggleCompareSplit,
  onHoldCompareStart,
  onHoldCompareEnd,
  onCopyRecipe,
  onPasteRecipe,
  hasCopiedRecipe,
  onOpenMediaLibrary,
  onOpenCamera,
  onOpenRecordVideo,
  onOpenCollages,
  onOpenPreview,
  onOpenExport,
  onImportMediaFile,
  onOpenProjectsModal,
  onOpenTemplatesGallery,
  onOpenMarketplace,
  onOpenDisclaimer,
  onOpenFeedback,
  saveStatus = 'saved',
  lastSavedAt = null,
  totalProjectsCount = 1,
  onForceSave,
  onReloadFromStorage,
  onOpenSignIn,
  onLogout,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TopMenuTab | null>(null);
  const [mobileTab, setMobileTab] = useState<TopMenuTab>('design');
  
  const headerNavRef = useRef<HTMLDivElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const { user, signInWithGoogle, logout } = useAuth();

  // Close active dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerNavRef.current && !headerNavRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    if (activeTab) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [activeTab]);

  const toggleTab = (tab: TopMenuTab) => {
    soundFx.playHapticTick();
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const handleCopy = () => {
    onCopyRecipe();
    soundFx.playHapticTick();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportMediaFile) {
      onImportMediaFile(e.target.files[0]);
    }
    e.target.value = '';
    setIsHamburgerOpen(false);
    setActiveTab(null);
  };

  const closeHamburger = () => {
    setIsHamburgerOpen(false);
  };

  const currentTagInfo = currentProject?.templateTag && currentProject.templateTag !== 'custom'
    ? PROJECT_TEMPLATE_TAGS.find((t) => t.id === currentProject.templateTag)
    : null;

  return (
    <>
      {/* Hidden Native File Input for direct photo/video import */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        onChange={handleMediaFileChange}
        className="hidden"
      />

      <header
        ref={headerNavRef}
        className={`w-full bg-white/95 backdrop-blur-md border-b border-[#E6E2D3] select-none relative shadow-xs transition-all ${
          activeTab || isHamburgerOpen ? 'z-[100]' : 'z-50'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. DESKTOP TABBED TOP BAR (md:flex, hidden on mobile)     */}
        {/* ========================================================= */}
        <div className="hidden md:flex items-center justify-between gap-3 px-4 lg:px-6 py-2.5 w-full">
          
          {/* Left: Brand Identity & Active Project Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 cursor-pointer py-1 group"
              onClick={() => {
                if (onOpenProjectsModal) onOpenProjectsModal();
                soundFx.playHapticTick();
              }}
              title="Open Project Manager"
            >
              <span className="font-editorial text-lg lg:text-xl tracking-[0.2em] font-bold text-[#2A2723] group-hover:text-black transition-colors whitespace-nowrap">
                LUMENLAB
              </span>
              <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] whitespace-nowrap">
                PRO
              </span>
            </div>

            {currentProject && (
              <button
                onClick={() => {
                  soundFx.playHapticTick();
                  if (onOpenProjectsModal) onOpenProjectsModal();
                }}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs text-[#2A2723] font-semibold transition-all cursor-pointer max-w-[190px] shadow-xs group whitespace-nowrap"
                title={`Active Project: ${currentProject.name}. Click to switch.`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#7E7365] group-hover:text-[#2A2723] flex-shrink-0" />
                <span className="truncate text-[11px]">{currentProject.name}</span>
                {currentTagInfo && (
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase flex-shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: currentTagInfo.bgColor,
                      color: currentTagInfo.color,
                    }}
                  >
                    {currentTagInfo.label}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Center: Structured Functional Top-Level Menu Tabs */}
          <nav
            aria-label="Main Studio Navigation"
            className="flex items-center p-1 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] shadow-xs relative"
          >
            {/* Tab 1: Design */}
            <button
              id="top-nav-tab-design"
              type="button"
              onClick={() => toggleTab('design')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'design'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title="Design tools, templates, collages, compare, and recipe controls"
              aria-expanded={activeTab === 'design'}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Design</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'design' ? 'rotate-180' : 'opacity-60'}`} />
            </button>

            {/* Tab 2: Media */}
            <button
              id="top-nav-tab-media"
              type="button"
              onClick={() => toggleTab('media')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'media'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title="Capture, import photo/video, record with analog film, and browse library"
              aria-expanded={activeTab === 'media'}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Media</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'media' ? 'rotate-180' : 'opacity-60'}`} />
            </button>

            {/* Tab 3: Marketplace */}
            <button
              id="header-marketplace-btn"
              type="button"
              onClick={() => toggleTab('marketplace')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'marketplace'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title="Community Marketplace, curated public templates, and sharing policy"
              aria-expanded={activeTab === 'marketplace'}
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>Marketplace</span>
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-amber-400/80 text-amber-950 font-mono">
                Public
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'marketplace' ? 'rotate-180' : 'opacity-60'}`} />
            </button>

            {/* Tab 4: Export */}
            <button
              id="top-nav-tab-export"
              type="button"
              onClick={() => toggleTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'export'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title="Save, export PDF, carousel panorama, ZIP, and cloud sync"
              aria-expanded={activeTab === 'export'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'export' ? 'rotate-180' : 'opacity-60'}`} />
            </button>

            {/* Tab 5: Feedback */}
            <button
              id="header-feedback-btn"
              type="button"
              onClick={() => toggleTab('feedback')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title="Feedback & Feature Requests, Google Forms, and email developers"
              aria-expanded={activeTab === 'feedback'}
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-600" />
              <span>Feedback</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'feedback' ? 'rotate-180' : 'opacity-60'}`} />
            </button>

            {/* Tab 6: Login / Account */}
            <button
              id="top-menu-user-dropdown-btn"
              type="button"
              onClick={() => toggleTab('login')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'login'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
              }`}
              title={user ? `Signed in as ${user.email || user.displayName}. Account & Cloud Storage settings.` : 'Sign in with Google / Guest Session'}
              aria-expanded={activeTab === 'login'}
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-4 h-4 rounded-full object-cover border border-[#E6E2D3]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[9px] flex items-center justify-center border border-amber-300">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{user.displayName || user.email?.split('@')[0] || 'Account'}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Cloud Sync Active" />
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-amber-600" />
                  <span>Login</span>
                </>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeTab === 'login' ? 'rotate-180' : 'opacity-60'}`} />
            </button>
          </nav>

          {/* Right: Quick Studio Tools (Undo, Redo, Quick Split, Quick Save) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Split Screen Shortcut */}
            <button
              onClick={() => {
                onToggleCompareSplit();
                soundFx.playHapticTick();
              }}
              className={`hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                compareMode === 'split'
                  ? 'bg-[#2A2723] text-white border-[#2A2723]'
                  : 'bg-white hover:bg-[#FAF9F6] text-[#4A453E] border-[#E6E2D3]'
              }`}
              title="Toggle Side-by-Side Split Compare"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            {/* Undo */}
            <button
              onClick={() => { onUndo(); soundFx.playHapticTick(); }}
              disabled={!canUndo}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                canUndo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={() => { onRedo(); soundFx.playHapticTick(); }}
              disabled={!canRedo}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                canRedo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-[#E6E2D3] mx-0.5" />

            {/* Cloud Auto-Save Status Indicator */}
            <button
              type="button"
              onClick={() => toggleTab('login')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                saveStatus === 'saving'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : saveStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-white hover:bg-[#FAF9F6] text-[#4A453E] border-[#E6E2D3]'
              }`}
              title={user ? `Cloud Synced (${user.email || user.displayName}). Click to view storage.` : 'Guest Mode (Click to Sign In & sync to Cloud)'}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                  <span className="text-[11px] font-semibold text-amber-900">Saving...</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span className="text-[11px] font-semibold text-rose-700">Save Error</span>
                </>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <Cloud className={`w-3 h-3 ${user ? 'text-emerald-700' : 'text-amber-700'}`} />
                  <span className="text-[11px] text-[#2A2723] font-semibold">
                    {user ? 'Synced' : 'Guest'}
                  </span>
                </>
              )}
            </button>

            {/* Direct Quick Save Button */}
            <button
              type="button"
              onClick={() => {
                onOpenExport();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Save and Export Image / Project"
            >
              <Download className="w-3 h-3 stroke-[2.4]" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP FUNCTIONAL TAB DROPDOWN PANELS                    */}
        {/* ========================================================= */}
        {activeTab && (
          <>
            {/* Click-away backdrop overlay to isolate the menu, dim canvas slightly, and catch outside clicks */}
            <div
              className="hidden md:block fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-150"
              onClick={() => {
                setActiveTab(null);
                soundFx.playHapticTick();
              }}
            />

            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 animate-in fade-in zoom-in-98 duration-150">
            
            {/* 1. DESIGN TAB PANEL */}
            {activeTab === 'design' && (
              <div className="w-[560px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800">
                      <PenTool className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">Design & Studio Canvas</h4>
                      <p className="text-[10px] text-[#7E7365]">Manage active project, templates, collages, and recipe tools</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Active Project Highlight Card */}
                {currentProject && (
                  <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-4 h-4 text-[#2A2723]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#2A2723] truncate max-w-[200px]">
                            {currentProject.name}
                          </span>
                          {currentTagInfo && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase"
                              style={{
                                backgroundColor: currentTagInfo.bgColor,
                                color: currentTagInfo.color,
                              }}
                            >
                              {currentTagInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#7E7365]">
                          {currentProject.collages?.length || 1} slide{(currentProject.collages?.length || 1) > 1 ? 's' : ''} • Total Projects: {totalProjectsCount}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab(null);
                        if (onOpenProjectsModal) onOpenProjectsModal();
                        soundFx.playHapticTick();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E2D3] hover:bg-[#F0EEE6] text-xs font-semibold text-[#2A2723] transition-colors cursor-pointer flex-shrink-0"
                    >
                      Switch Project
                    </button>
                  </div>
                )}

                {/* Primary Design Modules Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {/* LumenLabs Templates */}
                  {onOpenTemplatesGallery && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenTemplatesGallery();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-amber-950 mt-1">Templates Gallery</span>
                      <span className="text-[10px] text-amber-800 leading-tight">Curated starter styles by tag</span>
                    </button>
                  )}

                  {/* Collages & Multi-Grid */}
                  {onOpenCollages && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenCollages();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex flex-col items-start gap-1 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center text-[#2A2723] group-hover:scale-105 transition-transform">
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#2A2723] mt-1">Collages & Layouts</span>
                      <span className="text-[10px] text-[#7E7365] leading-tight">Multi-picture & video layouts</span>
                    </button>
                  )}

                  {/* Presentation Preview */}
                  {onOpenPreview && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenPreview();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex flex-col items-start gap-1 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center text-[#2A2723] group-hover:scale-105 transition-transform">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#2A2723] mt-1">Slide Preview</span>
                      <span className="text-[10px] text-[#7E7365] leading-tight">Fullscreen slide presentation</span>
                    </button>
                  )}
                </div>

                {/* Comparison & Recipe Controls */}
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-[#7E7365] uppercase tracking-wider">
                    Inspection & Film Recipe Tools
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Split Compare */}
                    <button
                      onClick={() => {
                        onToggleCompareSplit();
                        soundFx.playHapticTick();
                      }}
                      className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                        compareMode === 'split'
                          ? 'bg-[#2A2723] text-white border-[#2A2723]'
                          : 'bg-white hover:bg-[#F0EEE6] text-[#2A2723] border-[#E6E2D3]'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">Split Screen</span>
                    </button>

                    {/* Hold Original */}
                    <button
                      onMouseDown={onHoldCompareStart}
                      onMouseUp={onHoldCompareEnd}
                      onMouseLeave={onHoldCompareEnd}
                      onTouchStart={onHoldCompareStart}
                      onTouchEnd={onHoldCompareEnd}
                      className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1 select-none transition-colors cursor-pointer ${
                        compareMode === 'hold'
                          ? 'bg-[#2A2723] text-white border-[#2A2723]'
                          : 'bg-white hover:bg-[#F0EEE6] text-[#2A2723] border-[#E6E2D3]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">Hold Original</span>
                    </button>

                    {/* Copy Recipe */}
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] text-[#2A2723] text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedNotification ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#7E7365]" />
                      )}
                      <span className="text-[11px] font-semibold">
                        {copiedNotification ? 'Copied!' : 'Copy Recipe'}
                      </span>
                    </button>

                    {/* Paste Recipe */}
                    <button
                      onClick={() => {
                        if (hasCopiedRecipe) {
                          onPasteRecipe();
                          soundFx.playHapticTick();
                        }
                      }}
                      disabled={!hasCopiedRecipe}
                      className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors ${
                        hasCopiedRecipe
                          ? 'bg-white hover:bg-[#F0EEE6] text-[#2A2723] border-[#E6E2D3] cursor-pointer'
                          : 'bg-white/50 text-[#C5BDB2] border-[#E6E2D3] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">Paste Recipe</span>
                    </button>
                  </div>

                  {/* Reset All */}
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        onReset();
                        soundFx.playHapticTick();
                      }}
                      className="text-[11px] text-[#7E7365] hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset slide adjustments to baseline</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MEDIA TAB PANEL */}
            {activeTab === 'media' && (
              <div className="w-[480px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-100/70 border border-rose-200 flex items-center justify-center text-rose-700">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">Media & Live Capture</h4>
                      <p className="text-[10px] text-[#7E7365]">Upload, photograph, or record with analog vintage grain</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Active Media Card */}
                {currentMedia && (
                  <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2A2723] truncate max-w-[220px]">
                          {currentMedia.name}
                        </div>
                        <div className="text-[10px] text-[#7E7365]">
                          {currentMedia.type === 'video' ? 'Video asset' : 'Photo asset'} • Aspect ratio: {currentMedia.aspectRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenMediaLibrary();
                        soundFx.playHapticTick();
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#E6E2D3] hover:bg-[#F0EEE6] cursor-pointer"
                    >
                      Change Media
                    </button>
                  </div>
                )}

                {/* Media Actions Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Import Local File */}
                  <button
                    onClick={() => {
                      setActiveTab(null);
                      if (mediaFileInputRef.current) {
                        mediaFileInputRef.current.click();
                        soundFx.playHapticTick();
                      }
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] flex items-start gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[#2A2723] group-hover:scale-105 transition-transform flex-shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2A2723]">Import File</div>
                      <div className="text-[10px] text-[#7E7365] leading-tight mt-0.5">Photo or video from your device</div>
                    </div>
                  </button>

                  {/* WebGL Camera */}
                  <button
                    onClick={() => {
                      setActiveTab(null);
                      onOpenCamera();
                      soundFx.playHapticTick();
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] flex items-start gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[#2A2723] group-hover:scale-105 transition-transform flex-shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2A2723]">Live Camera</div>
                      <div className="text-[10px] text-[#7E7365] leading-tight mt-0.5">Capture with real-time film simulation</div>
                    </div>
                  </button>

                  {/* Record Video */}
                  {onOpenRecordVideo && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenRecordVideo();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 flex items-start gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 group-hover:scale-105 transition-transform flex-shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                          <span>Record Video</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-rose-800 leading-tight mt-0.5">Live analog video recording</div>
                      </div>
                    </button>
                  )}

                  {/* Curated Sample Library */}
                  <button
                    onClick={() => {
                      setActiveTab(null);
                      onOpenMediaLibrary();
                      soundFx.playHapticTick();
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] flex items-start gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[#2A2723] group-hover:scale-105 transition-transform flex-shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2A2723]">Curated Library</div>
                      <div className="text-[10px] text-[#7E7365] leading-tight mt-0.5">Sample editorial photography & clips</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 3. MARKETPLACE TAB PANEL */}
            {activeTab === 'marketplace' && (
              <div className="w-[460px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">Community Marketplace</h4>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950">
                          Public & Free
                        </span>
                      </div>
                      <p className="text-[10px] text-[#7E7365]">Discover, replicate, and share analog creations</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 flex flex-col gap-2">
                  <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
                    Explore public creations from creators around the globe. Replicate any look with 1 click into your personal studio.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab(null);
                      if (onOpenMarketplace) onOpenMarketplace();
                      soundFx.playHapticTick();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-300" />
                    <span>Open Community Marketplace</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onOpenTemplatesGallery && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenTemplatesGallery();
                        soundFx.playHapticTick();
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex items-center gap-2 text-left transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[#2A2723]">Templates</div>
                        <div className="text-[10px] text-[#7E7365]">Browse by tag</div>
                      </div>
                    </button>
                  )}

                  {onOpenDisclaimer && (
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenDisclaimer();
                        soundFx.playHapticTick();
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex items-center gap-2 text-left transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-stone-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[#2A2723]">Transparency</div>
                        <div className="text-[10px] text-[#7E7365]">Free service policy</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. EXPORT TAB PANEL */}
            {activeTab === 'export' && (
              <div className="w-[460px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[#2A2723]">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">Save & Export Options</h4>
                      <p className="text-[10px] text-[#7E7365]">High-resolution image, multi-slide PDF, carousel strip, or ZIP</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Export CTA */}
                <button
                  onClick={() => {
                    setActiveTab(null);
                    onOpenExport();
                    soundFx.playHapticTick();
                  }}
                  className="w-full p-3 rounded-xl bg-[#2A2723] hover:bg-black text-white flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                      <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold">Open Full Export & Share Dialog</div>
                      <div className="text-[10px] text-stone-300">Format, DPI, aspect ratio, & social share</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* Quick 1-File Bundle Formats */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#F0EEE6]">
                  <div className="text-[10px] font-bold text-[#7E7365] uppercase tracking-wider">
                    Quick Multi-Slide Bundles
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenExport({ scope: 'all-slides', singleFileType: 'pdf' });
                        soundFx.playHapticTick();
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                    >
                      <FileText className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold text-[#2A2723]">PDF Document</span>
                      <span className="text-[9px] text-[#7E7365]">All slides</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenExport({ scope: 'all-slides', singleFileType: 'strip' });
                        soundFx.playHapticTick();
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold text-[#2A2723]">Carousel Strip</span>
                      <span className="text-[9px] text-[#7E7365]">Seamless panorama</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onOpenExport({ scope: 'all-slides', singleFileType: 'zip' });
                        soundFx.playHapticTick();
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                    >
                      <Package className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold text-[#2A2723]">ZIP Archive</span>
                      <span className="text-[9px] text-[#7E7365]">Full resolution</span>
                    </button>
                  </div>
                </div>

                {/* Direct Force Save to Firestore Cloud */}
                {onForceSave && (
                  <div className="pt-1 border-t border-[#F0EEE6] flex items-center justify-between">
                    <span className="text-[11px] text-[#7E7365]">
                      Sync status: <strong className="text-[#2A2723]">{user ? 'Live Firestore Sync' : 'Guest mode'}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab(null);
                        onForceSave();
                        soundFx.playHapticTick();
                      }}
                      className="text-xs font-semibold text-[#2A2723] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Force Save Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. FEEDBACK TAB PANEL */}
            {activeTab === 'feedback' && (
              <div className="w-[460px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">Feedback & Requests</h4>
                      <p className="text-[10px] text-[#7E7365]">Google Forms, direct email routing, and feature voting</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Feedback Hub Button */}
                {onOpenFeedback && (
                  <button
                    onClick={() => {
                      setActiveTab(null);
                      onOpenFeedback();
                      soundFx.playHapticTick();
                    }}
                    className="w-full p-3 rounded-xl bg-[#2A2723] hover:bg-black text-white flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                        <MessageSquarePlus className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold">Open Feedback & Feature Requests Hub</div>
                        <div className="text-[10px] text-stone-300">Submit requests, Google Forms, & vote on ideas</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </button>
                )}

                {/* Direct Backend Routing Box */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-800" />
                      <span>Direct Developer Dispatch</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                      Product Team
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-900 leading-tight">
                    Every submission and feature request is automatically routed directly to our engineering backend for review.
                  </p>
                </div>
              </div>
            )}

            {/* 6. LOGIN / ACCOUNT TAB PANEL */}
            {activeTab === 'login' && (
              <div className="w-[380px] bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-[#2A2723]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EEE6]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[#2A2723]">
                      <Cloud className={`w-3.5 h-3.5 ${user ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">
                        {user ? 'Creator Account' : 'Studio Sign In'}
                      </h4>
                      <p className="text-[10px] text-[#7E7365]">Firestore Cloud Sync & Multi-Device Backup</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {user ? (
                  /* User is Logged In */
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-10 h-10 rounded-full object-cover border border-[#E6E2D3]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center border border-amber-300">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#2A2723] truncate">
                          {user.displayName || 'Creator'}
                        </div>
                        <div className="text-[11px] text-[#7E7365] truncate font-mono">
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-semibold text-emerald-800">Cloud Sync Connected</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between text-[#7E7365]">
                        <span>Total Projects:</span>
                        <span className="font-semibold text-[#2A2723] font-mono">{totalProjectsCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#7E7365]">
                        <span>Last Saved:</span>
                        <span className="font-semibold text-[#2A2723] font-mono text-[11px]">
                          {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {onForceSave && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(null);
                            onForceSave();
                            soundFx.playHapticTick();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sync Projects to Cloud</span>
                        </button>
                      )}

                      {onReloadFromStorage && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(null);
                            onReloadFromStorage();
                            soundFx.playHapticTick();
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#7E7365]" />
                          <span>Reload from Cloud</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id="top-header-logout-btn"
                        onClick={() => {
                          setActiveTab(null);
                          logout();
                          if (onLogout) onLogout();
                          soundFx.playHapticTick();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* User is in Guest Mode */
                  <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">Guest Session (Local)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-bold">Temporary</span>
                      </div>
                      <p className="text-[10px] text-amber-900 leading-relaxed">
                        Sign in to automatically save your projects to the cloud, access your presets across all devices, and share recipes with the community.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="top-menu-signin-btn"
                      onClick={() => {
                        setActiveTab(null);
                        soundFx.playHapticTick();
                        if (onOpenSignIn) {
                          onOpenSignIn();
                        } else {
                          signInWithGoogle();
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

        {/* ========================================================= */}
        {/* 2. MOBILE TOP BAR WITH HAMBURGER TRIGGER (md:hidden)      */}
        {/* ========================================================= */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2">
          {/* Brand & Active Project */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenProjectsModal) onOpenProjectsModal();
                else setIsHamburgerOpen(true);
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1.5 text-left focus:outline-none"
            >
              <span className="font-editorial text-base tracking-[0.16em] font-bold text-[#2A2723]">
                LUMENLAB
              </span>
              <span className="text-[8px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                PRO
              </span>
            </button>
          </div>

          {/* Quick Undo/Redo & Save + Hamburger */}
          <div className="flex items-center gap-1.5">
            {/* Compact Undo/Redo */}
            <div className="flex items-center bg-[#FAF9F6] rounded-full border border-[#E6E2D3] p-0.5">
              <button
                onClick={() => { onUndo(); soundFx.playHapticTick(); }}
                disabled={!canUndo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  canUndo ? 'text-[#2A2723] active:bg-[#E6E2D3]' : 'text-[#C5BDB2] opacity-40'
                }`}
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => { onRedo(); soundFx.playHapticTick(); }}
                disabled={!canRedo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  canRedo ? 'text-[#2A2723] active:bg-[#E6E2D3]' : 'text-[#C5BDB2] opacity-40'
                }`}
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Export/Save */}
            <button
              onClick={() => {
                onOpenExport();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs shadow-xs active:scale-95 transition-transform cursor-pointer"
              title="Save & Export"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="text-[11px]">Save</span>
            </button>

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => {
                setIsHamburgerOpen(!isHamburgerOpen);
                soundFx.playHapticTick();
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isHamburgerOpen
                  ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-sm'
                  : 'bg-white hover:bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3] shadow-xs active:scale-95'
              }`}
              aria-label="Toggle Navigation Menu"
              title={isHamburgerOpen ? 'Close Menu' : 'Open Functional Menu'}
            >
              {isHamburgerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. FUNCTIONAL TABBED MOBILE DRAWER (md:hidden)            */}
      {/* ========================================================= */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeHamburger}
          />

          {/* Drawer Container (Top-Down Slide) */}
          <div className="relative bg-white border-b border-[#E6E2D3] shadow-2xl w-full max-h-[90vh] overflow-y-auto z-10 animate-in slide-in-from-top-4 duration-200 flex flex-col p-4 gap-3.5">
            {/* Drawer Top Row */}
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EEE6]">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-lg tracking-[0.18em] font-bold text-[#2A2723]">
                  LUMENLAB
                </span>
                <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                  MENU
                </span>
              </div>

              <button
                onClick={() => {
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] flex items-center justify-center hover:bg-[#F0EEE6] active:scale-95"
                aria-label="Close Hamburger Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Tab Navigation Bar */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#FAF9F6] border border-[#E6E2D3]">
              {(['design', 'media', 'marketplace', 'export', 'feedback', 'login'] as TopMenuTab[]).map((tabKey) => {
                const labels: Record<TopMenuTab, string> = {
                  design: 'Design',
                  media: 'Media',
                  marketplace: 'Marketplace',
                  export: 'Export',
                  feedback: 'Feedback',
                  login: user ? 'Account' : 'Login',
                };
                const isSelected = mobileTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => {
                      setMobileTab(tabKey);
                      soundFx.playHapticTick();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#2A2723] text-white shadow-xs'
                        : 'text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    {labels[tabKey]}
                  </button>
                );
              })}
            </div>

            {/* MOBILE TAB 1: DESIGN */}
            {mobileTab === 'design' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                {currentProject && (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2A2723] truncate">{currentProject.name}</div>
                      <div className="text-[10px] text-[#7E7365]">{currentProject.collages?.length || 1} slide(s)</div>
                    </div>
                    <button
                      onClick={() => {
                        closeHamburger();
                        if (onOpenProjectsModal) onOpenProjectsModal();
                        soundFx.playHapticTick();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E2D3] text-xs font-semibold text-[#2A2723]"
                    >
                      Projects
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {onOpenTemplatesGallery && (
                    <button
                      onClick={() => {
                        closeHamburger();
                        onOpenTemplatesGallery();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left flex flex-col gap-1"
                    >
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-950">Templates</span>
                      <span className="text-[10px] text-amber-800">Browse presets</span>
                    </button>
                  )}

                  {onOpenCollages && (
                    <button
                      onClick={() => {
                        closeHamburger();
                        onOpenCollages();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] text-left flex flex-col gap-1"
                    >
                      <LayoutGrid className="w-4 h-4 text-[#2A2723]" />
                      <span className="text-xs font-bold text-[#2A2723]">Collages</span>
                      <span className="text-[10px] text-[#7E7365]">Multi-frame formats</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onToggleCompareSplit();
                      soundFx.playHapticTick();
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 ${
                      compareMode === 'split' ? 'bg-[#2A2723] text-white border-[#2A2723]' : 'bg-[#FAF9F6] border-[#E6E2D3]'
                    }`}
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                    <span className="text-xs font-bold">Split Compare</span>
                    <span className="text-[10px] opacity-80">Side by side</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] text-left flex flex-col gap-1"
                  >
                    <Copy className="w-4 h-4 text-[#7E7365]" />
                    <span className="text-xs font-bold text-[#2A2723]">
                      {copiedNotification ? 'Copied!' : 'Copy Recipe'}
                    </span>
                    <span className="text-[10px] text-[#7E7365]">Save recipe parameters</span>
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE TAB 2: MEDIA */}
            {mobileTab === 'media' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      closeHamburger();
                      if (mediaFileInputRef.current) mediaFileInputRef.current.click();
                      soundFx.playHapticTick();
                    }}
                    className="p-3 rounded-xl bg-white border border-[#E6E2D3] text-left flex flex-col gap-1"
                  >
                    <Upload className="w-4 h-4 text-[#2A2723]" />
                    <span className="text-xs font-bold text-[#2A2723]">Import File</span>
                    <span className="text-[10px] text-[#7E7365]">Photos & videos</span>
                  </button>

                  <button
                    onClick={() => {
                      closeHamburger();
                      onOpenCamera();
                      soundFx.playHapticTick();
                    }}
                    className="p-3 rounded-xl bg-white border border-[#E6E2D3] text-left flex flex-col gap-1"
                  >
                    <Camera className="w-4 h-4 text-[#2A2723]" />
                    <span className="text-xs font-bold text-[#2A2723]">Camera</span>
                    <span className="text-[10px] text-[#7E7365]">Live WebGL filter</span>
                  </button>

                  {onOpenRecordVideo && (
                    <button
                      onClick={() => {
                        closeHamburger();
                        onOpenRecordVideo();
                        soundFx.playHapticTick();
                      }}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-left flex flex-col gap-1"
                    >
                      <Video className="w-4 h-4 text-rose-700" />
                      <span className="text-xs font-bold text-rose-950">Record Video</span>
                      <span className="text-[10px] text-rose-800">Analog grain capture</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      closeHamburger();
                      onOpenMediaLibrary();
                      soundFx.playHapticTick();
                    }}
                    className="p-3 rounded-xl bg-white border border-[#E6E2D3] text-left flex flex-col gap-1"
                  >
                    <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                    <span className="text-xs font-bold text-[#2A2723]">Library</span>
                    <span className="text-[10px] text-[#7E7365]">Curated samples</span>
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE TAB 3: MARKETPLACE */}
            {mobileTab === 'marketplace' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                    <Globe className="w-4 h-4 text-amber-700" />
                    <span>Public Community Marketplace</span>
                  </div>
                  <p className="text-[10px] text-amber-900 leading-relaxed">
                    Explore community projects and replicate their film recipes into your studio.
                  </p>
                  <button
                    onClick={() => {
                      closeHamburger();
                      if (onOpenMarketplace) onOpenMarketplace();
                      soundFx.playHapticTick();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#2A2723] text-white text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Community Marketplace</span>
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE TAB 4: EXPORT */}
            {mobileTab === 'export' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                <button
                  onClick={() => {
                    closeHamburger();
                    onOpenExport();
                    soundFx.playHapticTick();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2A2723] text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Open Full Export & Share Dialog</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      closeHamburger();
                      onOpenExport({ scope: 'all-slides', singleFileType: 'pdf' });
                      soundFx.playHapticTick();
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center gap-1 text-center"
                  >
                    <FileText className="w-4 h-4 text-amber-800" />
                    <span className="text-xs font-bold text-amber-950">PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      closeHamburger();
                      onOpenExport({ scope: 'all-slides', singleFileType: 'strip' });
                      soundFx.playHapticTick();
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center gap-1 text-center"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-800" />
                    <span className="text-xs font-bold text-amber-950">Strip</span>
                  </button>

                  <button
                    onClick={() => {
                      closeHamburger();
                      onOpenExport({ scope: 'all-slides', singleFileType: 'zip' });
                      soundFx.playHapticTick();
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center gap-1 text-center"
                  >
                    <Package className="w-4 h-4 text-amber-800" />
                    <span className="text-xs font-bold text-amber-950">ZIP</span>
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE TAB 5: FEEDBACK */}
            {mobileTab === 'feedback' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                {onOpenFeedback && (
                  <button
                    id="mobile-menu-feedback-btn"
                    onClick={() => {
                      closeHamburger();
                      onOpenFeedback();
                      soundFx.playHapticTick();
                    }}
                    className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs font-semibold text-amber-950"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquarePlus className="w-4 h-4 text-amber-700" />
                      <span>Feedback & Feature Requests</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">Open</span>
                  </button>
                )}

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] text-xs flex flex-col gap-1">
                  <div className="font-bold text-[#2A2723]">Developer Support</div>
                  <div className="text-[10px] text-[#7E7365]">Submissions are securely routed and processed via backend dispatch.</div>
                </div>
              </div>
            )}

            {/* MOBILE TAB 6: LOGIN / ACCOUNT */}
            {mobileTab === 'login' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                {user ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3]">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-sm">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#2A2723] truncate">{user.displayName || 'Creator'}</div>
                        <div className="text-[10px] text-[#7E7365] truncate font-mono">{user.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        if (onLogout) onLogout();
                        closeHamburger();
                        soundFx.playHapticTick();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs text-[#7E7365] leading-relaxed">
                      Sign in with Google to sync your projects and custom recipes across all devices.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeHamburger();
                        soundFx.playHapticTick();
                        if (onOpenSignIn) onOpenSignIn();
                        else signInWithGoogle();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#2A2723] text-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4 text-amber-400" />
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
