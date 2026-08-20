import type { Rule, CurrentVideoInfo, RulePriorityType } from '../types/flowspeed';

export interface ResolutionResult {
  speed: number;
  sourceBadge: string;
  ruleType: RulePriorityType | 'manual';
  matchedRuleId?: string;
}

export function resolveSpeedForVideo(
  videoInfo: Partial<CurrentVideoInfo> | null,
  rules: Rule[],
  activeProfileId: string,
  globalDefaultSpeed = 1.00,
  manualOverrideSpeed: number | null = null
): ResolutionResult {
  if (manualOverrideSpeed !== null && manualOverrideSpeed > 0) {
    return {
      speed: manualOverrideSpeed,
      sourceBadge: 'Manual Override',
      ruleType: 'manual',
    };
  }

  if (!videoInfo || (!videoInfo.title && !videoInfo.channelName && !videoInfo.videoId)) {
    return {
      speed: globalDefaultSpeed,
      sourceBadge: 'Global Default',
      ruleType: 'global',
    };
  }

  // Filter rules for active profile (or rules with profileId === activeProfileId)
  const activeRules = rules.filter((r) => r.isEnabled && (r.profileId === activeProfileId || r.profileId === 'default' || !r.profileId));

  const channel = (videoInfo.channelName || '').toLowerCase().trim();
  const title = (videoInfo.title || '').toLowerCase().trim();
  const videoId = (videoInfo.videoId || '').trim();

  // 1. Video Specific Rule (Priority 1)
  const videoRule = activeRules.find((r) => r.type === 'video' && r.videoId && videoId && (r.videoId === videoId || videoId.includes(r.videoId)));
  if (videoRule) {
    return {
      speed: videoRule.speed,
      sourceBadge: 'Video Specific Rule',
      ruleType: 'video',
      matchedRuleId: videoRule.id,
    };
  }

  // 2. Channel + Title Rule (Priority 2)
  const channelTitleRule = activeRules.find((r) => {
    if (r.type !== 'channel_title') return false;
    const matchChannel = r.channelName ? channel.includes(r.channelName.toLowerCase()) : true;
    const matchTitle = r.keyword ? title.includes(r.keyword.toLowerCase()) : false;
    return matchChannel && matchTitle;
  });
  if (channelTitleRule) {
    return {
      speed: channelTitleRule.speed,
      sourceBadge: 'By Channel + Title Rule',
      ruleType: 'channel_title',
      matchedRuleId: channelTitleRule.id,
    };
  }

  // 3. Channel Rule (Priority 3)
  const channelRule = activeRules.find((r) => {
    if (r.type !== 'channel') return false;
    if (!r.channelName) return false;
    const targetChannel = r.channelName.toLowerCase().replace(/^@/, '');
    const currentChannel = channel.replace(/^@/, '');
    return currentChannel.includes(targetChannel) || targetChannel.includes(currentChannel);
  });
  if (channelRule) {
    return {
      speed: channelRule.speed,
      sourceBadge: 'By Channel Rule',
      ruleType: 'channel',
      matchedRuleId: channelRule.id,
    };
  }

  // 4. Keyword Rule (Priority 4)
  const keywordRule = activeRules.find((r) => {
    if (r.type !== 'keyword') return false;
    if (!r.keyword) return false;
    const keywords = r.keyword.toLowerCase().split(',').map((k) => k.trim());
    return keywords.some((kw) => kw && title.includes(kw));
  });
  if (keywordRule) {
    return {
      speed: keywordRule.speed,
      sourceBadge: 'By Keyword Rule',
      ruleType: 'keyword',
      matchedRuleId: keywordRule.id,
    };
  }

  // 5. Global Default (Priority 5)
  const globalRule = activeRules.find((r) => r.type === 'global');
  return {
    speed: globalRule ? globalRule.speed : globalDefaultSpeed,
    sourceBadge: 'Global Default',
    ruleType: 'global',
    matchedRuleId: globalRule?.id,
  };
}

export function calculateTimeSaved(durationSeconds: number, originalSpeed = 1.0, newSpeed = 1.0): number {
  if (newSpeed <= originalSpeed) return 0;
  const timeOriginal = durationSeconds / originalSpeed;
  const timeNew = durationSeconds / newSpeed;
  return (timeOriginal - timeNew) / 3600; // in hours
}
