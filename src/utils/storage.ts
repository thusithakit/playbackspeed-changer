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

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-1',
    priority: 1,
    type: 'channel_title',
    ruleName: 'Khan Academy',
    condition: 'Title contains "tutorial"',
    channelName: 'Khan Academy',
    keyword: 'tutorial',
    speed: 1.50,
    profileId: 'study',
    profileName: 'Study Mode',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'rule-2',
    priority: 2,
    type: 'channel',
    ruleName: 'English with Lucy',
    condition: 'Channel matches',
    channelName: 'English with Lucy',
    speed: 0.75,
    profileId: 'learning',
    profileName: 'Learning Mode',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'rule-3',
    priority: 3,
    type: 'channel',
    ruleName: 'BBC Learning English',
    condition: 'Channel matches',
    channelName: 'BBC Learning English',
    speed: 0.75,
    profileId: 'learning',
    profileName: 'Learning Mode',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'rule-4',
    priority: 4,
    type: 'keyword',
    ruleName: 'english, listening, pronunciation',
    condition: 'Title or description',
    keyword: 'english, listening, pronunciation',
    speed: 0.75,
    profileId: 'learning',
    profileName: 'Learning Mode',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'rule-5',
    priority: 5,
    type: 'keyword',
    ruleName: 'lecture, university, class',
    condition: 'Title or description',
    keyword: 'lecture, university, class',
    speed: 1.50,
    profileId: 'study',
    profileName: 'Study Mode',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'rule-6',
    priority: 99,
    type: 'global',
    ruleName: 'Global Default',
    condition: 'All videos',
    speed: 1.00,
    profileId: 'default',
    profileName: 'Default',
    isEnabled: true,
    createdAt: Date.now() - 86400000 * 30,
  },
];

export const INITIAL_STATS: PlaybackStats = {
  videosAdjusted: 342,
  videosAdjustedChangePct: 24,
  timeSavedHours: 5.6,
  timeSavedChangePct: 18,
  rulesCreated: 17,
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
