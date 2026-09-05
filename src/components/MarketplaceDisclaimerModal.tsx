import React from 'react';
import { X, Globe, Copy, ShieldAlert, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface MarketplaceDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMarketplace?: () => void;
}

export const MarketplaceDisclaimerModal: React.FC<MarketplaceDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onOpenMarketplace,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="marketplace-disclaimer-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playHapticTick();
          onClose();
        }
      }}
    >
      <div
        id="marketplace-disclaimer-modal"
        className="relative w-full max-w-xl bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#2A2723] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          id="close-disclaimer-modal-btn"
          onClick={() => {
            soundFx.playHapticTick();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#F0EEE6] hover:bg-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723] flex items-center justify-center transition-colors cursor-pointer"
          title="Close disclaimer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/60">
                Community Edition
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2A2723] mt-0.5">
              Public Marketplace Disclaimer
            </h2>
          </div>
        </div>

        {/* Notice Card */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 mb-6 text-sm text-amber-950 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
            Free Service & Open Community Publishing
          </p>
          <p className="text-amber-900/90 text-xs sm:text-sm">
            Because users are not paying for LumenLab services, <strong>all creations and projects created on this platform are automatically published to our common public marketplace</strong>.
          </p>
        </div>

        {/* Bullet Points */}
        <div className="space-y-3.5 text-xs sm:text-sm text-[#544D42] mb-7">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#F0EEE6] text-[#2A2723] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-[#2A2723] font-semibold">Common Public Marketplace:</strong>
              <p className="text-xs text-[#7E7365] mt-0.5">
                Every project, color grading recipe, retro date stamp, and collage slide you create is shared in the public marketplace for all users to discover.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Copy className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <div>
              <strong className="text-[#2A2723] font-semibold">One-Click Project Replication:</strong>
              <p className="text-xs text-[#7E7365] mt-0.5">
                Any creator can replicate your projects directly into their studio workspace, borrowing your film recipes and slide templates. You can likewise replicate any community creation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trophy className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <div>
              <strong className="text-[#2A2723] font-semibold">Replication Ranking System:</strong>
              <p className="text-xs text-[#7E7365] mt-0.5">
                Every time a project is replicated by any user, its replication count increases. The leaderboard rankings on the marketplace are determined directly by this count.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#F0EEE6] text-[#2A2723] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-[#2A2723] font-semibold">Privacy Reminder:</strong>
              <p className="text-xs text-[#7E7365] mt-0.5">
                Please do not upload private, confidential, or sensitive personal documents, as all project assets are accessible across the community marketplace.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E6E2D3]">
          {onOpenMarketplace ? (
            <button
              id="disclaimer-view-marketplace-btn"
              onClick={() => {
                soundFx.playHapticTick();
                onClose();
                onOpenMarketplace();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200/80 text-amber-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
            >
              <Globe className="w-3.5 h-3.5 text-amber-800" />
              <span>Explore Marketplace</span>
            </button>
          ) : (
            <div />
          )}

          <button
            id="acknowledge-disclaimer-btn"
            onClick={() => {
              soundFx.playHapticTick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>I Understand & Agree</span>
          </button>
        </div>
      </div>
    </div>
  );
};
