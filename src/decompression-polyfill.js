import { ungzip } from 'pako';

/**
 * Implementação compatível de DecompressionStream para gzip.
 *
 * Alguns navegadores corporativos expõem DecompressionStream, mas bloqueiam
 * sua execução por política. Por isso, substituímos sempre a implementação
 * nativa pela versão baseada em pako.
 */
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
