import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // This is the Magnet: it pulls VITE_BLOB_READ_WRITE_TOKEN from GitHub
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/bd12.2.26-5pm/',
    define: {
      // This bakes the secret into your website so Vercel can see it
      'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(env.VITE_BLOB_READ_WRITE_TOKEN || process.env.VITE_BLOB_READ_WRITE_TOKEN)
    }
  };
});
