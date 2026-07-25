import { defineConfig } from 'vite';

/**
 * Corrige a rotina de descompactação da carga histórica durante o build.
 * Alguns navegadores corporativos bloqueiam Response(stream).text(),
 * retornando "Failed to fetch" mesmo sem requisição de rede.
 */
function replaceImportedDataDecompression() {
  return {
    name: 'replace-imported-data-decompression',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/imported-data.js')) return null;

      const functionPattern = /async function gunzipBase64\(value\)\s*\{[\s\S]*?\n\}/;
      const replacement = `function gunzipBase64(value) {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return JSON.parse(ungzip(bytes, { to: 'string' }));
}`;

      if (!functionPattern.test(code)) {
        throw new Error('Rotina gunzipBase64 não localizada em imported-data.js.');
      }

      return {
        code: `import { ungzip } from 'pako';\n${code.replace(functionPattern, replacement)}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: '/Reserva-de-Ambientes-SENAI/',
  plugins: [replaceImportedDataDecompression()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});