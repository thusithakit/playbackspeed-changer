import type { Rule, Profile, CurrentVideoInfo, FlowSpeedStorage, PlaybackStats } from '../types/flowspeed';

const STORAGE_KEY = 'flowspeed_extension_storage_v1';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'learning',
    name: 'Learning Mode',
    description: 'Slower speed for language learning, tutorials and conversations.',
    iconName: 'GraduationCap',
    isActive: true,
  },
  {
    id: 'study',
    name: 'Study Mode',
    description: 'Faster speed for lectures, courses and explanations.',
    iconName: 'BookOpen',
    isActive: false,
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Normal speed for vlogs, shows and entertainment.',
    iconName: 'Tv',
    isActive: false,
  },
  {
    id: 'custom',
    name: 'Custom Profile',
    description: 'Create your own rules and preferences.',
    iconName: 'Sliders',
    isActive: false,
  },
];

export const INITIAL_RULES: Rule[] = [];

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const INITIAL_STATS: PlaybackStats = {
  videosAdjusted: 0,
  videosAdjustedChangePct: 0,
  timeSavedHours: 0,
  timeSavedChangePct: 0,
  rulesCreated: 0,
  totalTimeSavedSeconds: 0,
  todayVideosAdjusted: 0,
  todayTimeSavedSeconds: 0,
  lastUpdatedDate: getTodayDateString(),
  dailyHistory: {},
};

export const DEFAULT_STORAGE_DATA: FlowSpeedStorage = {
  rules: INITIAL_RULES,
  profiles: INITIAL_PROFILES,
  activeProfileId: 'learning',
  globalDefaultSpeed: 1.00,
  manualSpeedOverride: null,
  currentVideo: null,
  stats: INITIAL_STATS,
  theme: 'dark',
};

export async function loadFlowSpeedStorage(): Promise<FlowSpeedStorage> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await new Promise<{ [key: string]: any }>((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (res: { [key: string]: any }) => resolve(res || {}));
      });
      if (result && result[STORAGE_KEY]) {
        return { ...DEFAULT_STORAGE_DATA, ...result[STORAGE_KEY] };
      } else {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_STORAGE_DATA }, () => resolve());
        });
        return DEFAULT_STORAGE_DATA;
      }
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_STORAGE_DATA, ...JSON.parse(raw) };
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STORAGE_DATA));
        return DEFAULT_STORAGE_DATA;
      }
    }
  } catch (err) {
    console.warn('FlowSpeed storage read fallback:', err);
    return DEFAULT_STORAGE_DATA;
  }
}

export async function saveFlowSpeedStorage(data: Partial<FlowSpeedStorage>): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (res: { [key: string]: any }) => {
        const current = res?.[STORAGE_KEY] || DEFAULT_STORAGE_DATA;
        const updated = { ...current, ...data };
        chrome.storage.local.set({ [STORAGE_KEY]: updated });
      });
    } else {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const current = currentRaw ? JSON.parse(currentRaw) : DEFAULT_STORAGE_DATA;
      const updated = { ...current, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('FlowSpeed storage write error:', err);
  }
}

export async function recordPlaybackTimeSaved(secondsSaved: number): Promise<void> {
  if (secondsSaved <= 0) return;
  try {
    const data = await loadFlowSpeedStorage();
    const today = getTodayDateString();
    const currentStats = data.stats || INITIAL_STATS;

    const isNewDay = currentStats.lastUpdatedDate !== today;
    const todaySavedSecs = (isNewDay ? 0 : currentStats.todayTimeSavedSeconds || 0) + secondsSaved;
    const todayVideos = isNewDay ? 0 : currentStats.todayVideosAdjusted || 0;

    const newTotalSavedSecs = (currentStats.totalTimeSavedSeconds || 0) + secondsSaved;
    const newHours = parseFloat((newTotalSavedSecs / 3600).toFixed(2));

    const dailyHistory = { ...(currentStats.dailyHistory || {}) };
    const todayHistory = dailyHistory[today] || { date: today, timeSavedSeconds: 0, videosAdjusted: 0 };
    dailyHistory[today] = {
      ...todayHistory,
      timeSavedSeconds: todayHistory.timeSavedSeconds + secondsSaved,
    };

    const prevHours = currentStats.timeSavedHours || 0;
    const changePct = prevHours > 0 
      ? Math.round(((newHours - prevHours) / prevHours) * 100)
      : (newHours > 0 ? 100 : 0);

    const updatedStats: PlaybackStats = {
      ...currentStats,
      totalTimeSavedSeconds: newTotalSavedSecs,
      timeSavedHours: newHours,
      todayTimeSavedSeconds: todaySavedSecs,
      todayVideosAdjusted: todayVideos,
      lastUpdatedDate: today,
      dailyHistory,
      rulesCreated: data.rules.length,
      timeSavedChangePct: Math.max(0, changePct),
    };

    await saveFlowSpeedStorage({ stats: updatedStats });
  } catch (err) {
    console.error('Error recording playback time saved:', err);
  }
}

export async function recordVideoAdjusted(videoId: string): Promise<void> {
  try {
    const data = await loadFlowSpeedStorage();
    const today = getTodayDateString();
    const currentStats = data.stats || INITIAL_STATS;

    const isNewDay = currentStats.lastUpdatedDate !== today;
    const todayVideos = (isNewDay ? 0 : currentStats.todayVideosAdjusted || 0) + 1;
    const todaySavedSecs = isNewDay ? 0 : currentStats.todayTimeSavedSeconds || 0;

    const prevVideos = currentStats.videosAdjusted || 0;
    const newTotalVideos = prevVideos + 1;

    const dailyHistory = { ...(currentStats.dailyHistory || {}) };
    const todayHistory = dailyHistory[today] || { date: today, timeSavedSeconds: 0, videosAdjusted: 0 };
    dailyHistory[today] = {
      ...todayHistory,
      videosAdjusted: todayHistory.videosAdjusted + 1,
    };

    const changePct = prevVideos > 0 
      ? Math.round(((newTotalVideos - prevVideos) / prevVideos) * 100) 
      : 100;

    const updatedStats: PlaybackStats = {
      ...currentStats,
      videosAdjusted: newTotalVideos,
      todayVideosAdjusted: todayVideos,
      todayTimeSavedSeconds: todaySavedSecs,
      lastUpdatedDate: today,
      dailyHistory,
      rulesCreated: data.rules.length,
      videosAdjustedChangePct: Math.max(0, changePct),
    };

    await saveFlowSpeedStorage({ stats: updatedStats });
  } catch (err) {
    console.error('Error recording video adjusted:', err);
  }
}

export async function resetPlaybackStats(): Promise<void> {
  const freshStats: PlaybackStats = {
    videosAdjusted: 0,
    videosAdjustedChangePct: 0,
    timeSavedHours: 0,
    timeSavedChangePct: 0,
    rulesCreated: 0,
    totalTimeSavedSeconds: 0,
    todayVideosAdjusted: 0,
    todayTimeSavedSeconds: 0,
    lastUpdatedDate: getTodayDateString(),
    dailyHistory: {},
  };
  await saveFlowSpeedStorage({ stats: freshStats });
}
