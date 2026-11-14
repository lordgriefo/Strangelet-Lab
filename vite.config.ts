import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { collabWebSocketPlugin } from './lib/collabWebSocketPlugin';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: false,
  },
  plugins: [react(), tailwindcss(), collabWebSocketPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
