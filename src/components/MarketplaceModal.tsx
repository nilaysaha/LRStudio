import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Copy, Globe, Sparkles, Trophy, Flame, Eye,
  Sliders, Info, Filter, ArrowUpDown, Check, RefreshCw,
  Layers, ExternalLink, Calendar, Heart, ShieldAlert, Award
} from 'lucide-react';
import { Project, MarketplaceProject, ProjectTemplateTag } from '../types';
import {
  fetchMarketplaceProjects,
  replicateMarketplaceProject,
  sortMarketplaceByReplications,
} from '../lib/firestoreService';
import { PROJECT_TEMPLATE_TAGS } from '../constants/projectTemplates';
import { soundFx } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectReplicated: (replicatedProject: Project) => void;
  onOpenDisclaimer: () => void;
  currentProjectId?: string | null;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  isOpen,
  onClose,
  onProjectReplicated,
  onOpenDisclaimer,
  currentProjectId,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MarketplaceProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'replications' | 'newest' | 'trending'>('replications');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'my-creations'>('all');
  const [replicatingId, setReplicatingId] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<MarketplaceProject | null>(null);
  const [replicatedSuccessNotice, setReplicatedSuccessNotice] = useState<{
    name: string;
    count: number;
    rank: number;
  } | null>(null);

  // Load marketplace projects on open
  const loadMarketplace = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketplaceProjects();
      setProjects(data);
    } catch (err) {
      console.warn('Failed to fetch marketplace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMarketplace();
      setReplicatedSuccessNotice(null);
    }
  }, [isOpen]);

  // Compute live statistics
  const stats = useMemo(() => {
    const totalCount = projects.length;
    const totalReplications = projects.reduce((acc, p) => acc + (p.replicationCount || 0), 0);
    const topProject = projects.length > 0
      ? [...projects].sort((a, b) => (b.replicationCount || 0) - (a.replicationCount || 0))[0]
      : null;

    return {
      totalCount,
      totalReplications,
      topProjectName: topProject?.name || 'Tokyo 35mm Portra 400',
      topProjectReplications: topProject?.replicationCount || 0,
    };
  }, [projects]);

  // Filter and sort items
  const filteredAndRankedProjects = useMemo(() => {
    // 1. Establish absolute ranking based on replicationCount across ALL projects
    const masterRanked = sortMarketplaceByReplications(projects);
    const rankMap = new Map<string, number>();
    masterRanked.forEach((p, idx) => {
      rankMap.set(p.id, idx + 1);
    });

    // 2. Filter by scope, tag, and search query
    let filtered = masterRanked.filter((item) => {
      // Scope filter
      if (scopeFilter === 'my-creations') {
        const isMyCreation = user && item.creatorId === user.uid;
        if (!isMyCreation) return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        if (selectedTag === 'collages') {
          if (!item.activeCollage && (!item.collages || item.collages.length === 0)) return false;
        } else if (item.templateTag !== selectedTag) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const creatorMatch = item.creatorName?.toLowerCase().includes(q);
        const tagMatch = item.templateTag?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !creatorMatch && !tagMatch) return false;
      }

      return true;
    });

    // 3. Apply custom sort if user selected something other than ranking
    if (sortOption === 'newest') {
      filtered = [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortOption === 'trending') {
      filtered = [...filtered].sort((a, b) => {
        // Trending score: replication count weighted with recency
        const aScore = (a.replicationCount || 0) * 2 + (a.updatedAt ? a.updatedAt / (1000 * 60 * 60 * 24) : 0);
        const bScore = (b.replicationCount || 0) * 2 + (b.updatedAt ? b.updatedAt / (1000 * 60 * 60 * 24) : 0);
        return bScore - aScore;
      });
    }

    return {
      items: filtered,
      rankMap,
    };
  }, [projects, searchQuery, selectedTag, sortOption, scopeFilter, user]);

  // Handle project replication
  const handleReplicate = async (item: MarketplaceProject) => {
    if (replicatingId) return;
    setReplicatingId(item.id);
    soundFx.playHapticTick();

    try {
      const result = await replicateMarketplaceProject(item, user?.uid);

      // Optimistically update local projects list with incremented replication count
      setProjects((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, replicationCount: result.updatedReplicationCount, updatedAt: Date.now() }
            : p
        )
      );

      // Find current rank
      const updatedList = sortMarketplaceByReplications(
        projects.map((p) =>
          p.id === item.id
            ? { ...p, replicationCount: result.updatedReplicationCount, updatedAt: Date.now() }
            : p
        )
      );
      const newRank = updatedList.findIndex((p) => p.id === item.id) + 1;

      soundFx.playShutter();
      setReplicatedSuccessNotice({
        name: item.name,
        count: result.updatedReplicationCount,
        rank: newRank,
      });

      // Brief visual confirmation before switching to editor
      setTimeout(() => {
        onProjectReplicated(result.replicatedProject);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Replication failed:', err);
    } finally {
      setReplicatingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="marketplace-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden"
    >
      <div
        id="marketplace-modal-window"
        className="relative flex flex-col w-full max-w-6xl h-full max-h-[92vh] bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl shadow-2xl overflow-hidden text-[#2A2723]"
      >
        {/* Top Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-b border-[#E6E2D3] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#2A2723]">
                  Community Marketplace
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                  Open Creations
                </span>
              </div>
              <p className="text-xs text-[#7E7365] hidden sm:block">
                All user projects are shared here. Replicate any creation to edit in your studio — rankings reflect total replications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Disclaimer pill */}
            <button
              id="marketplace-disclaimer-info-btn"
              onClick={() => {
                soundFx.playHapticTick();
                onOpenDisclaimer();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-medium text-stone-700 transition-colors cursor-pointer"
              title="Read why all creations are published on the common marketplace"
            >
              <Info className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden md:inline">Public Disclaimer</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => {
                soundFx.playHapticTick();
                loadMarketplace();
              }}
              className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer"
              title="Refresh marketplace listings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Close button */}
            <button
              id="close-marketplace-btn"
              onClick={() => {
                soundFx.playHapticTick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer"
              title="Close marketplace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mandatory Transparency Disclaimer Banner */}
        <div className="flex-shrink-0 bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>Free Service Notice:</strong> Because LumenLab is 100% free, all projects created on the platform are automatically published to this common marketplace. You can replicate any project — replication counts determine rankings.
            </span>
          </div>
          <button
            onClick={() => {
              soundFx.playHapticTick();
              onOpenDisclaimer();
            }}
            className="underline text-amber-900 hover:text-amber-950 font-semibold cursor-pointer whitespace-nowrap ml-auto"
          >
            Learn more & terms &rarr;
          </button>
        </div>

        {/* Live Metrics Ticker Strip */}
        <div className="flex-shrink-0 bg-[#F5F3EC] border-b border-[#E6E2D3] px-4 sm:px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar text-xs text-[#544D42]">
          <div className="flex items-center gap-6 min-w-max">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>Published Creations:</span>
              <strong className="text-[#2A2723]">{stats.totalCount}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-amber-600" />
              <span>Total Replications:</span>
              <strong className="text-[#2A2723]">{stats.totalReplications}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Leaderboard #1:</span>
              <strong className="text-[#2A2723]">{stats.topProjectName}</strong>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-200">
                {stats.topProjectReplications} Replications
              </span>
            </div>
          </div>

          {/* Scope Filter: All vs My Creations */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E6E2D3] flex-shrink-0">
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setScopeFilter('all');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              All Creations
            </button>
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setScopeFilter('my-creations');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                scopeFilter === 'my-creations'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#7E7365] hover:text-[#2A2723]'
              }`}
            >
              My Projects {user ? '' : '(Guest)'}
            </button>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-[#E6E2D3] bg-white flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#7E7365] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search creations, recipes, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF9F6] border border-[#E6E2D3] rounded-lg focus:outline-none focus:border-[#2A2723] text-[#2A2723] placeholder-[#7E7365]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E7365] hover:text-[#2A2723]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Tags Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto py-0.5">
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setSelectedTag('all');
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-[#2A2723] text-white'
                  : 'bg-[#FAF9F6] border border-[#E6E2D3] text-[#544D42] hover:bg-[#F0EEE6]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setSelectedTag('collages');
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === 'collages'
                  ? 'bg-[#2A2723] text-white'
                  : 'bg-[#FAF9F6] border border-[#E6E2D3] text-[#544D42] hover:bg-[#F0EEE6]'
              }`}
            >
              <Layers className="w-3 h-3 inline mr-1" />
              Collages
            </button>
            {PROJECT_TEMPLATE_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  soundFx.playHapticTick();
                  setSelectedTag(tag.id);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag.id
                    ? 'bg-[#2A2723] text-white'
                    : 'bg-[#FAF9F6] border border-[#E6E2D3] text-[#544D42] hover:bg-[#F0EEE6]'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#7E7365]" />
            <select
              value={sortOption}
              onChange={(e) => {
                soundFx.playHapticTick();
                setSortOption(e.target.value as any);
              }}
              className="text-xs bg-[#FAF9F6] border border-[#E6E2D3] rounded-lg px-2 py-1 text-[#2A2723] focus:outline-none focus:border-[#2A2723] cursor-pointer"
            >
              <option value="replications">Highest Ranked (Replications)</option>
              <option value="trending">Top Trending</option>
              <option value="newest">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Success Toast Notice */}
        {replicatedSuccessNotice && (
          <div className="flex-shrink-0 bg-emerald-600 text-white px-4 sm:px-6 py-2 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>
                Successfully replicated <strong>"{replicatedSuccessNotice.name}"</strong>! Replications incremented to <strong>{replicatedSuccessNotice.count}</strong> (Rank #{replicatedSuccessNotice.rank}). Opening in your studio...
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700/80 px-2 py-0.5 rounded-full">
              Loading Canvas
            </span>
          </div>
        )}

        {/* Projects Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F6]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#7E7365]">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <p className="text-xs font-medium">Loading community marketplace...</p>
            </div>
          ) : filteredAndRankedProjects.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center text-[#7E7365]">
              <Globe className="w-10 h-10 text-[#E6E2D3]" />
              <p className="text-sm font-semibold text-[#2A2723]">No creations found</p>
              <p className="text-xs max-w-sm">
                Try changing your search query or selected tag filter to discover more creations.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('all');
                  setScopeFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#2A2723] text-white text-xs font-semibold mt-1"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndRankedProjects.items.map((project) => {
                const rank = filteredAndRankedProjects.rankMap.get(project.id) || 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;
                const isReplicating = replicatingId === project.id;
                const isCurrentProject = currentProjectId === project.id || currentProjectId === project.originalProjectId;

                return (
                  <div
                    key={project.id}
                    className={`group relative flex flex-col bg-white border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 ${
                      isTop1
                        ? 'border-amber-400/90 ring-1 ring-amber-400/30'
                        : isTop2
                        ? 'border-stone-400/70 ring-1 ring-stone-300/20'
                        : isTop3
                        ? 'border-amber-700/50'
                        : 'border-[#E6E2D3] hover:border-[#2A2723]'
                    }`}
                  >
                    {/* Media Preview Box */}
                    <div className="relative w-full aspect-[4/3] bg-stone-900 overflow-hidden">
                      {project.media?.url ? (
                        <img
                          src={project.media.url}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-500 text-xs">
                          No Preview
                        </div>
                      )}

                      {/* Top Badges Overlay: Rank on left, Replication Count on right */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                        {isTop1 ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-md border border-amber-300">
                            <Trophy className="w-3.5 h-3.5 text-amber-950" />
                            <span>#1 Leaderboard</span>
                          </div>
                        ) : isTop2 ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-900 font-bold text-xs shadow-md border border-stone-300">
                            <Award className="w-3.5 h-3.5 text-stone-700" />
                            <span>#2 Rank</span>
                          </div>
                        ) : isTop3 ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-800 text-amber-100 font-bold text-xs shadow-md border border-amber-700">
                            <Award className="w-3.5 h-3.5 text-amber-300" />
                            <span>#3 Rank</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white font-bold text-xs shadow-xs border border-white/20">
                            <span>Rank #{rank}</span>
                          </div>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs shadow-md border backdrop-blur-xs ${
                            (project.replicationCount || 0) > 50
                              ? 'bg-orange-600/90 text-white border-orange-400/50'
                              : 'bg-black/75 text-white border-white/20'
                          }`}
                          title={`Total times replicated: ${project.replicationCount || 0}`}
                        >
                          <Flame className="w-3 h-3 text-amber-300" />
                          <span>{project.replicationCount || 0} Replications</span>
                        </div>
                      </div>

                      {/* Bottom Info Pill inside preview: collage or aspect ratio */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/90">
                        {project.activeCollage ? (
                          <span className="bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-300" />
                            <span>{project.activeCollage.slots?.length || 2} Slots Collage</span>
                          </span>
                        ) : (
                          <span className="bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10">
                            Single Frame Film
                          </span>
                        )}

                        {project.templateTag && (
                          <span className="bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-wider font-semibold">
                            {project.templateTag}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div>
                        {/* Title & Creator Line */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#2A2723] line-clamp-1 group-hover:text-amber-900 transition-colors">
                            {project.name}
                          </h3>
                          {isCurrentProject && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Creator pill */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-[#7E7365]">
                          {project.creatorPhotoURL ? (
                            <img
                              src={project.creatorPhotoURL}
                              alt={project.creatorName || 'Creator'}
                              className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-[#E6E2D3]"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#E6E2D3] text-[#2A2723] text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                              {(project.creatorName || 'C')[0].toUpperCase()}
                            </div>
                          )}
                          <span className="truncate font-medium text-[#544D42]">
                            {project.creatorName || 'Community Creator'}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="text-[10px]">
                            {project.updatedAt
                              ? new Date(project.updatedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recently'}
                          </span>
                        </div>

                        {/* Description */}
                        {project.description && (
                          <p className="text-xs text-[#7E7365] line-clamp-2 mt-2 leading-relaxed">
                            {project.description}
                          </p>
                        )}

                        {/* Film adjustments recipe highlights */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-[#F0EEE6]">
                          {project.adjustments?.grain ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                              Grain {project.adjustments.grain}%
                            </span>
                          ) : null}
                          {project.adjustments?.halation ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-100">
                              Halation {project.adjustments.halation}%
                            </span>
                          ) : null}
                          {project.adjustments?.temperature ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 font-medium border border-orange-100">
                              Warmth {project.adjustments.temperature > 0 ? `+${project.adjustments.temperature}` : project.adjustments.temperature}
                            </span>
                          ) : null}
                          {project.adjustments?.dateStamp?.enabled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-800 font-medium border border-red-100">
                              LED Date
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {/* Replicate Project Button */}
                        <button
                          id={`replicate-btn-${project.id}`}
                          onClick={() => handleReplicate(project)}
                          disabled={isReplicating}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          title="Replicate this project into your editor. Increments replication count and ranking."
                        >
                          {isReplicating ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Replicating...</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-300" />
                              <span>Replicate Project</span>
                            </>
                          )}
                        </button>

                        {/* Inspect Recipe Button */}
                        <button
                          onClick={() => {
                            soundFx.playHapticTick();
                            setPreviewProject(project);
                          }}
                          className="w-8 h-8 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer flex-shrink-0"
                          title="Inspect film recipe adjustments & slots"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recipe Details Modal Drawer */}
        {previewProject && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPreviewProject(null)}
          >
            <div
              className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D3]">
                <h3 className="font-bold text-base text-[#2A2723]">{previewProject.name}</h3>
                <button
                  onClick={() => setPreviewProject(null)}
                  className="w-7 h-7 rounded-full bg-[#F0EEE6] flex items-center justify-center text-[#7E7365]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#7E7365]">Leaderboard Replications:</span>
                  <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                    {previewProject.replicationCount || 0} times
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7E7365]">Creator:</span>
                  <span className="font-semibold text-[#2A2723]">{previewProject.creatorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7E7365]">Aesthetic Tag:</span>
                  <span className="font-semibold uppercase tracking-wider text-amber-800">
                    {previewProject.templateTag || 'Custom'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E6E2D3]">
                  <p className="font-semibold text-[#2A2723] mb-1.5">Color Grading Recipe:</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-lg border border-[#E6E2D3]">
                    <div>Grain: {previewProject.adjustments?.grain || 0}%</div>
                    <div>Halation: {previewProject.adjustments?.halation || 0}%</div>
                    <div>Contrast: {previewProject.adjustments?.contrast || 0}%</div>
                    <div>Exposure: {previewProject.adjustments?.exposure || 0}%</div>
                    <div>Warmth: {previewProject.adjustments?.temperature || 0}</div>
                    <div>Vignette: {previewProject.adjustments?.vignette || 0}%</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6E2D3] flex items-center gap-2">
                <button
                  onClick={() => setPreviewProject(null)}
                  className="flex-1 py-2 rounded-xl bg-[#F0EEE6] text-[#544D42] text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleReplicate(previewProject);
                    setPreviewProject(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Replicate Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
