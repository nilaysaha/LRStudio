import React, { useState, useRef } from 'react';
import { X, Upload, Film, Image as ImageIcon, Sparkles, Plus, Play } from 'lucide-react';
import { MediaItem } from '../types';
import { SAMPLE_MEDIA_GALLERY } from '../constants/presets';
import { soundFx } from '../utils/audio';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: MediaItem) => void;
  currentMediaId?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  currentMediaId,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('samples');
  const [isDragging, setIsDragging] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [userMediaList, setUserMediaList] = useState<MediaItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
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
      };

      setUserMediaList((prev) => [newMedia, ...prev]);
      onSelectMedia(newMedia);
      soundFx.playHapticTick();
      onClose();
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
        };

        setUserMediaList((prev) => [newMedia, ...prev]);
        onSelectMedia(newMedia);
        soundFx.playHapticTick();
        onClose();
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
        };
        setUserMediaList((prev) => [newMedia, ...prev]);
        onSelectMedia(newMedia);
        soundFx.playHapticTick();
        onClose();
      };
      img.src = url;
    }
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
    const isVideo = customUrl.endsWith('.mp4') || customUrl.endsWith('.webm');
    const newMedia: MediaItem = {
      id: `url-${Date.now()}`,
      name: 'Web Media',
      type: isVideo ? 'video' : 'image',
      url: customUrl.trim(),
      aspectRatio: 4 / 5,
      width: 1200,
      height: 1200,
    };
    onSelectMedia(newMedia);
    soundFx.playHapticTick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E6E2D3] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#F0EEE6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-lg font-bold tracking-wider text-[#2A2723]">
              MEDIA LIBRARY
            </span>
            <span className="text-[10px] text-[#7E7365] tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
              Import & Samples
            </span>
          </div>

          <button
            onClick={() => { onClose(); soundFx.playHapticTick(); }}
            className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2 border-b border-[#F0EEE6]">
          <button
            onClick={() => { setActiveTab('samples'); soundFx.playHapticTick(); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
              activeTab === 'samples'
                ? 'bg-[#2A2723] text-white shadow-xs'
                : 'text-[#7E7365] hover:text-[#2A2723]'
            }`}
          >
            Curated Editorial Gallery
          </button>
          <button
            onClick={() => { setActiveTab('upload'); soundFx.playHapticTick(); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
              activeTab === 'upload'
                ? 'bg-[#2A2723] text-white shadow-xs'
                : 'text-[#7E7365] hover:text-[#2A2723]'
            }`}
          >
            Upload Photos & Videos
          </button>
        </div>

        {/* Content Container */}
        <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4 no-scrollbar">
          {activeTab === 'samples' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    className={`group relative rounded-xl overflow-hidden cursor-pointer border aspect-[4/5] bg-neutral-100 transition-all ${
                      isSelected
                        ? 'border-[#2A2723] ring-2 ring-[#2A2723]/30 shadow-lg scale-[1.02]'
                        : 'border-[#E6E2D3] hover:border-[#A69480]'
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
                      <span className="text-[11px] font-medium text-white truncate max-w-[120px]">
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
          ) : (
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
                    : 'border-[#E6E2D3] bg-[#FAF9F6] hover:border-[#2A2723]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center text-[#2A2723] mb-3 shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-[#2A2723]">
                  Click or drag photos & videos here
                </h4>
                <p className="text-xs text-[#7E7365] mt-1 max-w-sm">
                  Supports High-Resolution JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM. Real-time WebGL processing applied instantly.
                </p>
              </div>

              {/* URL Import */}
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
                <span className="text-xs font-medium text-[#2A2723]">
                  Or paste direct media URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 bg-white border border-[#E6E2D3] rounded-lg px-3 py-1.5 text-xs text-[#2A2723] placeholder-[#A69E91] focus:outline-none focus:border-[#2A2723]"
                  />
                  <button
                    onClick={handleLoadCustomUrl}
                    disabled={!customUrl.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2A2723] disabled:opacity-50 text-white font-medium text-xs transition-opacity"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
