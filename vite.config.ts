import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'process.version': '"v16.0.0"',
    'process.platform': '"browser"'
  }
});
