import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mui/material': path.resolve('./node_modules/@mui/material'),
      '@mui/icons-material': path.resolve('./node_modules/@mui/icons-material'),
      '@mui/x-data-grid': path.resolve('./node_modules/@mui/x-data-grid'),
      '@mui/x-date-pickers': path.resolve('./node_modules/@mui/x-date-pickers'),
      '@mui/x-charts': path.resolve('./node_modules/@mui/x-charts'),
      '@mui/x-tree-view': path.resolve('./node_modules/@mui/x-tree-view'),
      '@emotion/react': path.resolve('./node_modules/@emotion/react'),
      '@emotion/styled': path.resolve('./node_modules/@emotion/styled'),
      'clsx': path.resolve('./node_modules/clsx'),
      'dayjs': path.resolve('./node_modules/dayjs'),
    }
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      '@mui/x-charts',
      '@mui/x-tree-view',
      'clsx',
      'dayjs'
    ],
    exclude: ['lucide-react']
  },
  server: {
    // Ensure SPA fallback for client-side routing
    historyApiFallback: true,
  },
});
