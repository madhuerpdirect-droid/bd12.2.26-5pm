
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/bd12.2.26-5pm/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  optimizeDeps: {
    include: ['@vercel/blob']
  },
  define: {
    'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.BLOB_READ_WRITE_TOKEN || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
