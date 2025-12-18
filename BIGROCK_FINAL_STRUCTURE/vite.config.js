import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    // Proxy API requests to Laragon
    proxy: {
      '/api': {
        target: 'http://localhost/clean-project/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  define: {
    // Expose environment variables to the client
    __APP_ENV__: JSON.stringify(process.env.APP_ENV || 'development'),
  },
});