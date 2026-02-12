import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/bd12.2.26-5pm/', // This tells the browser your site is in this subfolder
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['@vercel/blob']
  },
  define: {
    'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.BLOB_READ_WRITE_TOKEN || '')
  }
});
