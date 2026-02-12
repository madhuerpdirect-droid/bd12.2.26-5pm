import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/bd12.2.26-5pm/', 
  build: {
    outDir: 'dist',
  }
});
