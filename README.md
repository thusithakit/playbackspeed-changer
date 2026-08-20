# ⚡ FlowSpeed — YouTube at Your Pace

> Smart per-channel, keyword-driven, and profile-based YouTube playback speed manager browser extension.

FlowSpeed automatically applies the perfect playback speed to every YouTube video based on who uploaded it, what it's about, or your current learning profile.

---

## ✨ Features

- 🎯 **Per-Channel Speed Rules**: Automatically watch your favorite educational channels at 1.5x while keeping music or vlogs at 1.0x.
- 🏷️ **Title & Keyword Rules**: Automatically speed up lectures, tutorials, or long interviews using keyword conditions.
- ⚡ **Strict 5-Level Rule Priority Engine**:
  1. **Video Specific Rule**: Exact video URL / Video ID match.
  2. **Channel + Title Rule**: Specific channel name AND title keyword match.
  3. **Channel Rule**: Channel name or `@handle` match.
  4. **Keyword Rule**: Matches keywords in video title or description.
  5. **Global Default**: Fallback speed for all un-ruled videos.
- 🎛️ **In-Player HUD Badge Overlay**: Floating, semi-transparent HUD directly inside the YouTube video player with `-` and `+` manual speed controls.
- 📱 **Sleek Extension Popup**:
  - View live playing video metadata, applied speed readout, and rule badge.
  - Quick preset speed buttons (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
  - One-click `+ Add rule for this channel` CTA.
  - Built-in Dark Mode & Light Mode themes.
- 📊 **Full Options Dashboard**:
  - Searchable rules data table with category filter pills (`All`, `Channel`, `Channel+Title`, `Keyword`, `Video`, `Global`).
  - Profile switcher (`Learning Mode`, `Study Mode`, `Entertainment`, `Custom Profile`).
  - Rule creation modal dialog and real-time playback statistics.
- 🛡️ **HTML5 Video Rate-Lock**: Continuous rate enforcer prevents YouTube's internal player script from resetting your chosen playback speed.

---

## 🛠️ Tech Stack

- **Framework**: [WXT (Web Extension Tools)](https://wxt.dev)
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Browser API**: Chrome Extension Manifest V3 (`storage`, `activeTab`, `scripting`)

---

## 📁 Repository Structure

```text
.
├── public/
│   └── icon/             # Extension icons (16px, 32px, 48px, 96px, 128px)
├── src/
│   ├── entrypoints/
│   │   ├── background.ts # Background service worker
│   │   ├── content.ts    # YouTube content script & player HUD overlay
│   │   ├── options/      # Full options dashboard (index.html, main.tsx, App.tsx)
│   │   └── popup/        # Chrome popup UI (index.html, main.tsx, App.tsx, style.css)
│   ├── types/
│   │   └── flowspeed.ts  # TypeScript type definitions for rules & storage
│   └── utils/
│       ├── engine.ts     # Priority resolution engine
│       └── storage.ts    # Chrome local storage manager
├── wxt.config.ts         # WXT & Tailwind Vite plugin configuration
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thusithakit/playbackspeed-changer.git
   cd playbackspeed-changer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## 🏃 Development & Building

### Run Development Server (HMR)

```bash
npm run dev
```

### Type Check

```bash
npm run compile
```

### Production Build

```bash
npm run build
```
The output extension bundle will be generated in `.output/chrome-mv3/`.

---

## 🧩 How to Load in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3/` folder in your project directory.
5. Open YouTube ([https://www.youtube.com](https://www.youtube.com)) to start using **FlowSpeed**!

---

## 📄 License

This project is open-source under the MIT License.
