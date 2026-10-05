import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import environment from './scripts/public-env.cjs';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode, command }) => ({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Existing Vercel REACT_APP_* configuration remains valid, but private
  // credentials and unknown keys are never added to the legacy browser object.
  define: {
    'process.env': JSON.stringify(environment.publicEnvironment(
      { ...loadEnv(mode, root, 'REACT_APP_'), ...process.env },
      command === 'serve' ? 'development' : 'production',
    )),
  },
  build: { outDir: 'build', sourcemap: false },
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
}));
