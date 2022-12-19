import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

// make resolver
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [glsl()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        waves: resolve(__dirname, 'waves.html'),
      },
    },
  },
});
