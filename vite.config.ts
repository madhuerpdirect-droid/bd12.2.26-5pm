import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // This "Magnet" pulls your secret from the GitHub build environment
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/bd12.2.26-5pm/',
    define: {
      // This forces the secret into your live website code
      'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(env.VITE_BLOB_READ_WRITE_TOKEN || process.env.VITE_BLOB_READ_WRITE_TOKEN)
    }
  };
});
