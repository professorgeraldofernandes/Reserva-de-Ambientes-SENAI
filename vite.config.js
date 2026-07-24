import { defineConfig } from 'vite';

export default defineConfig({
  // Caminho-base necessário para publicação em GitHub Pages.
  base: '/Reserva-de-Ambientes-SENAI/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
