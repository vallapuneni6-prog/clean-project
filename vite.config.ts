import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '127.0.0.1',
        proxy: {
          '/api': {
            target: 'http://localhost/clean-project/api',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            ws: false,
            bypass: (req, res, options) => {
              // Log proxy requests for debugging
              console.log('[PROXY] ' + req.method + ' ' + req.url);
              if (req.headers.authorization) {
                console.log('[PROXY] Authorization: ' + req.headers.authorization.substring(0, 30) + '...');
              }
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
