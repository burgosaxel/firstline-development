import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.FIRSTLINE_API_ORIGIN ?? 'http://127.0.0.1:5184';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': { target: apiTarget, changeOrigin: false } }
  },
  preview: { host: '127.0.0.1' }
});
