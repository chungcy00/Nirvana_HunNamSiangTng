import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handler } from './server/media';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    resolve: { dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'] },
    plugins: [
      react(),
      {
        name: 'local-admin-media-service',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (['/api/copy-product', '/api/media-cleanup'].includes(req.url?.split('?')[0] || ''))
              void handler(req, res, env);
            else next();
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@supabase/')) return 'supabase';
            if (
              /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            )
              return 'react';
          },
        },
      },
    },
    server: { host: '127.0.0.1', port: 3002, strictPort: true },
  };
});
