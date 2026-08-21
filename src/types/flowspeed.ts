export type RulePriorityType = 'video' | 'channel_title' | 'channel' | 'keyword' | 'global';

export interface Rule {
  id: string;
  priority: number; // 1 to 5
  type: RulePriorityType;
  ruleName: string;
  condition: string;
  channelName?: string;
  keyword?: string;
  videoId?: string;
  speed: number;
  profileId: string;
  profileName?: string;
  isEnabled: boolean;
  createdAt: number;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  iconName: string; // 'GraduationCap' | 'BookOpen' | 'Tv' | 'Sliders'
  isActive: boolean;
}

export interface CurrentVideoInfo {
  title: string;
  channelName: string;
  channelUrl?: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  currentTimeFormatted?: string;
  durationFormatted?: string;
  currentSpeed: number;
  appliedRuleSource: string; // e.g. "By Channel Rule", "Manual Override", "Global Default"
  appliedRuleType?: RulePriorityType;
  isManualOverride: boolean;
}

export interface DailyStat {
  date: string;
  timeSavedSeconds: number;
  videosAdjusted: number;
}

export interface PlaybackStats {
  videosAdjusted: number;
  videosAdjustedChangePct: number;
  timeSavedHours: number;
  timeSavedChangePct: number;
  rulesCreated: number;
  totalTimeSavedSeconds: number;
  todayVideosAdjusted: number;
  todayTimeSavedSeconds: number;
  lastUpdatedDate: string;
  dailyHistory: Record<string, DailyStat>;
}

export interface FlowSpeedStorage {
  rules: Rule[];
  profiles: Profile[];
  activeProfileId: string;
  globalDefaultSpeed: number;
  manualSpeedOverride: number | null; // Speed override if user manually picked a speed
  currentVideo: CurrentVideoInfo | null;
  stats: PlaybackStats;
  theme: 'dark' | 'light';
}
