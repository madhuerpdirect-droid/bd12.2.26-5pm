import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix #1: Load only variables starting with VITE_ (removes the empty prefix)
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    base: '/bd12.2.26-5pm/',
    define: {
      // Fix #2: Clean injection without the confusing process.env fallback
      'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(env.VITE_BLOB_READ_WRITE_TOKEN || '')
    }
  };
});
