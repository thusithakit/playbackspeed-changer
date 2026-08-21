import React, { useState, useEffect } from 'react';
import type { Rule, FlowSpeedStorage } from '../../types/flowspeed';
import { loadFlowSpeedStorage, saveFlowSpeedStorage, DEFAULT_STORAGE_DATA } from '../../utils/storage';
import { resolveSpeedForVideo } from '../../utils/engine';
import { 
  Play, 
  Settings, 
  Plus, 
  Sliders, 
  GraduationCap, 
  BookOpen, 
  Tv, 
  ShieldCheck, 
  User, 
  Sun, 
  Moon, 
  ExternalLink, 
  PictureInPicture2
} from 'lucide-react';
import './style.css';

export function App() {
  const [data, setData] = useState<FlowSpeedStorage>(DEFAULT_STORAGE_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'rules' | 'profiles'>('current');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load storage data on mount and listen to changes
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const storage = await loadFlowSpeedStorage();
        if (isMounted) {
          setData(storage);
          setTheme(storage.theme || 'dark');
          setIsLoaded(true);
        }
      } catch (err) {
        console.warn('Fallback initializing popup data:', err);
        if (isMounted) {
          setData(DEFAULT_STORAGE_DATA);
          setIsLoaded(true);
        }
      }
    }

    init();

    // Query current active YouTube tab to fetch live video info directly
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url && activeTab.url.includes('youtube.com/watch')) {
          try {
            const urlObj = new URL(activeTab.url);
            const vId = urlObj.searchParams.get('v') || '';
            const cleanTitle = (activeTab.title || '').replace(/\s*-\s*YouTube$/i, '').trim();

            if (vId && isMounted) {
              setData((prev) => ({
                ...prev,
                currentVideo: {
                  title: cleanTitle || 'YouTube Video',
                  channelName: prev.currentVideo?.channelName || 'YouTube Channel',
                  videoId: vId,
                  videoUrl: activeTab.url || '',
                  thumbnailUrl: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
                  currentTimeFormatted: '0:00',
                  durationFormatted: '0:00',
                  currentSpeed: prev.manualSpeedOverride || prev.globalDefaultSpeed || 1.00,
                  appliedRuleSource: prev.manualSpeedOverride ? 'Manual Override' : 'Global Default',
                  isManualOverride: !!prev.manualSpeedOverride,
                },
              }));
            }
          } catch (err) {
            console.warn('Tab URL parsing fallback:', err);
          }

          if (activeTab.id) {
            chrome.tabs.sendMessage(activeTab.id, { type: 'GET_VIDEO_INFO' }, (response) => {
              if (chrome.runtime.lastError) return;
              if (response && response.videoInfo && isMounted) {
                setData((prev) => ({
                  ...prev,
                  currentVideo: { ...prev.currentVideo, ...response.videoInfo },
                }));
              }
            });
          }
        }
      });
    }

    // Storage listener for real-time reactivity
    const storageListener = (changes: { [key: string]: any }) => {
      if (changes['flowspeed_extension_storage_v1']) {
        const newValue = changes['flowspeed_extension_storage_v1'].newValue;
        if (newValue && isMounted) {
          setData((prev) => ({ ...prev, ...newValue }));
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
      return () => {
        isMounted = false;
        chrome.storage.onChanged.removeListener(storageListener);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const currentVideo = data.currentVideo;
  const resolution = resolveSpeedForVideo(
    currentVideo,
    data.rules,
    data.activeProfileId,
    data.globalDefaultSpeed,
    data.manualSpeedOverride
  );

  const appliedSpeed = resolution.speed;
  const appliedBadge = resolution.sourceBadge;

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveFlowSpeedStorage({ theme: nextTheme });
  };

  // Open Full Options Dashboard
  const handleOpenDashboard = (page = 'dashboard') => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    } else {
      window.open(`/options.html#${page}`, '_blank');
    }
  };

  // Select Preset Speed
  const handleSelectPreset = (speed: number) => {
    const updatedData = { ...data, manualSpeedOverride: speed };
    setData(updatedData);
    saveFlowSpeedStorage({ manualSpeedOverride: speed });

    // Send message directly to YouTube tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_SPEED', speed }, () => {
            // Read chrome.runtime.lastError to handle tabs where content script is not loaded
            if (chrome.runtime.lastError) {
              // Ignore disconnected tab error silently
            }
          });
        }
      });
    }
  };

  // Add Rule for Current Channel
  const handleAddChannelRule = () => {
    if (!currentVideo?.channelName) return;

    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      priority: 3,
      type: 'channel',
      ruleName: currentVideo.channelName,
      condition: 'Channel matches',
      channelName: currentVideo.channelName,
      speed: appliedSpeed,
      profileId: data.activeProfileId,
      profileName: data.profiles.find((p) => p.id === data.activeProfileId)?.name || 'Active Profile',
      isEnabled: true,
      createdAt: Date.now(),
    };

    const updatedRules = [newRule, ...data.rules];
    saveFlowSpeedStorage({ rules: updatedRules });
    setData((prev) => ({ ...prev, rules: updatedRules }));
    setActiveTab('rules');
  };

  // Select Active Profile
  const handleSelectProfile = (profileId: string) => {
    const updatedProfiles = data.profiles.map((p) => ({
      ...p,
      isActive: p.id === profileId,
    }));
    saveFlowSpeedStorage({ profiles: updatedProfiles, activeProfileId: profileId });
    setData((prev) => ({ ...prev, profiles: updatedProfiles, activeProfileId: profileId }));
  };

  // Toggle Rule Enable/Disable
  const handleToggleRule = (ruleId: string) => {
    const updatedRules = data.rules.map((r) =>
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    );
    saveFlowSpeedStorage({ rules: updatedRules });
    setData((prev) => ({ ...prev, rules: updatedRules }));
  };

  const handleToggleOverlay = async () => {
    console.log('Sending TOGGLE_HUD message to active tab...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_HUD' }, (response) => {
          // Suppress errors if content script isn't loaded on non-YouTube tabs
          if (chrome.runtime.lastError) {
            console.warn('Content script not reachable:', chrome.runtime.lastError.message);
          } else {
            console.log('Toggle response from page:', response);
          }
        });
      }
    } catch (err) {
      console.error('Failed to send toggle message:', err);
    }
  };

  const isDark = theme === 'dark';

  if (!isLoaded) {
    return (
      <div className="w-[360px] h-[520px] bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`w-[360px] h-[520px] flex flex-col justify-between transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Bar */}
      <header className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Play size={14} className="fill-current ml-0.5" />
          </div>
          <span className="font-bold text-base tracking-tight">FlowSpeed</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleOverlay}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Toggle Speed Overlay"
          >
            <PictureInPicture2 size={16} />
          </button>
          <button
            onClick={handleToggleTheme}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Toggle Dark/Light Mode"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => handleOpenDashboard('settings')}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => handleOpenDashboard('dashboard')}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Open Full Dashboard"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: CURRENT VIDEO */}
        {activeTab === 'current' && (
          <div className="space-y-4">
            {/* Current Video Header Card */}
            <div>
              <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Current Video
              </span>

              {currentVideo ? (
                <div className={`mt-1.5 p-2.5 rounded-xl border flex items-center gap-3 ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <img
                    src={currentVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                    alt="Thumbnail"
                    className="w-14 h-10 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs truncate leading-tight">
                      {currentVideo.channelName || 'YouTube Video'}
                    </h4>
                    <p className={`text-[11px] truncate mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {currentVideo.title || 'Playing video'}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {currentVideo.currentTimeFormatted || '0:00'} / {currentVideo.durationFormatted || '10:53'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`mt-1.5 p-4 rounded-xl border text-center text-xs ${
                  isDark ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  No active YouTube video detected
                </div>
              )}
            </div>

            {/* Applied Speed Section */}
            <div className="text-center py-2 space-y-1">
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Applied Speed
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-extrabold text-indigo-400 tracking-tight">
                  {appliedSpeed.toFixed(2)}x
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  {appliedBadge}
                </span>
              </div>
            </div>

            {/* Preset Speed Buttons */}
            <div className="grid grid-cols-6 gap-1.5">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => {
                const isSelected = Math.abs(appliedSpeed - spd) < 0.05;
                return (
                  <button
                    key={spd}
                    onClick={() => handleSelectPreset(spd)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-[1.03]'
                        : isDark
                        ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {spd}
                  </button>
                );
              })}
            </div>

            {/* Channel & Default Rules Readout */}
            <div className={`p-3 rounded-xl border space-y-2 text-xs ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>This channel</span>
                <span className="font-bold text-purple-400">
                  {appliedSpeed.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>YouTube default</span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>1.00x</span>
              </div>
            </div>

            {/* Add Rule CTA Button */}
            <button
              onClick={handleAddChannelRule}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
            >
              <Plus size={15} />
              Add rule for this channel
            </button>
          </div>
        )}

        {/* Tab 2: RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Active Rules ({data.rules.filter((r) => r.isEnabled).length})
              </h3>
              <button
                onClick={() => handleOpenDashboard('rules')}
                className="text-xs text-purple-400 hover:underline"
              >
                Manage All
              </button>
            </div>

            <div className="space-y-2">
              {data.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold truncate">{rule.ruleName}</span>
                      <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20">
                        {rule.type}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rule.condition}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-purple-400">{rule.speed.toFixed(2)}x</span>
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-7 h-4 rounded-full transition-colors relative ${
                        rule.isEnabled ? 'bg-purple-600' : isDark ? 'bg-slate-800' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                        rule.isEnabled ? 'left-3.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: PROFILES */}
        {activeTab === 'profiles' && (
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Select Profile
            </h3>

            <div className="space-y-2">
              {data.profiles.map((profile) => {
                const isActive = profile.id === data.activeProfileId;
                return (
                  <div
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-purple-600/15 border-purple-500/50 shadow-sm'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive ? 'bg-purple-600 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {profile.iconName === 'GraduationCap' && <GraduationCap size={16} />}
                      {profile.iconName === 'BookOpen' && <BookOpen size={16} />}
                      {profile.iconName === 'Tv' && <Tv size={16} />}
                      {profile.iconName === 'Sliders' && <Sliders size={16} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs">{profile.name}</h4>
                        {isActive && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-purple-500 text-white rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 leading-snug ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {profile.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className={`px-2 py-2 border-t grid grid-cols-3 gap-1 ${
        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
      }`}>
        <button
          onClick={() => setActiveTab('current')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'current'
              ? 'text-purple-400 bg-purple-500/10'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Play size={14} className={activeTab === 'current' ? 'fill-current' : ''} />
          Current
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'rules'
              ? 'text-purple-400 bg-purple-500/10'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck size={14} />
          Rules
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'profiles'
              ? 'text-purple-400 bg-purple-500/10'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={14} />
          Profiles
        </button>
      </nav>
    </div>
  );
}

export default App;
