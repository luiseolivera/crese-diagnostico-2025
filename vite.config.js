import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
          theme: { extend: {} },
          plugins: [],
        }),
        autoprefixer(),
      ],
    },
  },
  build: { outDir: '../dist' },
  server: { port: 3000 },
});
