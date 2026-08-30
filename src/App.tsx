/**
 * LRStudio - WebGL Photo & Video Filter Editor
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, Adjustments, MediaItem, Preset } from './types';
import { BUILT_IN_PRESETS, SAMPLE_MEDIA_GALLERY } from './constants/presets';
import { defaultAdjustments, createAdjustmentsCopy } from './constants/defaultAdjustments';
import { EditorHeader } from './components/EditorHeader';
import { ViewportCanvas } from './components/ViewportCanvas';
import { AdjustmentsBar } from './components/AdjustmentsBar';
import { CameraView } from './components/CameraView';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { SavePresetModal } from './components/SavePresetModal';
import { ExportModal } from './components/ExportModal';
import { soundFx } from './utils/audio';

const STORAGE_KEY_CUSTOM_PRESETS = 'lrstudio_custom_presets_v1';
const STORAGE_KEY_FAVORITES = 'lrstudio_favorite_presets_v1';

export default function App() {
  // Current media state
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(SAMPLE_MEDIA_GALLERY[0]);

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

  // Current Adjustments State
  const [adjustments, setAdjustments] = useState<Adjustments>(() => {
    // Start with iconic INSO preset
    const insoPreset = BUILT_IN_PRESETS.find((p) => p.id === 'inso');
    return insoPreset ? createAdjustmentsCopy(insoPreset.adjustments) : createAdjustmentsCopy(defaultAdjustments);
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

  // Modals
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

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
    }
  };

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
    dlAnchor.setAttribute('download', `lrstudio_${preset.name.toLowerCase().replace(/\s+/g, '_')}.json`);
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
      };
      setCurrentMedia(newMedia);
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
        };
        setCurrentMedia(newMedia);
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
        };
        setCurrentMedia(newMedia);
        soundFx.playHapticTick();
      };
      img.src = url;
    }
  };

  // Camera capture callback
  const handleCameraCapture = (capturedDataUrl: string) => {
    const capturedMedia: MediaItem = {
      id: `capture-${Date.now()}`,
      name: `Photo Capture ${new Date().toLocaleTimeString()}`,
      type: 'image',
      url: capturedDataUrl,
      aspectRatio: 4 / 5,
      width: 1920,
      height: 1440,
    };
    setCurrentMedia(capturedMedia);
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
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        setIsCameraOpen(true);
      } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        setIsMediaLibraryOpen(true);
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
        onOpenCamera={() => setIsCameraOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onImportMediaFile={handleImportMediaFile}
      />

      {/* Main Canvas Viewport Area */}
      <section className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        <ViewportCanvas
          media={currentMedia}
          adjustments={adjustments}
          compareMode={compareMode}
        />
      </section>

      {/* Bottom Toolbars & Presets Shelf */}
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
      />

      {/* Live Camera Viewfinder Modal */}
      <CameraView
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        presets={presets}
      />

      {/* Media Library Import Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelectMedia={(media) => {
          setCurrentMedia(media);
          soundFx.playHapticTick();
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

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        media={currentMedia}
        adjustments={adjustments}
      />
    </main>
  );
}
