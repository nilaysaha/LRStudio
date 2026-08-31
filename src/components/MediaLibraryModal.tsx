import React, { useState, useRef } from 'react';
import {
  X, Upload, Film, Image as ImageIcon, Sparkles, Plus, Play,
  Camera, Video, Trash2, Search, Check, Clock, Eye, Download,
  Layers, HardDrive
} from 'lucide-react';
import { MediaItem } from '../types';
import { SAMPLE_MEDIA_GALLERY } from '../constants/presets';
import { soundFx } from '../utils/audio';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: MediaItem) => void;
  userMediaLibrary: MediaItem[];
  currentMediaId?: string;
  title?: string;
  subtitle?: string;
  onDeleteMedia?: (mediaId: string) => void;
  onAddMedia?: (media: MediaItem) => void;
  onOpenCamera?: () => void;
  onRecordVideo?: () => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  userMediaLibrary,
  currentMediaId,
  title = 'MEDIA LIBRARY',
  subtitle = 'Captures, Videos & Editorial Gallery',
  onDeleteMedia,
  onAddMedia,
  onOpenCamera,
  onRecordVideo,
}) => {
  // Tab: 'my-library' | 'samples' | 'upload'
  const [activeTab, setActiveTab] = useState<'my-library' | 'samples' | 'upload'>(
    userMediaLibrary.length > 0 ? 'my-library' : 'samples'
  );
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'camera'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [previewingVideoId, setPreviewingVideoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle uploaded files (single or batch)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    soundFx.playShutter();

    const fileList = Array.from(files);
    fileList.forEach((file, index) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      const url = URL.createObjectURL(file);

      if (isVideo) {
        const newMedia: MediaItem = {
          id: `upload-${Date.now()}-${index}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'video',
          url: url,
          file: file,
          aspectRatio: 16 / 9,
          width: 1920,
          height: 1080,
          createdAt: Date.now(),
          source: 'upload',
        };
        onAddMedia?.(newMedia);
        if (index === 0) {
          onSelectMedia(newMedia);
        }
      } else {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 1200;
          const h = img.naturalHeight || 1200;
          const newMedia: MediaItem = {
            id: `upload-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
            url: url,
            file: file,
            aspectRatio: w / h,
            width: w,
            height: h,
            createdAt: Date.now(),
            source: 'upload',
          };
          onAddMedia?.(newMedia);
          if (index === 0) {
            onSelectMedia(newMedia);
          }
        };
        img.onerror = () => {
          const newMedia: MediaItem = {
            id: `upload-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
            url: url,
            file: file,
            aspectRatio: 4 / 5,
            width: 1200,
            height: 1200,
            createdAt: Date.now(),
            source: 'upload',
          };
          onAddMedia?.(newMedia);
          if (index === 0) {
            onSelectMedia(newMedia);
          }
        };
        img.src = url;
      }
    });

    setActiveTab('my-library');
    soundFx.playHapticTick();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLoadCustomUrl = () => {
    if (!customUrl.trim()) return;
    const isVideo = customUrl.endsWith('.mp4') || customUrl.endsWith('.webm') || customUrl.includes('video');
    const newMedia: MediaItem = {
      id: `url-${Date.now()}`,
      name: 'Web Media',
      type: isVideo ? 'video' : 'image',
      url: customUrl.trim(),
      aspectRatio: isVideo ? 16 / 9 : 4 / 5,
      width: 1200,
      height: 1200,
      createdAt: Date.now(),
      source: 'web',
    };
    onAddMedia?.(newMedia);
    onSelectMedia(newMedia);
    soundFx.playHapticTick();
    setCustomUrl('');
    setActiveTab('my-library');
  };

  // Filtered user items
  const filteredUserMedia = userMediaLibrary.filter((item) => {
    const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'video') return item.type === 'video';
    if (filterType === 'image') return item.type === 'image';
    if (filterType === 'camera') return item.source === 'camera';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Hidden Multi-file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* 1. Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E6E2D3] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2A2723] text-white flex items-center justify-center shadow-xs">
              <HardDrive className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial text-lg font-bold tracking-wider text-[#2A2723]">
                  {title}
                </span>
                <span className="text-[10px] text-[#7E7365] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] font-semibold">
                  {userMediaLibrary.length} My Items
                </span>
              </div>
              <p className="text-[11px] text-[#7E7365] hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Header Quick Actions */}
          <div className="flex items-center gap-2">
            {onRecordVideo && (
              <button
                onClick={() => {
                  soundFx.playHapticTick();
                  onClose();
                  onRecordVideo();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Open Camera in Video Recording Mode"
              >
                <Video className="w-3.5 h-3.5" />
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Take Live Camera Photo"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>Take Photo</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                soundFx.playHapticTick();
              }}
              className="p-1.5 rounded-xl text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Sub-tabs and Search/Filter Bar */}
        <div className="px-5 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-[#E6E2D3] bg-[#F5F2EB]">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E6E2D3] shadow-xs">
            <button
              onClick={() => {
                setActiveTab('my-library');
                soundFx.playHapticTick();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'my-library'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-300" />
              <span>My Captures & Uploads</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'my-library' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {userMediaLibrary.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('samples');
                soundFx.playHapticTick();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Curated Samples</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'samples' ? 'bg-white/20 text-white' : 'bg-[#EAE6D8] text-[#2A2723]'
              }`}>
                {SAMPLE_MEDIA_GALLERY.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('upload');
                soundFx.playHapticTick();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New</span>
            </button>
          </div>

          {/* Search & Filter pills when in My Library */}
          {activeTab === 'my-library' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-xl border border-[#E6E2D3]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                    filterType === 'all' ? 'bg-[#2A2723] text-white' : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  All ({userMediaLibrary.length})
                </button>
                <button
                  onClick={() => setFilterType('video')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                    filterType === 'video' ? 'bg-[#2A2723] text-white' : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <Video className="w-3 h-3 text-red-400" />
                  <span>Videos</span>
                </button>
                <button
                  onClick={() => setFilterType('camera')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                    filterType === 'camera' ? 'bg-[#2A2723] text-white' : 'text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span>Camera</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7E7365]" />
                <input
                  type="text"
                  placeholder="Filter media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#E6E2D3] rounded-xl pl-7 pr-2.5 py-1 text-xs text-[#2A2723] placeholder-[#7E7365] focus:outline-none focus:border-[#2A2723]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Modal Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[62vh] no-scrollbar">
          
          {/* TAB 1: MY LIBRARY (USER RECORDINGS, CAPTURES & UPLOADS) */}
          {activeTab === 'my-library' && (
            <div>
              {userMediaLibrary.length === 0 ? (
                /* Empty Library State */
                <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#EAE6D8] flex items-center justify-center mb-4 text-[#7E7365]">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-[#2A2723] mb-1">
                    No Recorded Videos or Captures Yet
                  </h3>
                  <p className="text-xs text-[#7E7365] mb-5 leading-relaxed">
                    Capture live photos or record analog videos with the camera, or upload media from your device. All your media will be permanently saved here for quick selection and project creation!
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {onRecordVideo && (
                      <button
                        onClick={() => {
                          soundFx.playHapticTick();
                          onClose();
                          onRecordVideo();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>Record Live Video</span>
                      </button>
                    )}
                    {onOpenCamera && (
                      <button
                        onClick={() => {
                          soundFx.playHapticTick();
                          onClose();
                          onOpenCamera();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-amber-300" />
                        <span>Take Camera Photo</span>
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E6E2D3] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#2A2723] cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#7E7365]" />
                      <span>Upload Files</span>
                    </button>
                  </div>
                </div>
              ) : filteredUserMedia.length === 0 ? (
                /* Filter result empty */
                <div className="text-center py-10 text-[#7E7365] text-xs">
                  No media items match your search filter "{searchQuery}".
                </div>
              ) : (
                /* Media Items Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredUserMedia.map((media) => {
                    const isSelected = currentMediaId === media.id;
                    const isVideo = media.type === 'video';
                    const isCameraCapture = media.source === 'camera';

                    return (
                      <div
                        key={media.id}
                        className={`group relative rounded-2xl overflow-hidden cursor-pointer border aspect-[4/5] bg-neutral-900 transition-all shadow-xs flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#2A2723] ring-2 ring-[#2A2723] shadow-md scale-[1.02]'
                            : 'border-[#E6E2D3] hover:border-[#2A2723]'
                        }`}
                        onClick={() => {
                          onSelectMedia(media);
                          soundFx.playHapticTick();
                          onClose();
                        }}
                      >
                        {/* Media Visual Preview */}
                        {isVideo ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-black">
                            <video
                              src={media.url}
                              muted
                              playsInline
                              autoPlay={previewingVideoId === media.id}
                              loop
                              onMouseEnter={() => setPreviewingVideoId(media.id)}
                              onMouseLeave={() => setPreviewingVideoId(null)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {previewingVideoId !== media.id && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                                  <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={media.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}

                        {/* Top Badges Overlay */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
                          {isCameraCapture ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/90 text-white shadow-xs flex items-center gap-1 backdrop-blur-xs">
                              {isVideo ? <Video className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
                              <span>{isVideo ? 'Recorded Video' : 'Camera Photo'}</span>
                            </span>
                          ) : isVideo ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-600/90 text-white shadow-xs flex items-center gap-1 backdrop-blur-xs">
                              <Video className="w-2.5 h-2.5" />
                              <span>Video</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/60 text-white shadow-xs backdrop-blur-xs">
                              Photo
                            </span>
                          )}

                          {/* Delete Button */}
                          {onDeleteMedia && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundFx.playHapticTick();
                                onDeleteMedia(media.id);
                              }}
                              className="pointer-events-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-black/70 text-white hover:text-red-400 hover:bg-black transition-all cursor-pointer"
                              title="Remove from Library"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#2A2723]/20 pointer-events-none flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full bg-white text-[#2A2723] text-xs font-bold shadow-lg flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-[#2A2723]" />
                              <span>Active</span>
                            </span>
                          </div>
                        )}

                        {/* Bottom Gradient Footer Info */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 flex items-center justify-between pointer-events-none">
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-[11px] font-semibold text-white truncate">
                              {media.name}
                            </span>
                            <span className="text-[9px] text-neutral-300">
                              {media.createdAt ? new Date(media.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </span>
                          </div>

                          <div className="text-[9px] font-mono font-bold text-white/80 bg-white/20 px-1.5 py-0.5 rounded">
                            {media.aspectRatio ? (media.aspectRatio > 1 ? '16:9' : '4:5') : '1:1'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CURATED EDITORIAL SAMPLES */}
          {activeTab === 'samples' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {SAMPLE_MEDIA_GALLERY.map((media) => {
                const isSelected = currentMediaId === media.id;
                return (
                  <div
                    key={media.id}
                    onClick={() => {
                      onSelectMedia(media);
                      soundFx.playHapticTick();
                      onClose();
                    }}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer border aspect-[4/5] bg-neutral-900 transition-all shadow-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#2A2723] ring-2 ring-[#2A2723] shadow-md scale-[1.02]'
                        : 'border-[#E6E2D3] hover:border-[#2A2723]'
                    }`}
                  >
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full relative bg-neutral-900 flex items-center justify-center">
                        <video
                          src={media.url}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white/80" />
                        </div>
                      </div>
                    )}

                    {/* Gradient Info Footer */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-white truncate max-w-[140px]">
                        {media.name}
                      </span>
                      {media.type === 'video' && (
                        <span className="text-[9px] bg-white text-black font-bold px-1.5 py-0.5 rounded-full">
                          VIDEO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: UPLOAD NEW FILES */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#2A2723] bg-[#FAF9F6]'
                    : 'border-[#E6E2D3] bg-white hover:border-[#2A2723]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] flex items-center justify-center text-[#2A2723] mb-3 shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-[#2A2723]">
                  Click or drag photos & videos here (Batch Upload Supported)
                </h4>
                <p className="text-xs text-[#7E7365] mt-1 max-w-sm">
                  Supports High-Resolution JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM. Files are added to your personal library for instant editing and collage insertion.
                </p>
              </div>

              {/* URL Import */}
              <div className="bg-white p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#2A2723]">
                  Or paste direct media URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or https://.../video.mp4"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl px-3.5 py-2 text-xs text-[#2A2723] placeholder-[#A69E91] focus:outline-none focus:border-[#2A2723]"
                  />
                  <button
                    onClick={handleLoadCustomUrl}
                    disabled={!customUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-[#2A2723] disabled:opacity-50 text-white font-semibold text-xs transition-opacity cursor-pointer hover:bg-black shadow-xs"
                  >
                    Add to Library
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Modal Bottom Bar */}
        <div className="px-5 py-3 border-t border-[#E6E2D3] bg-white flex items-center justify-between text-xs text-[#7E7365]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2A2723]">
              {userMediaLibrary.length} Library Items Saved
            </span>
            <span>•</span>
            <span>Recorded videos & camera captures are preserved during your session</span>
          </div>

          <button
            onClick={() => {
              onClose();
              soundFx.playHapticTick();
            }}
            className="px-4 py-1.5 rounded-xl border border-[#E6E2D3] bg-[#FAF9F6] hover:bg-[#F0EEE6] text-[#2A2723] font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
