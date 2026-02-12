import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Setting the base to the repository name for GitHub Pages compatibility
  base: '/bd12.2.26-5pm/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  optimizeDeps: {
    include: ['@vercel/blob', 'react', 'react-dom']
  },
  define: {
    // Ensuring environment variables are available during build
    'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.BLOB_READ_WRITE_TOKEN || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});