import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, Eye, SplitSquareVertical, Sparkles, Upload,
  RotateCcw, Menu, X, ChevronLeft, ChevronRight, Sliders, Info, FolderOpen,
  Plus, ChevronDown, Video, LayoutGrid, FileText, Package, Layers, Share2,
  Maximize2, Minimize2, Database, CheckCircle2, HardDrive, AlertCircle, Loader2, Clock,
  Cloud, CloudRain, LogIn, LogOut, User as UserIcon, ShieldCheck
} from 'lucide-react';
import { MediaItem, Project } from '../types';
import { PROJECT_TEMPLATE_TAGS } from '../constants/projectTemplates';
import { soundFx } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';

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
  saveStatus = 'saved',
  lastSavedAt = null,
  totalProjectsCount = 1,
  onForceSave,
  onReloadFromStorage,
  onOpenSignIn,
  onLogout,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isStorageMenuOpen, setIsStorageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const storageMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const { user, loading: isAuthLoading, signInWithGoogle, logout } = useAuth();

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setIsSaveMenuOpen(false);
      }
      if (storageMenuRef.current && !storageMenuRef.current.contains(e.target as Node)) {
        setIsStorageMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isSaveMenuOpen || isStorageMenuOpen || isUserMenuOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isSaveMenuOpen, isStorageMenuOpen, isUserMenuOpen]);

  // Desktop horizontal scroll management
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Check scroll position and boundaries
  const updateScrollState = useCallback(() => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = desktopScrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const observer = new ResizeObserver(() => {
      updateScrollState();
    });
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  // Seamless horizontal mouse wheel handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = desktopScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  // Scroll left/right button handlers
  const scrollByAmount = (amount: number) => {
    const el = desktopScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    soundFx.playHapticTick();
  };

  // Mouse drag-to-scroll support
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, select')) return;
    const el = desktopScrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = desktopScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
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

      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#E6E2D3] z-30 select-none relative shadow-xs">
        {/* ========================================================= */}
        {/* 1. DESKTOP & TABLET TOP BAR (md:flex, hidden on mobile) */}
        {/* ========================================================= */}
        <div className="hidden md:block relative w-full group/header">
          {/* Left Scroll Chevron & Gradient Fade */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-6 bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none pl-1">
              <button
                type="button"
                onClick={() => scrollByAmount(-240)}
                className="w-7 h-7 rounded-full bg-white/95 hover:bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] shadow-md flex items-center justify-center pointer-events-auto active:scale-95 transition-all cursor-pointer"
                title="Scroll menu left"
                aria-label="Scroll menu left"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          )}

          {/* Right Scroll Chevron & Gradient Fade */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-6 bg-gradient-to-l from-white via-white/90 to-transparent pointer-events-none pr-1">
              <button
                type="button"
                onClick={() => scrollByAmount(240)}
                className="w-7 h-7 rounded-full bg-white/95 hover:bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] shadow-md flex items-center justify-center pointer-events-auto active:scale-95 transition-all cursor-pointer"
                title="Scroll to see more menu items"
                aria-label="Scroll menu right"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          )}

          {/* Main Scrollable Track */}
          <div
            ref={desktopScrollRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`w-full overflow-x-auto no-scrollbar scroll-smooth px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 ${
              isDragging ? 'cursor-grabbing' : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between gap-4 min-w-max w-full">
              {/* Brand & Project Selector */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div
                  className="flex items-center gap-2 cursor-pointer py-1 group"
                  onClick={onOpenProjectsModal}
                >
                  <span className="font-editorial text-lg lg:text-xl tracking-[0.2em] font-bold text-[#2A2723] group-hover:text-black transition-colors whitespace-nowrap">
                    LUMENLAB
                  </span>
                  <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] whitespace-nowrap">
                    PRO
                  </span>
                </div>

                {/* Current Project Pill Button */}
                {currentProject && onOpenProjectsModal && (
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      onOpenProjectsModal();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs text-[#2A2723] font-semibold transition-all cursor-pointer max-w-[210px] shadow-xs group flex-shrink-0 whitespace-nowrap"
                    title="Manage projects or pick LumenLabs templates"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[#7E7365] group-hover:text-[#2A2723] flex-shrink-0" />
                    <span className="truncate">{currentProject.name}</span>
                    {currentTagInfo && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase flex-shrink-0 whitespace-nowrap"
                        style={{
                          backgroundColor: currentTagInfo.bgColor,
                          color: currentTagInfo.color,
                        }}
                      >
                        {currentTagInfo.label}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-[#7E7365] flex-shrink-0" />
                  </button>
                )}

                {/* Quick LumenLabs Templates Explore Button */}
                {onOpenTemplatesGallery && (
                  <button
                    onClick={() => {
                      soundFx.playHapticTick();
                      onOpenTemplatesGallery();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-900 transition-colors cursor-pointer shadow-xs flex-shrink-0 whitespace-nowrap"
                    title="Browse LumenLabs Templates by tag"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Templates</span>
                  </button>
                )}

                {/* Auto-Save & Cloud Status Indicator Pill */}
                <div className="relative flex-shrink-0" ref={storageMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStorageMenuOpen((prev) => !prev);
                      soundFx.playHapticTick();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-xs select-none whitespace-nowrap ${
                      saveStatus === 'saving'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : saveStatus === 'error'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#4A453E] border-[#E6E2D3]'
                    }`}
                    title={user ? `Cloud Synced (${user.email || user.displayName})` : 'Guest Session (Sign in to sync with Cloud)'}
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
                        <div className={`w-1.5 h-1.5 rounded-full shadow-xs ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <Cloud className={`w-3 h-3 ${user ? 'text-emerald-700' : 'text-amber-700'}`} />
                        <span className="text-[11px] text-[#2A2723] font-semibold">
                          {user ? 'Cloud Synced' : 'Guest Mode'}
                        </span>
                      </>
                    )}
                    <ChevronDown className={`w-2.5 h-2.5 text-[#7E7365] transition-transform ${isStorageMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Storage Status Popover Dropdown */}
                  {isStorageMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 text-[#2A2723]">
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0EEE6]">
                        <div className="flex items-center gap-1.5">
                          <Cloud className={`w-3.5 h-3.5 ${user ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#2A2723]">
                            Studio Cloud Storage
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          user
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}>
                          {user ? 'Cloud Connected' : 'Guest (Session Only)'}
                        </span>
                      </div>

                      {/* Cloud Sync Row */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                            <Cloud className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-[#2A2723] text-[11px] flex items-center gap-1">
                              <span>Studio Cloud Sync</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/80 text-amber-950 font-mono">Live</span>
                            </div>
                            <div className="text-[10px] text-[#7E7365]">
                              {user ? `User: ${user.email || user.displayName || user.uid.substring(0, 8)}` : 'Sign in to map projects to your user account'}
                            </div>
                          </div>
                        </div>
                        {user ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            Live
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsStorageMenuOpen(false);
                              signInWithGoogle();
                            }}
                            className="px-2 py-0.5 rounded-full bg-[#2A2723] hover:bg-black text-white text-[10px] font-bold transition-transform active:scale-95 cursor-pointer"
                          >
                            Sign In
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs text-[#7E7365] bg-[#FAF9F6] p-2 rounded-xl border border-[#E6E2D3]/60">
                        <div className="flex justify-between items-center">
                          <span>Active Project:</span>
                          <span className="font-semibold text-[#2A2723] truncate max-w-[130px]">
                            {currentProject?.name || 'Untitled'}
                          </span>
                        </div>
                        {currentProject?.collages && currentProject.collages.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span>Project Slides / Pages:</span>
                            <span className="font-semibold text-[#2A2723] font-mono">
                              {currentProject.collages.length}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span>Total Projects:</span>
                          <span className="font-semibold text-[#2A2723] font-mono">
                            {totalProjectsCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Last Cloud Sync:</span>
                          <span className="font-semibold text-[#2A2723] font-mono text-[11px]">
                            {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex flex-col gap-1.5">
                        {onForceSave && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsStorageMenuOpen(false);
                              onForceSave();
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Force Save to Cloud</span>
                          </button>
                        )}

                        {onReloadFromStorage && user && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsStorageMenuOpen(false);
                              onReloadFromStorage();
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#4A453E] hover:text-[#2A2723] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#E6E2D3] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#7E7365]" />
                            <span>Reload Projects from Cloud</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Quick Tool Actions (Undo, Redo, Compare, Recipe) */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Undo */}
                <button
                  onClick={() => { onUndo(); soundFx.playHapticTick(); }}
                  disabled={!canUndo}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    canUndo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
                  }`}
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                {/* Redo */}
                <button
                  onClick={() => { onRedo(); soundFx.playHapticTick(); }}
                  disabled={!canRedo}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    canRedo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
                  }`}
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>

                <div className="h-4 w-[1px] bg-[#E6E2D3] mx-1" />

                {/* Split Screen Compare */}
                <button
                  onClick={() => { onToggleCompareSplit(); soundFx.playHapticTick(); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    compareMode === 'split'
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'text-[#4A453E] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                  }`}
                  title="Toggle Split Compare"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>

                {/* Hold Compare */}
                <button
                  onMouseDown={onHoldCompareStart}
                  onMouseUp={onHoldCompareEnd}
                  onMouseLeave={onHoldCompareEnd}
                  onTouchStart={onHoldCompareStart}
                  onTouchEnd={onHoldCompareEnd}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E6E2D3] transition-all select-none whitespace-nowrap ${
                    compareMode === 'hold'
                      ? 'bg-[#2A2723] text-white ring-2 ring-[#2A2723]'
                      : 'text-[#4A453E] hover:bg-[#F0EEE6]'
                  }`}
                  title="Hold to see original unedited image"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hold</span>
                </button>

                {/* Copy Recipe */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 p-2 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors"
                  title="Copy Recipe"
                >
                  {copiedNotification ? <Check className="w-4 h-4 text-[#437A47]" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* Paste Recipe */}
                {hasCopiedRecipe && (
                  <button
                    onClick={() => { onPasteRecipe(); soundFx.playHapticTick(); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] text-xs text-[#2A2723] border border-[#E6E2D3] transition-colors whitespace-nowrap"
                    title="Paste Copied Recipe"
                  >
                    <Sparkles className="w-3 h-3 text-[#2A2723]" />
                    <span className="text-[11px] font-medium">Paste</span>
                  </button>
                )}
              </div>

              {/* Right Primary Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Collages & Templates Button */}
                {onOpenCollages && (
                  <button
                    onClick={() => {
                      onOpenCollages();
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Browse & customize multi-picture & multi-video collage formats"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-[#2A2723]" />
                    <span>Collages</span>
                    <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full">
                      Multi
                    </span>
                  </button>
                )}

                {/* Record Video Button */}
                {onOpenRecordVideo && (
                  <button
                    onClick={() => {
                      onOpenRecordVideo();
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-900 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Start live camera video recording with analog film effects"
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    <Video className="w-3.5 h-3.5 text-rose-700" />
                    <span>Record Video</span>
                  </button>
                )}

                {/* Import Media */}
                <button
                  onClick={() => {
                    if (mediaFileInputRef.current) {
                      mediaFileInputRef.current.click();
                      soundFx.playHapticTick();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#2A2723]/30 text-xs font-semibold text-[#2A2723] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="Import Photo or Video from device"
                >
                  <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
                  <span>Import</span>
                </button>

                {/* Camera */}
                <button
                  onClick={() => { onOpenCamera(); soundFx.playHapticTick(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="Open Live WebGL Camera"
                >
                  <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
                  <span>Camera</span>
                </button>

                {/* Library */}
                <button
                  onClick={() => { onOpenMediaLibrary(); soundFx.playHapticTick(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="Open Curated Media Library"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
                  <span>Library</span>
                </button>

                {/* Slide Preview Button */}
                {onOpenPreview && (
                  <button
                    onClick={() => {
                      onOpenPreview();
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/80 hover:bg-amber-200 border border-amber-300 text-xs font-bold text-amber-950 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Open Fullscreen Slide Carousel & Presentation Preview"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-900" />
                    <span>Preview</span>
                  </button>
                )}

                {/* Save & Project Export Split Button */}
                <div className="relative flex items-center" ref={saveMenuRef}>
                  {/* Primary Save Button (Opens Export Modal directly) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSaveMenuOpen(false);
                      onOpenExport();
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-l-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Save and Export (Open Export Dialog)"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                    <span>Save</span>
                  </button>

                  {/* Dropdown Toggle for Quick Formats */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSaveMenuOpen((prev) => !prev);
                      soundFx.playHapticTick();
                    }}
                    className={`pl-1 pr-2.5 py-1.5 rounded-r-full border-l border-white/20 font-semibold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                      isSaveMenuOpen
                        ? 'bg-black text-amber-400'
                        : 'bg-[#2A2723] hover:bg-black text-white'
                    }`}
                    title="Quick Project Export Options (PDF, Carousel Strip, ZIP)"
                    aria-expanded={isSaveMenuOpen}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isSaveMenuOpen ? 'rotate-180 text-amber-400' : 'text-neutral-300'}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isSaveMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2 flex flex-col gap-1.5 select-none text-[#2A2723]">
                      {/* Dropdown Header */}
                      <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#F0EEE6]">
                        <div className="flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-[#2A2723]" />
                          <span className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase">
                            Save & Export Options
                          </span>
                        </div>
                        {currentProject?.collages && currentProject.collages.length > 1 && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold border border-amber-200">
                            {currentProject.collages.length} Slides
                          </span>
                        )}
                      </div>

                      {/* Option 1: Save Current Media / Slide */}
                      <button
                        onClick={() => {
                          setIsSaveMenuOpen(false);
                          onOpenExport({ scope: 'current' });
                          soundFx.playHapticTick();
                        }}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#FAF9F6] active:bg-[#F0EEE6] transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E6E2D3] group-hover:border-[#2A2723] flex items-center justify-center flex-shrink-0 transition-colors">
                          <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#2A2723] flex items-center justify-between">
                            <span>Save Current Frame / Image</span>
                            <span className="text-[9px] text-[#7E7365] font-normal font-mono">JPG/PNG</span>
                          </div>
                          <p className="text-[10px] text-[#7E7365] leading-tight mt-0.5 truncate">
                            {currentMedia?.type === 'video' ? 'Export graded video' : 'Export active slide or single photo'}
                          </p>
                        </div>
                      </button>

                      {/* Section 2: Project Export (Single File) */}
                      <div className="pt-1.5 border-t border-[#F0EEE6] flex flex-col gap-1">
                        <div className="px-2.5 py-0.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-amber-700" />
                            <span className="text-[10px] font-bold tracking-wider text-amber-900 uppercase">
                              Project Export (Single File)
                            </span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-900 font-semibold">1 File</span>
                        </div>

                        {/* 1. Multi-Page PDF Document */}
                        <button
                          onClick={() => {
                            setIsSaveMenuOpen(false);
                            onOpenExport({ scope: 'all-slides', singleFileType: 'pdf' });
                            soundFx.playHapticTick();
                          }}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-50/70 active:bg-amber-100/70 transition-colors text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100/60 border border-amber-200 group-hover:border-amber-400 flex items-center justify-center flex-shrink-0 transition-colors">
                            <FileText className="w-4 h-4 text-amber-800" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#2A2723] flex items-center justify-between">
                              <span>Multi-Page PDF</span>
                              <span className="text-[9px] font-mono text-amber-900 font-semibold">.pdf</span>
                            </div>
                            <p className="text-[10px] text-[#7E7365] leading-tight mt-0.5">
                              All project slides compiled into a single document
                            </p>
                          </div>
                        </button>

                        {/* 2. Seamless Panoramic Carousel Strip */}
                        <button
                          onClick={() => {
                            setIsSaveMenuOpen(false);
                            onOpenExport({ scope: 'all-slides', singleFileType: 'strip' });
                            soundFx.playHapticTick();
                          }}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-50/70 active:bg-amber-100/70 transition-colors text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100/60 border border-amber-200 group-hover:border-amber-400 flex items-center justify-center flex-shrink-0 transition-colors">
                            <ImageIcon className="w-4 h-4 text-amber-800" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#2A2723] flex items-center justify-between">
                              <span>Carousel Strip</span>
                              <span className="text-[9px] font-mono text-amber-900 font-semibold">.jpg</span>
                            </div>
                            <p className="text-[10px] text-[#7E7365] leading-tight mt-0.5">
                              Single continuous image for seamless swipe posts
                            </p>
                          </div>
                        </button>

                        {/* 3. Project ZIP Archive */}
                        <button
                          onClick={() => {
                            setIsSaveMenuOpen(false);
                            onOpenExport({ scope: 'all-slides', singleFileType: 'zip' });
                            soundFx.playHapticTick();
                          }}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-50/70 active:bg-amber-100/70 transition-colors text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100/60 border border-amber-200 group-hover:border-amber-400 flex items-center justify-center flex-shrink-0 transition-colors">
                            <Package className="w-4 h-4 text-amber-800" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#2A2723] flex items-center justify-between">
                              <span>Project ZIP Archive</span>
                              <span className="text-[9px] font-mono text-amber-900 font-semibold">.zip</span>
                            </div>
                            <p className="text-[10px] text-[#7E7365] leading-tight mt-0.5">
                              All slide images bundled into one single ZIP file
                            </p>
                          </div>
                        </button>
                      </div>

                      {/* Section 3: Advanced Export & Social Share */}
                      <div className="pt-1.5 border-t border-[#F0EEE6]">
                        <button
                          onClick={() => {
                            setIsSaveMenuOpen(false);
                            onOpenExport();
                            soundFx.playHapticTick();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] active:scale-98 transition-all text-xs font-semibold text-[#2A2723] cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Share2 className="w-3.5 h-3.5 text-[#7E7365]" />
                            <span>All Export & Share Settings...</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#7E7365]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Firebase User Profile / Google Sign-In Button */}
                <div className="relative flex items-center gap-1.5" ref={userMenuRef}>
                  {user ? (
                    <>
                      <button
                        type="button"
                        id="top-menu-user-dropdown-btn"
                        onClick={() => {
                          setIsUserMenuOpen(!isUserMenuOpen);
                          soundFx.playHapticTick();
                        }}
                        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        title={`Signed in as ${user.email || user.displayName}. Click to open menu`}
                      >
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-5 h-5 rounded-full object-cover border border-[#E6E2D3]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center border border-amber-300">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col items-start leading-none text-left">
                          <span className="text-[11px] font-bold text-[#2A2723] max-w-[120px] sm:max-w-[150px] truncate">
                            {user.email || user.displayName || 'Creator'}
                          </span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Cloud Sync Active" />
                        <ChevronDown className={`w-3.5 h-3.5 text-[#7E7365] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Explicit Logout Icon Button (Visible only when logged in) */}
                      <button
                        type="button"
                        id="top-header-logout-btn"
                        onClick={() => {
                          soundFx.playHapticTick();
                          setIsUserMenuOpen(false);
                          logout();
                          if (onLogout) {
                            onLogout();
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 text-rose-700 text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        title={`Log Out (${user.email || user.displayName || 'Account'})`}
                        aria-label="Log Out"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span className="hidden lg:inline text-[11px]">Log Out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      id="top-menu-signin-btn"
                      onClick={() => {
                        soundFx.playHapticTick();
                        if (onOpenSignIn) {
                          onOpenSignIn();
                        } else {
                          signInWithGoogle();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      title="Sign in to sync your projects and media across devices"
                    >
                      <LogIn className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sign In</span>
                    </button>
                  )}

                  {/* User Profile Dropdown */}
                  {isUserMenuOpen && user && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E6E2D3] rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 text-[#2A2723]">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#F0EEE6]">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-9 h-9 rounded-full object-cover border border-[#E6E2D3]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center border border-amber-300">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#2A2723] truncate">
                            {user.displayName || 'LumenLab Creator'}
                          </div>
                          <div className="text-[11px] text-[#7E7365] truncate font-mono font-medium">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      {/* Cloud Info */}
                      <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#2A2723]">
                          <span className="flex items-center gap-1">
                            <Cloud className="w-3.5 h-3.5 text-amber-800" />
                            Studio Cloud Storage
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                            Active
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7E7365] flex items-center justify-between">
                          <span>Status:</span>
                          <span className="font-mono text-[#2A2723]">Live Connected</span>
                        </div>
                        <div className="text-[10px] text-[#7E7365] flex items-center justify-between">
                          <span>Sync Mode:</span>
                          <span className="font-mono text-[#2A2723] truncate max-w-[120px]">Real-Time Cloud</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        {onForceSave && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onForceSave();
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E6E2D3] transition-colors cursor-pointer"
                          >
                            <Cloud className="w-3.5 h-3.5 text-amber-800" />
                            <span>Sync Projects to Cloud</span>
                          </button>
                        )}
                        <button
                          type="button"
                          id="dropdown-logout-action-btn"
                          onClick={() => {
                            soundFx.playHapticTick();
                            setIsUserMenuOpen(false);
                            logout();
                            if (onLogout) {
                              onLogout();
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-rose-50/70 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-xs"
                          title="Sign out of your account"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>Log Out ({user.email ? user.email.split('@')[0] : 'Account'})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Right Sidebar / Canvas Space Toggle Button */}
                {onToggleSidebarCollapse && (
                  <button
                    type="button"
                    id="top-header-toggle-sidebar-btn"
                    onClick={() => {
                      soundFx.playHapticTick();
                      onToggleSidebarCollapse();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      isSidebarCollapsed
                        ? 'bg-[#2A2723] text-white border-black hover:bg-black'
                        : 'bg-[#FAF9F6] text-[#4A453E] border-[#E6E2D3] hover:bg-[#F0EEE6] hover:text-[#2A2723]'
                    }`}
                    title={isSidebarCollapsed ? "Expand Tools Panel (\\)" : "Collapse Sidebar for Full Canvas Design (\\)"}
                  >
                    {isSidebarCollapsed ? (
                      <>
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>Show Tools</span>
                        <span className="text-[10px] text-amber-300 font-mono bg-white/10 px-1 rounded">\</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-[#7E7365]" />
                        <span className="hidden lg:inline">Max Canvas</span>
                        <span className="text-[10px] text-[#A39989] font-mono bg-[#EFECE6] px-1 rounded">\</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. COLLAPSED MOBILE TOP BAR WITH HAMBURGER MENU (md:hidden) */}
        {/* ========================================================= */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
          {/* Left: Compact Brand + Project / Media badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenProjectsModal) {
                  onOpenProjectsModal();
                } else {
                  setIsHamburgerOpen(true);
                }
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

            {currentProject && (
              <button
                onClick={() => {
                  if (onOpenProjectsModal) onOpenProjectsModal();
                  soundFx.playHapticTick();
                }}
                className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] text-[#4A453E] max-w-[110px] truncate"
                title="Current Project"
              >
                <FolderOpen className="w-2.5 h-2.5 flex-shrink-0 text-[#7E7365]" />
                <span className="truncate">{currentProject.name}</span>
              </button>
            )}
          </div>

          {/* Center/Right: Quick Undo/Redo & Save + Collapsed Hamburger Button */}
          <div className="flex items-center gap-1.5">
            {/* Mobile Compact DB Status Pill */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] select-none ${
                saveStatus === 'saving'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : saveStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-[#FAF9F6] text-[#4A453E] border-[#E6E2D3]'
              }`}
              title={user ? 'Direct Cloud Sync' : 'Guest Mode (Sign in to sync)'}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 text-amber-600 animate-spin" />
                  <span className="text-[9px] text-amber-900 font-semibold">Saving</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                  <span className="text-[9px] text-rose-700 font-semibold">Error</span>
                </>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'} shadow-xs`} />
                  <Cloud className={`w-2.5 h-2.5 ${user ? 'text-emerald-700' : 'text-amber-700'}`} />
                  <span className="text-[9px] font-semibold text-[#2A2723]">{user ? 'Synced' : 'Guest'}</span>
                </>
              )}
            </div>

            {/* Compact Undo / Redo */}
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

            {/* Quick Preview Button */}
            {onOpenPreview && (
              <button
                onClick={() => { onOpenPreview(); soundFx.playHapticTick(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs shadow-xs active:scale-95 transition-transform"
                title="Preview Slides"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px]">Preview</span>
              </button>
            )}

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

            {/* Mobile Top Bar Sign In Button (When not logged in) */}
            {!user && (
              <button
                type="button"
                id="mobile-top-bar-signin-btn"
                onClick={() => {
                  soundFx.playHapticTick();
                  if (onOpenSignIn) {
                    onOpenSignIn();
                  } else {
                    signInWithGoogle();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white text-xs font-semibold shadow-xs active:scale-95 transition-transform cursor-pointer"
                title="Sign In to sync projects"
              >
                <LogIn className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">Sign In</span>
              </button>
            )}

            {/* Collapsed Hamburger Menu Trigger */}
            <button
              onClick={() => {
                setIsHamburgerOpen(!isHamburgerOpen);
                soundFx.playHapticTick();
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                isHamburgerOpen
                  ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-sm'
                  : 'bg-white hover:bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3] shadow-xs active:scale-95'
              }`}
              aria-label="Toggle Navigation Menu"
              title={isHamburgerOpen ? 'Close Menu' : 'Open Menu'}
            >
              {isHamburgerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. COLLAPSED MOBILE HAMBURGER MENU DRAWER / SLIDE-OVER */}
      {/* ========================================================= */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeHamburger}
          />

          {/* Drawer Container (Top-Down Slide) */}
          <div className="relative bg-white border-b border-[#E6E2D3] shadow-2xl w-full max-h-[88vh] overflow-y-auto z-10 animate-in slide-in-from-top-4 duration-200 flex flex-col p-4 gap-4">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE6]">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-lg tracking-[0.18em] font-bold text-[#2A2723]">
                  LUMENLAB
                </span>
                <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                  STUDIO MENU
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

            {/* Cloud User Account Card in Mobile Drawer */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-amber-800" />
                  <span className="text-[11px] font-bold text-[#2A2723] uppercase tracking-wider">
                    Studio Cloud Storage
                  </span>
                </div>
                {user ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950">
                    Guest Mode
                  </span>
                )}
              </div>

              {user ? (
                <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                  <div className="flex items-center gap-2 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-7 h-7 rounded-full object-cover border border-amber-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center border border-amber-300">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2A2723] truncate">
                        {user.displayName || 'Creator'}
                      </div>
                      <div className="text-[10px] text-[#7E7365] truncate font-mono">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      logout();
                      if (onLogout) {
                        onLogout();
                      }
                      closeHamburger();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                    title="Sign Out / Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="pt-1 flex flex-col gap-1.5">
                  <p className="text-[10px] text-[#7E7365]">
                    Sign in with Google or your email to sync your projects and custom presets to Studio Cloud in real time.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSignIn) {
                        onOpenSignIn();
                      } else {
                        signInWithGoogle();
                      }
                      closeHamburger();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cloud Auto-Save Status Card in Mobile Drawer */}
            <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E6E2D3] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cloud className={`w-3.5 h-3.5 ${user ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className="text-[11px] font-bold text-[#2A2723] uppercase tracking-wider">
                    {user ? 'Studio Cloud Storage' : 'Guest Mode'}
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                  user
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{user ? 'Cloud Live' : 'Session Only'}</span>
                </div>
              </div>
              <p className="text-[10px] text-[#7E7365]">
                {user
                  ? `Projects & media are saved directly to Studio Cloud for ${user.displayName || user.email || 'your account'}.`
                  : 'Sign in with Google or Studio Account to sync your projects and media directly to the Cloud.'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-[#4A453E] pt-1 border-t border-[#E6E2D3]/60">
                <span>Last Synced:</span>
                <span className="font-semibold font-mono text-[#2A2723]">
                  {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {onForceSave && (
                  <button
                    type="button"
                    onClick={() => {
                      onForceSave();
                      closeHamburger();
                    }}
                    className="py-1.5 px-2 rounded-xl bg-[#2A2723] text-white text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Save Now</span>
                  </button>
                )}
                {onReloadFromStorage && (
                  <button
                    type="button"
                    onClick={() => {
                      onReloadFromStorage();
                      closeHamburger();
                    }}
                    className="py-1.5 px-2 rounded-xl bg-white border border-[#E6E2D3] text-[#2A2723] text-[11px] font-medium flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3 h-3 text-[#7E7365]" />
                    <span>Reload DB</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 0: Active Project & LumenLabs Templates */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Project & Templates
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Manage Projects */}
                <button
                  onClick={() => {
                    if (onOpenProjectsModal) onOpenProjectsModal();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <FolderOpen className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">My Projects</span>
                  <span className="text-[9px] text-[#7E7365] truncate max-w-[110px]">
                    {currentProject ? currentProject.name : 'Switch / Create'}
                  </span>
                </button>

                {/* LumenLabs Templates */}
                <button
                  onClick={() => {
                    if (onOpenTemplatesGallery) onOpenTemplatesGallery();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-amber-200 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold text-amber-950">LumenLabs Templates</span>
                  <span className="text-[9px] text-amber-800">Clean, Sunbath, etc.</span>
                </button>
              </div>
            </div>

            {/* Active Media Card */}
            {currentMedia && (
              <div className="flex items-center justify-between p-2.5 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3]">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#2A2723] truncate">
                      {currentMedia.name}
                    </div>
                    <div className="text-[10px] text-[#7E7365]">
                      {currentMedia.type === 'video' ? 'Video asset' : 'Photo asset'} • {currentMedia.aspectRatio.toFixed(2)} ratio
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onOpenMediaLibrary();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="text-[11px] font-medium text-[#2A2723] bg-white px-2.5 py-1 rounded-lg border border-[#E6E2D3] hover:bg-[#F0EEE6] flex-shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {/* Section 1: Media Inputs & Camera */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Create, Record & Import
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Collages & Multi-Media */}
                {onOpenCollages && (
                  <button
                    onClick={() => {
                      onOpenCollages();
                      closeHamburger();
                      soundFx.playHapticTick();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                      <LayoutGrid className="w-3.5 h-3.5 text-[#2A2723]" />
                    </div>
                    <span className="text-xs font-semibold text-[#2A2723]">Collages</span>
                    <span className="text-[9px] text-[#7E7365]">Multi-Photo & Video</span>
                  </button>
                )}

                {/* Record Video */}
                {onOpenRecordVideo && (
                  <button
                    onClick={() => {
                      onOpenRecordVideo();
                      closeHamburger();
                      soundFx.playHapticTick();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all text-center gap-1.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-white border border-rose-200 flex items-center justify-center">
                      <Video className="w-3.5 h-3.5 text-rose-700" />
                    </div>
                    <span className="text-xs font-semibold text-rose-950">Record Video</span>
                    <span className="text-[9px] text-rose-700">Live Analog Capture</span>
                  </button>
                )}

                {/* Open WebGL Camera */}
                <button
                  onClick={() => {
                    onOpenCamera();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">Live Photo</span>
                  <span className="text-[9px] text-[#7E7365]">WebGL Filters</span>
                </button>

                {/* Import File */}
                <button
                  onClick={() => {
                    if (mediaFileInputRef.current) {
                      mediaFileInputRef.current.click();
                      soundFx.playHapticTick();
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">Import File</span>
                  <span className="text-[9px] text-[#7E7365]">Photo / Video</span>
                </button>
              </div>
            </div>

            {/* Section 2: Compare & View Tools */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Canvas Inspection & Compare
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Split Screen Toggle */}
                <button
                  onClick={() => {
                    onToggleCompareSplit();
                    soundFx.playHapticTick();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    compareMode === 'split'
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] hover:bg-white text-[#2A2723] border-[#E6E2D3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SplitSquareVertical className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Split Screen</div>
                      <div className={`text-[10px] ${compareMode === 'split' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                        Before / After
                      </div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${compareMode === 'split' ? 'bg-white' : 'border border-[#7E7365]'}`} />
                </button>

                {/* Hold to View Original */}
                <button
                  onMouseDown={onHoldCompareStart}
                  onMouseUp={onHoldCompareEnd}
                  onMouseLeave={onHoldCompareEnd}
                  onTouchStart={onHoldCompareStart}
                  onTouchEnd={onHoldCompareEnd}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                    compareMode === 'hold'
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] hover:bg-white text-[#2A2723] border-[#E6E2D3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Hold Original</div>
                      <div className={`text-[10px] ${compareMode === 'hold' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                        Press to preview
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Recipes & State Management */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Preset Recipes & Edits
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Copy Recipe */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] text-xs font-medium text-[#2A2723]"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4 text-[#437A47]" />
                      <span className="text-[#437A47] font-semibold">Recipe Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#7E7365]" />
                      <span>Copy Recipe</span>
                    </>
                  )}
                </button>

                {/* Paste Recipe */}
                <button
                  onClick={() => {
                    if (hasCopiedRecipe) {
                      onPasteRecipe();
                      closeHamburger();
                      soundFx.playHapticTick();
                    }
                  }}
                  disabled={!hasCopiedRecipe}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    hasCopiedRecipe
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] text-[#C5BDB2] border-[#E6E2D3] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Paste Recipe</span>
                </button>
              </div>
            </div>

            {/* Section 4: Project Export (Single File Options) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold tracking-wider text-amber-900 uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-amber-700" />
                  <span>Project Export (Single File)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-bold">1 File</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onOpenExport({ scope: 'all-slides', singleFileType: 'pdf' });
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all text-center gap-1"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-amber-200 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-800" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-950">PDF Doc</span>
                  <span className="text-[8px] text-amber-800">All slides</span>
                </button>

                <button
                  onClick={() => {
                    onOpenExport({ scope: 'all-slides', singleFileType: 'strip' });
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all text-center gap-1"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-amber-200 flex items-center justify-center">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-800" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-950">Strip</span>
                  <span className="text-[8px] text-amber-800">Carousel</span>
                </button>

                <button
                  onClick={() => {
                    onOpenExport({ scope: 'all-slides', singleFileType: 'zip' });
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all text-center gap-1"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-amber-200 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-amber-800" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-950">ZIP Pack</span>
                  <span className="text-[8px] text-amber-800">All images</span>
                </button>
              </div>
            </div>

            {/* Footer Primary Buttons */}
            <div className="pt-2 border-t border-[#F0EEE6] flex items-center gap-2">
              <button
                onClick={() => {
                  onReset();
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-medium text-[#7E7365] hover:text-[#2A2723] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Adjustments</span>
              </button>

              <button
                onClick={() => {
                  onOpenExport();
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>Export High-Res</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
