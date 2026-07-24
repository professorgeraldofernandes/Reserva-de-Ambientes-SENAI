import { ungzip } from 'pako';

/**
 * Compatibilidade para navegadores que não implementam DecompressionStream.
 * A carga compactada da planilha utiliza o formato gzip.
 */
if (typeof globalThis.DecompressionStream === 'undefined') {
  class GzipDecompressionStream {
    constructor(format) {
      if (format !== 'gzip') {
        throw new TypeError(`Formato de descompactação não suportado: ${format}`);
      }

      const chunks = [];
      const stream = new TransformStream({
        transform(chunk) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        },
        flush(controller) {
          const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
          const compressed = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of chunks) {
            compressed.set(chunk, offset);
            offset += chunk.length;
          }

          controller.enqueue(ungzip(compressed));
        }
      });

      this.readable = stream.readable;
      this.writable = stream.writable;
    }
  }

  globalThis.DecompressionStream = GzipDecompressionStream;
}
