import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clientCountBase = (env.API_CLIENT_COUNT_BASE || env.API_BASE || 'http://10.13.222.10:5010').replace(/\/$/, '');
  const macOwnerBase = (env.API_MAC_OWNER_BASE || 'http://10.13.222.10:5001').replace(/\/$/, '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api/client-count': {
          target: clientCountBase,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/api/mac-owners': {
          target: macOwnerBase,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: { target: 'es2020', sourcemap: false },
  };
});
