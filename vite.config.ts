import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {

    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      '@mui/x-charts',
      '@mui/x-tree-view',
      'clsx',
      'dayjs',
    ],
    exclude: ['lucide-react']
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
});

