import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // This line manually pulls environment variables from the GitHub build server
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/bd12.2.26-5pm/',
    define: {
      // This forces the token into the browser even if Vite tries to hide it
      'import.meta.env.VITE_BLOB_READ_WRITE_TOKEN': JSON.stringify(env.VITE_BLOB_READ_WRITE_TOKEN || process.env.VITE_BLOB_READ_WRITE_TOKEN)
    }
  };
});
