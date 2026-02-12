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
  'process.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.VITE_BLOB_READ_WRITE_TOKEN || '')
}
});
