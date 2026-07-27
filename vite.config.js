import { defineConfig } from 'vite';

export default defineConfig({
  // Caminho-base necessário para publicação no GitHub Pages.
  base: '/Reserva-de-Ambientes-SENAI/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
