import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'FlowSpeed — YouTube at your pace',
    description: 'Smart per-channel, keyword-based, and profile-driven YouTube playback speed manager.',
    version: '1.0.0',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['*://*.youtube.com/*'],
    action: {
      default_title: 'FlowSpeed',
    },
    options_ui: {
      open_in_tab: true,
    },
  },
});
