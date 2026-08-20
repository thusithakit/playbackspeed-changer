import type { Rule, CurrentVideoInfo, FlowSpeedStorage } from '../types/flowspeed';
import { resolveSpeedForVideo } from '../utils/engine';
import { DEFAULT_STORAGE_DATA } from '../utils/storage';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    console.log('FlowSpeed YouTube Content Script initialized');

    let currentRules: Rule[] = DEFAULT_STORAGE_DATA.rules;
    let activeProfileId = DEFAULT_STORAGE_DATA.activeProfileId;
    let globalDefaultSpeed = DEFAULT_STORAGE_DATA.globalDefaultSpeed;
    let manualSpeedOverride: number | null = null;
    let hudElement: HTMLElement | null = null;
    let currentTargetSpeed = 1.00;
    let isEnforcingRate = false;

    // Check if Chrome extension context is still valid
    const isExtensionValid = (): boolean => {
      try {
        return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
      } catch (e) {
        return false;
      }
    };

    // Load initial storage settings
    const loadSettings = () => {
      if (!isExtensionValid()) return;
      const STORAGE_KEY = 'flowspeed_extension_storage_v1';
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (res: { [key: string]: any }) => {
            if (!isExtensionValid()) return;
            const data: FlowSpeedStorage = res?.[STORAGE_KEY] || DEFAULT_STORAGE_DATA;
            currentRules = data.rules || DEFAULT_STORAGE_DATA.rules;
            activeProfileId = data.activeProfileId || DEFAULT_STORAGE_DATA.activeProfileId;
            globalDefaultSpeed = data.globalDefaultSpeed || DEFAULT_STORAGE_DATA.globalDefaultSpeed;
            manualSpeedOverride = data.manualSpeedOverride !== undefined ? data.manualSpeedOverride : null;
            applySpeedToVideo();
          });
        } else {
          applySpeedToVideo();
        }
      } catch (err) {
        // Suppress invalidated extension context error
      }
    };

    // Listen for storage changes
    if (isExtensionValid() && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      try {
        chrome.storage.onChanged.addListener((changes) => {
          if (!isExtensionValid()) return;
          if (changes['flowspeed_extension_storage_v1']) {
            const newValue = changes['flowspeed_extension_storage_v1'].newValue as FlowSpeedStorage;
            if (newValue) {
              currentRules = newValue.rules || currentRules;
              activeProfileId = newValue.activeProfileId || activeProfileId;
              globalDefaultSpeed = newValue.globalDefaultSpeed || globalDefaultSpeed;
              manualSpeedOverride = newValue.manualSpeedOverride !== undefined ? newValue.manualSpeedOverride : manualSpeedOverride;
              applySpeedToVideo();
            }
          }
        });
      } catch (err) {
        // Context invalidated
      }
    }

    // Comprehensive YouTube Video Details Extraction
    const extractVideoDetails = (): Partial<CurrentVideoInfo> | null => {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v') || '';
      const videoElem = document.querySelector('video') as HTMLVideoElement | null;

      if (!videoId && !videoElem) return null;

      // Extract Title
      let title = '';
      const titleSelectors = [
        'ytd-watch-metadata #title h1',
        'h1.ytd-watch-metadata',
        '#title h1',
        'h1.ytd-video-primary-info-renderer',
        'ytd-watch-flexy h1',
        '#container h1.title',
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim()) {
          title = el.textContent.trim();
          break;
        }
      }
      if (!title) {
        title = document.title.replace(/\s*-\s*YouTube$/i, '').trim() || 'YouTube Video';
      }

      // Extract Channel Name
      let channelName = '';
      const channelSelectors = [
        'ytd-watch-metadata #channel-name a',
        '#owner #channel-name a',
        '#upload-info #channel-name a',
        'ytd-channel-name #text',
        'a.yt-simple-endpoint.ytd-channel-name',
        '#channel-name',
      ];
      for (const sel of channelSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim()) {
          channelName = el.textContent.trim();
          break;
        }
      }
      if (!channelName) {
        const handleLink = document.querySelector('a[href*="/@"], a[href*="/channel/"]');
        if (handleLink && handleLink.textContent?.trim()) {
          channelName = handleLink.textContent.trim();
        }
      }
      if (!channelName) {
        channelName = 'YouTube Channel';
      }

      const formatTime = (secs: number) => {
        if (isNaN(secs) || !isFinite(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      const currentTimeFormatted = videoElem ? formatTime(videoElem.currentTime) : '0:00';
      const durationFormatted = videoElem ? formatTime(videoElem.duration) : '0:00';

      return {
        title,
        channelName,
        videoId,
        videoUrl: window.location.href,
        currentTimeFormatted,
        durationFormatted,
        thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined,
      };
    };

    // Lock playbackRate on HTML5 video element
    const enforceVideoSpeed = (videoElem: HTMLVideoElement, targetSpeed: number) => {
      currentTargetSpeed = targetSpeed;
      if (Math.abs(videoElem.playbackRate - targetSpeed) > 0.01) {
        isEnforcingRate = true;
        videoElem.playbackRate = targetSpeed;
        setTimeout(() => { isEnforcingRate = false; }, 50);
      }

      if (!(videoElem as any).__flowspeed_attached) {
        (videoElem as any).__flowspeed_attached = true;

        const handleRateChange = () => {
          if (!isEnforcingRate && Math.abs(videoElem.playbackRate - currentTargetSpeed) > 0.01) {
            isEnforcingRate = true;
            videoElem.playbackRate = currentTargetSpeed;
            setTimeout(() => { isEnforcingRate = false; }, 50);
          }
        };

        videoElem.addEventListener('ratechange', handleRateChange);
        videoElem.addEventListener('play', handleRateChange);
        videoElem.addEventListener('playing', handleRateChange);
      }
    };

    // Set Manual Speed Helper
    const setManualSpeed = (newSpeed: number) => {
      manualSpeedOverride = newSpeed;
      if (!isExtensionValid()) {
        applySpeedToVideo();
        return;
      }
      const STORAGE_KEY = 'flowspeed_extension_storage_v1';
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (res: any) => {
            if (!isExtensionValid()) return;
            const data = res?.[STORAGE_KEY] || {};
            chrome.storage.local.set({ [STORAGE_KEY]: { ...data, manualSpeedOverride: newSpeed } });
          });
        }
      } catch (e) {
        // Context invalidated
      }
      applySpeedToVideo();
    };

    // Create HUD Element once with event listeners & stopPropagation
    const createHUDElement = (): HTMLElement => {
      const hud = document.createElement('div');
      hud.id = 'flowspeed-player-hud';
      hud.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 12px 16px;
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        width: 180px;
        user-select: none;
        transition: opacity 0.2s ease;
      `;

      // Prevent YouTube player from hijacking click/mouse events
      const stopEvent = (e: Event) => e.stopPropagation();
      hud.addEventListener('click', stopEvent);
      hud.addEventListener('mousedown', stopEvent);
      hud.addEventListener('mouseup', stopEvent);
      hud.addEventListener('pointerdown', stopEvent);

      hud.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Applied Speed</span>
          <span id="fs-close-hud" style="cursor: pointer; color: #94a3b8; font-size: 14px; padding: 2px;">✕</span>
        </div>
        <div id="fs-speed-val" style="font-size: 22px; font-weight: 800; color: #a855f7; line-height: 1;">1.00x</div>
        <div id="fs-badge-val" style="margin-top: 4px; display: inline-block; padding: 2px 6px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 999px; font-size: 9px; color: #c084fc; font-weight: 600;">
          Global Default
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
          <button id="fs-hud-minus" style="background: #1e293b; border: 1px solid #334155; color: #fff; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-weight: bold;">-</button>
          <span id="fs-stepper-val" style="font-weight: bold; font-size: 11px;">1.00</span>
          <button id="fs-hud-plus" style="background: #1e293b; border: 1px solid #334155; color: #fff; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-weight: bold;">+</button>
        </div>
      `;

      // Attach event listeners ONCE
      hud.querySelector('#fs-close-hud')?.addEventListener('click', (e) => {
        e.stopPropagation();
        hud.style.display = 'none';
      });

      hud.querySelector('#fs-hud-minus')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentSpeed = currentTargetSpeed || 1.0;
        const newSpeed = Math.max(0.25, parseFloat((currentSpeed - 0.25).toFixed(2)));
        setManualSpeed(newSpeed);
      });

      hud.querySelector('#fs-hud-plus')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentSpeed = currentTargetSpeed || 1.0;
        const newSpeed = Math.min(4.0, parseFloat((currentSpeed + 0.25).toFixed(2)));
        setManualSpeed(newSpeed);
      });

      return hud;
    };

    // Render or update HUD overlay text without destroying DOM
    const updateInPlayerHUD = (speed: number, sourceBadge: string) => {
      const playerElem = document.querySelector('#movie_player, .html5-video-player, #player-container');
      if (!playerElem) return;

      if (!hudElement || !document.contains(hudElement)) {
        hudElement = createHUDElement();
        playerElem.appendChild(hudElement);
      }

      hudElement.style.display = 'block';
      const speedVal = hudElement.querySelector('#fs-speed-val');
      const badgeVal = hudElement.querySelector('#fs-badge-val');
      const stepperVal = hudElement.querySelector('#fs-stepper-val');

      if (speedVal) speedVal.textContent = `${speed.toFixed(2)}x`;
      if (badgeVal) badgeVal.textContent = sourceBadge;
      if (stepperVal) stepperVal.textContent = speed.toFixed(2);
    };

    // Main function to calculate & apply playback speed
    const applySpeedToVideo = () => {
      const details = extractVideoDetails();
      const res = resolveSpeedForVideo(details, currentRules, activeProfileId, globalDefaultSpeed, manualSpeedOverride);

      const videoElem = document.querySelector('video') as HTMLVideoElement | null;
      if (videoElem) {
        enforceVideoSpeed(videoElem, res.speed);
      }

      // Update currentVideo in storage for popup & dashboard
      if (details && (details.videoId || details.title !== 'YouTube Video')) {
        const fullInfo: CurrentVideoInfo = {
          title: details.title || 'YouTube Video',
          channelName: details.channelName || 'YouTube Channel',
          videoId: details.videoId || 'unknown',
          videoUrl: details.videoUrl || window.location.href,
          thumbnailUrl: details.thumbnailUrl,
          currentTimeFormatted: details.currentTimeFormatted,
          durationFormatted: details.durationFormatted,
          currentSpeed: res.speed,
          appliedRuleSource: res.sourceBadge,
          appliedRuleType: res.ruleType === 'manual' ? undefined : res.ruleType,
          isManualOverride: res.ruleType === 'manual',
        };

        if (isExtensionValid()) {
          const STORAGE_KEY = 'flowspeed_extension_storage_v1';
          try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.get([STORAGE_KEY], (existing: any) => {
                if (!isExtensionValid()) return;
                const data = existing?.[STORAGE_KEY] || {};
                chrome.storage.local.set({
                  [STORAGE_KEY]: {
                    ...data,
                    currentVideo: fullInfo,
                  },
                });
              });
            }
          } catch (e) {
            // Context invalidated
          }
        }
      }

      // Update HUD overlay text
      updateInPlayerHUD(res.speed, res.sourceBadge);
    };

    // Listen for SPA navigation events
    window.addEventListener('yt-navigate-finish', () => {
      manualSpeedOverride = null;
      setTimeout(applySpeedToVideo, 300);
      setTimeout(applySpeedToVideo, 1000);
    });

    // Message listener from popup
    if (isExtensionValid() && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      try {
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
          if (msg.type === 'SET_SPEED') {
            manualSpeedOverride = msg.speed;
            applySpeedToVideo();
            sendResponse({ success: true });
          } else if (msg.type === 'GET_VIDEO_INFO') {
            const videoInfo = extractVideoDetails();
            sendResponse({ videoInfo });
          }
        });
      } catch (e) {
        // Context invalidated
      }
    }

    // Initial trigger & periodic check with auto-stop on invalidation
    loadSettings();
    const intervalId = setInterval(() => {
      if (!isExtensionValid()) {
        clearInterval(intervalId);
        return;
      }
      applySpeedToVideo();
    }, 500);
  },
});
