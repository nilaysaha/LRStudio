import React, { useState } from 'react';
import { X, Search, Sparkles, Smartphone, BookOpen, Paperclip, Film, Grid, PenTool, Check } from 'lucide-react';
import { CollageTemplate } from '../../types';
import { COLLAGE_TEMPLATES } from '../../constants/collageTemplates';
import { soundFx } from '../../utils/audio';

interface TemplateSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplateId: string | null;
  onSelectTemplate: (template: CollageTemplate) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Collages & Templates', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'editorial-grid', label: 'Multi-Media Grids (2 to 9 Slots)', icon: <Grid className="w-3.5 h-3.5" /> },
  { id: 'polaroid-stack', label: 'Film & Filmstrips', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'airdrop', label: 'AirDrop Mockups', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: 'notebook', label: 'Notebook & Binder', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'scrapbook', label: 'Washi & Scrapbook', icon: <Paperclip className="w-3.5 h-3.5" /> },
  { id: 'handwritten-story', label: 'Handwritten Script', icon: <PenTool className="w-3.5 h-3.5" /> },
];

export const TemplateSelectorDrawer: React.FC<TemplateSelectorDrawerProps> = ({
  isOpen,
  onClose,
  currentTemplateId,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<'all' | '2' | '3' | '4' | '6' | '9'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredTemplates = COLLAGE_TEMPLATES.filter((tpl) => {
    const matchesCategory =
      selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSlot =
      slotFilter === 'all' || (tpl.slots?.length || 0).toString() === slotFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.subtitle.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.moodKeywords.some((k) => k.toLowerCase().includes(q));

    return matchesCategory && matchesSlot && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in">
      <div className="bg-[#FAF9F6] border border-[#E6E2D3] w-full max-w-2xl max-h-[85vh] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E6E2D3] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2A2723]" />
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#2A2723] font-editorial">
                LumenLabs Story & Collage Templates
              </h2>
              <p className="text-[11px] text-[#7E7365]">
                Customize multi-slot layouts with your own images, videos, and quotes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              soundFx.playHapticTick();
            }}
            className="p-2 rounded-xl text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3.5 bg-white/70 border-b border-[#E6E2D3] flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A69480]" />
            <input
              type="text"
              placeholder="Search AirDrop, spiral notebook, washi tape, 35mm film..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E6E2D3] text-xs text-[#2A2723] placeholder-[#A69480] focus:outline-none focus:border-[#2A2723]"
            />
          </div>

          {/* Categories Pill Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    soundFx.playHapticTick();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#2A2723] text-white shadow-xs'
                      : 'bg-white border border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Slot Count Filter Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#F0EEE6]">
            <span className="text-[10px] font-semibold text-[#A69480] uppercase tracking-wider pl-1 shrink-0">
              Media Count:
            </span>
            {[
              { id: 'all', label: 'Any Slots' },
              { id: '2', label: '2 Slots' },
              { id: '3', label: '3 Slots' },
              { id: '4', label: '4 Slots (2×2)' },
              { id: '6', label: '6 Slots (2×3)' },
              { id: '9', label: '9 Slots (3×3)' },
            ].map((sf) => (
              <button
                key={sf.id}
                type="button"
                onClick={() => {
                  setSlotFilter(sf.id as any);
                  soundFx.playHapticTick();
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  slotFilter === sf.id
                    ? 'bg-[#EAE6DF] text-[#2A2723] font-bold'
                    : 'text-[#7E7365] hover:text-[#2A2723] hover:bg-neutral-100'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredTemplates.map((tpl) => {
            const isSelected = currentTemplateId === tpl.id;

            return (
              <div
                key={tpl.id}
                onClick={() => {
                  soundFx.playShutter();
                  onSelectTemplate(tpl);
                  onClose();
                }}
                className={`group relative flex flex-col bg-white rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  isSelected
                    ? 'border-[#2A2723] ring-2 ring-[#2A2723]'
                    : 'border-[#E6E2D3] hover:border-[#A69480]'
                }`}
              >
                {/* Thumbnail Container */}
                <div
                  className="relative w-full bg-neutral-100 overflow-hidden"
                  style={{ aspectRatio: `${tpl.aspectRatio}` }}
                >
                  <img
                    src={tpl.previewThumbnail}
                    alt={tpl.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-full font-medium">
                      {tpl.aspectLabel}
                    </span>
                    {tpl.badge && (
                      <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                        {tpl.badge}
                      </span>
                    )}
                  </div>

                  {/* Slot Count Badge */}
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-[#2A2723] text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                    {tpl.slots?.length || 0} Media {(tpl.slots?.length || 0) === 1 ? 'Slot' : 'Slots'}
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#0A84FF] rounded-full flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Info Content */}
                <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                  <div>
                    <h3 className="text-xs font-bold text-[#2A2723] group-hover:text-black">
                      {tpl.name}
                    </h3>
                    <p className="text-[10px] text-[#7E7365] mt-0.5 line-clamp-2 leading-relaxed">
                      {tpl.subtitle}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#F0EEE6] flex items-center justify-between">
                    <span className="text-[9px] text-[#A69480] uppercase tracking-wider font-mono">
                      {tpl.categoryLabel}
                    </span>
                    <span className="text-[10px] font-semibold text-[#0A84FF] group-hover:underline">
                      Use Template →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
