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

export const INITIAL_STATS: PlaybackStats = {
  videosAdjusted: 0,
  videosAdjustedChangePct: 0,
  timeSavedHours: 0,
  timeSavedChangePct: 0,
  rulesCreated: 0,
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
