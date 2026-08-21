import React, { useState, useEffect } from 'react';
import type { Rule, Profile, FlowSpeedStorage, RulePriorityType } from '../../types/flowspeed';
import { loadFlowSpeedStorage, saveFlowSpeedStorage } from '../../utils/storage';
import { resolveSpeedForVideo } from '../../utils/engine';
import {
  Play,
  LayoutDashboard,
  ShieldCheck,
  User,
  BarChart3,
  Settings,
  Command,
  Info,
  Plus,
  Share2,
  Search,
  Edit2,
  Trash2,
  GripVertical,
  CheckCircle,
  GraduationCap,
  BookOpen,
  Tv,
  Sliders,
  TrendingUp,
  Clock,
  Layers,
  ArrowUpRight,
  X,
  Video,
  Hash,
  Globe
} from 'lucide-react';

export function App() {
  const [data, setData] = useState<FlowSpeedStorage | null>(null);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'rules' | 'profiles' | 'analytics' | 'settings' | 'about'>('dashboard');
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>('all');
  const [ruleSearchQuery, setRuleSearchQuery] = useState<string>('');
  
  // Add Rule Modal State
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<RulePriorityType>('channel');
  const [newRuleChannel, setNewRuleChannel] = useState('');
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleSpeed, setNewRuleSpeed] = useState('1.25');

  useEffect(() => {
    async function init() {
      const storage = await loadFlowSpeedStorage();
      setData(storage);
    }
    init();
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentVideo = data.currentVideo;
  const resolution = resolveSpeedForVideo(
    currentVideo,
    data.rules,
    data.activeProfileId,
    data.globalDefaultSpeed,
    data.manualSpeedOverride
  );

  const activeProfile = data.profiles.find((p) => p.id === data.activeProfileId) || data.profiles[0];

  // Save Rules update helper
  const handleSaveRules = (updatedRules: Rule[]) => {
    saveFlowSpeedStorage({ rules: updatedRules });
    setData((prev) => prev ? { ...prev, rules: updatedRules } : null);
  };

  // Toggle Rule Status
  const handleToggleRuleStatus = (ruleId: string) => {
    const updated = data.rules.map((r) => (r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r));
    handleSaveRules(updated);
  };

  // Delete Rule
  const handleDeleteRule = (ruleId: string) => {
    const updated = data.rules.filter((r) => r.id !== ruleId);
    handleSaveRules(updated);
  };

  // Create New Rule Submit
  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const speed = parseFloat(newRuleSpeed) || 1.0;
    let priority = 3;
    let condition = 'Channel matches';

    if (newRuleType === 'video') {
      priority = 1;
      condition = 'Exact Video ID';
    } else if (newRuleType === 'channel_title') {
      priority = 2;
      condition = `Title contains "${newRuleKeyword}"`;
    } else if (newRuleType === 'channel') {
      priority = 3;
      condition = 'Channel matches';
    } else if (newRuleType === 'keyword') {
      priority = 4;
      condition = 'Title or description';
    } else if (newRuleType === 'global') {
      priority = 99;
      condition = 'All videos';
    }

    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      priority,
      type: newRuleType,
      ruleName: newRuleName,
      condition,
      channelName: newRuleChannel || undefined,
      keyword: newRuleKeyword || undefined,
      speed,
      profileId: data.activeProfileId,
      profileName: activeProfile?.name || 'Active Profile',
      isEnabled: true,
      createdAt: Date.now(),
    };

    handleSaveRules([newRule, ...data.rules]);
    setIsAddRuleOpen(false);
    setNewRuleName('');
    setNewRuleChannel('');
    setNewRuleKeyword('');
  };

  // Filter Rules
  const filteredRules = data.rules.filter((rule) => {
    if (ruleCategoryFilter !== 'all' && rule.type !== ruleCategoryFilter) return false;
    if (ruleSearchQuery.trim()) {
      const q = ruleSearchQuery.toLowerCase();
      return (
        rule.ruleName.toLowerCase().includes(q) ||
        rule.condition.toLowerCase().includes(q) ||
        (rule.channelName && rule.channelName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate SVG circular gauge dash offset
  // speed 0.5 -> offset 180, speed 1.0 -> offset 120, speed 2.0 -> offset 40
  const gaugePercent = Math.min(Math.max((resolution.speed - 0.5) / 2.0, 0), 1);
  const strokeDashoffset = 250 - gaugePercent * 180;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans w-full">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Play size={18} className="fill-current ml-0.5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">FlowSpeed</h1>
              <p className="text-[11px] text-slate-400 font-medium">YouTube, at your pace.</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeNav === 'dashboard'
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveNav('rules')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeNav === 'rules'
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck size={17} />
              Rules
            </button>

            <button
              onClick={() => setActiveNav('profiles')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeNav === 'profiles'
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User size={17} />
              Profiles
            </button>
          </nav>
        </div>

        {/* Active Profile Widget at Sidebar Bottom */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Active Profile
          </span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs">{activeProfile?.name || 'Active Profile'}</span>
            <button
              onClick={() => setActiveNav('profiles')}
              className="px-2 py-0.5 text-[10px] font-semibold bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-md transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT BODY */}
      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        {/* HEADER TOP BAR */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight capitalize">{activeNav}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Smart playback rules for every YouTube video.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddRuleOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
            >
              <Plus size={16} />
              Add Rule
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD VIEW */}
        {activeNav === 'dashboard' && (
          <div className="space-y-8">
            {/* Top Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Video Widget */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-4 flex-1">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Current Video
                  </span>
                  {currentVideo ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={currentVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                        alt="Channel Avatar"
                        className="w-14 h-14 rounded-full object-cover border-2 border-purple-500/40"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base">{currentVideo.channelName}</h3>
                          <CheckCircle size={14} className="text-purple-400 fill-current" />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{currentVideo.title}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">{currentVideo.videoUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No video currently playing.</p>
                  )}
                </div>

                {/* Speed Readout & Gauge Visual */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-slate-400 block">Applied Speed</span>
                    <span className="text-4xl font-black text-indigo-400 tracking-tight">
                      {resolution.speed.toFixed(2)}x
                    </span>
                    <span className="mt-1 inline-block px-2.5 py-0.5 text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-full">
                      {resolution.sourceBadge}
                    </span>
                  </div>

                  {/* SVG Gauge Indicator */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-slate-800"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-indigo-500 transition-all duration-500"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="250"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <Play size={18} className="text-indigo-400 fill-current absolute" />
                  </div>
                </div>
              </div>

              {/* Quick Stats Widget */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                <h3 className="font-bold text-sm tracking-tight text-slate-300">Quick Stats</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400">Videos Adjusted</p>
                      <p className="text-lg font-bold mt-0.5">{data.stats.videosAdjusted}</p>
                    </div>
                    <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ↑ {data.stats.videosAdjustedChangePct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div>
                      <p className="text-slate-400">Time Saved</p>
                      <p className="text-lg font-bold mt-0.5">{data.stats.timeSavedHours} hrs</p>
                    </div>
                    <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ↑ {data.stats.timeSavedChangePct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <p className="text-slate-400">Rules Created</p>
                    <p className="text-base font-bold">{data.rules.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule Priority Hierarchy Summary Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Rule Priority <span className="text-xs text-slate-400 font-normal">(high to low)</span></h3>
                  <p className="text-xs text-slate-400 mt-0.5">Rules evaluate top-down until the first condition matches.</p>
                </div>
                <button
                  onClick={() => setActiveNav('rules')}
                  className="text-xs text-purple-400 hover:underline font-semibold"
                >
                  Manage Priority
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { priority: 1, icon: Video, title: 'Video Specific Rule', count: `${data.rules.filter(r => r.type === 'video').length} rule` },
                  { priority: 2, icon: Layers, title: 'Channel + Title Rule', count: `${data.rules.filter(r => r.type === 'channel_title').length} rules` },
                  { priority: 3, icon: User, title: 'Channel Rule', count: `${data.rules.filter(r => r.type === 'channel').length} rules` },
                  { priority: 4, icon: Hash, title: 'Keyword Rule', count: `${data.rules.filter(r => r.type === 'keyword').length} rules` },
                  { priority: 5, icon: Globe, title: 'Global Default', count: `${data.globalDefaultSpeed.toFixed(2)}x` },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.priority}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-slate-500 font-mono font-bold">{item.priority}</span>
                        <div className="p-2 rounded-lg bg-slate-900 text-purple-400">
                          <ItemIcon size={15} />
                        </div>
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-medium">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES TABLE VIEW */}
        {activeNav === 'rules' && (
          <div className="space-y-6">
            {/* Search and Category Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'all', label: `All (${data.rules.length})` },
                  { id: 'channel', label: `Channel (${data.rules.filter(r => r.type === 'channel').length})` },
                  { id: 'channel_title', label: `Channel + Title (${data.rules.filter(r => r.type === 'channel_title').length})` },
                  { id: 'keyword', label: `Keyword (${data.rules.filter(r => r.type === 'keyword').length})` },
                  { id: 'video', label: `Video (${data.rules.filter(r => r.type === 'video').length})` },
                  { id: 'global', label: `Global (${data.rules.filter(r => r.type === 'global').length})` },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setRuleCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      ruleCategoryFilter === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={ruleSearchQuery}
                  onChange={(e) => setRuleSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Rules Data Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-semibold">
                    <th className="py-3 px-4 w-12 text-center">Priority</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Rule</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Speed</th>
                    <th className="py-3 px-4">Profile</th>
                    <th className="py-3 px-4 w-20 text-center">Status</th>
                    <th className="py-3 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                        No custom speed rules created yet. Click "+ Add Rule" above to create your first rule!
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                          {rule.priority}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {rule.type.replace('_', ' + ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">{rule.ruleName}</td>
                        <td className="py-3 px-4 text-slate-400">{rule.condition}</td>
                        <td className="py-3 px-4 font-extrabold text-purple-400">{rule.speed.toFixed(2)}x</td>
                        <td className="py-3 px-4 text-slate-400">{rule.profileName || 'Study Mode'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleRuleStatus(rule.id)}
                            className={`w-8 h-4 rounded-full transition-colors relative inline-block ${
                              rule.isEnabled ? 'bg-purple-600' : 'bg-slate-800'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.25 ${
                              rule.isEnabled ? 'left-4' : 'left-0.5'
                            }`} />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button onClick={() => handleDeleteRule(rule.id)} className="hover:text-red-400">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROFILES VIEW */}
        {activeNav === 'profiles' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.profiles.map((profile) => {
                const isActive = profile.id === data.activeProfileId;
                return (
                  <div
                    key={profile.id}
                    className={`p-6 rounded-2xl border transition-all flex items-start gap-4 ${
                      isActive
                        ? 'bg-purple-600/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${
                      isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {profile.iconName === 'GraduationCap' && <GraduationCap size={20} />}
                      {profile.iconName === 'BookOpen' && <BookOpen size={20} />}
                      {profile.iconName === 'Tv' && <Tv size={20} />}
                      {profile.iconName === 'Sliders' && <Sliders size={20} />}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">{profile.name}</h3>
                        {isActive ? (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-purple-600 text-white rounded-full">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              saveFlowSpeedStorage({ activeProfileId: profile.id });
                              setData((prev) => prev ? { ...prev, activeProfileId: profile.id } : null);
                            }}
                            className="text-xs font-semibold text-purple-400 hover:underline"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{profile.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ADD RULE MODAL DIALOG */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Add New Speed Rule</h3>
              <button onClick={() => setIsAddRuleOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English with Lucy"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Rule Type</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as RulePriorityType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="channel">Channel Rule</option>
                  <option value="channel_title">Channel + Title Keyword</option>
                  <option value="keyword">Keyword Rule</option>
                  <option value="video">Video Specific Rule</option>
                  <option value="global">Global Default</option>
                </select>
              </div>

              {(newRuleType === 'channel' || newRuleType === 'channel_title') && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Channel Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Khan Academy"
                    value={newRuleChannel}
                    onChange={(e) => setNewRuleChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {(newRuleType === 'keyword' || newRuleType === 'channel_title') && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. tutorial, lecture, listening"
                    value={newRuleKeyword}
                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Playback Speed (x)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.25"
                  max="4.0"
                  value={newRuleSpeed}
                  onChange={(e) => setNewRuleSpeed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 shadow-lg shadow-purple-600/20"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
