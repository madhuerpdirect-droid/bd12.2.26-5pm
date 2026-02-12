import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/bd12.2.26-5pm/',
  define: {
    // This exact line connects GitHub Secrets to your website code
    'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.VITE_BLOB_READ_WRITE_TOKEN)
  }
});
