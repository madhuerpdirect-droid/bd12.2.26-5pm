import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // This line tells Vite to look into the GitHub environment for your secret
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/bd12.2.26-5pm/',
    define: {
      // This forces the secret into the code so the browser can see it
      'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(env.VITE_BLOB_READ_WRITE_TOKEN || process.env.VITE_BLOB_READ_WRITE_TOKEN)
    }
  };
});
