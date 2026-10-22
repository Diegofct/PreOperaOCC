/**
 * Leer el texto de un Word (.docx) para el asistente (spec 028, RF-66). **Solo servidor.**
 *
 * Es el lector de Word de n8n (`n8n-evolutionapi/scripts/lector_archivos.js`, spec 023)
 * pasado a TypeScript: un .docx es un ZIP con `word/document.xml` adentro, así que basta
 * con encontrar esa entrada, descomprimirla y sacar los párrafos y las tablas. Sin
 * dependencias (principio 8): la descompresión es `DecompressionStream('deflate-raw')`,
 * que trae Node y no pasa por el empaquetador como `node:zlib`.
 *
 * Los párrafos van uno por línea y las tablas una fila por línea, con « | » entre celdas.
 */

interface EntradaDelZip {
  metodo: number;
  comprimido: number;
  local: number;
}

function entradasDelZip(bytes: Uint8Array): Map<string, EntradaDelZip> {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // El directorio central termina con una firma que se busca desde el final.
  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error('no es un archivo ZIP');
  const cuantas = vista.getUint16(fin + 10, true);
  let p = vista.getUint32(fin + 16, true);
  const decodificador = new TextDecoder();
  const entradas = new Map<string, EntradaDelZip>();
  for (let n = 0; n < cuantas; n++) {
    if (vista.getUint32(p, true) !== 0x02014b50) throw new Error('el ZIP está dañado');
    const largoNombre = vista.getUint16(p + 28, true);
    const largoExtra = vista.getUint16(p + 30, true);
    const largoComentario = vista.getUint16(p + 32, true);
    entradas.set(decodificador.decode(bytes.subarray(p + 46, p + 46 + largoNombre)), {
      metodo: vista.getUint16(p + 10, true),
      comprimido: vista.getUint32(p + 20, true),
      local: vista.getUint32(p + 42, true),
    });
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return entradas;
}

async function leerEntrada(bytes: Uint8Array, entrada: EntradaDelZip): Promise<string> {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (vista.getUint32(entrada.local, true) !== 0x04034b50) throw new Error('el ZIP está dañado');
  const inicio = entrada.local + 30 + vista.getUint16(entrada.local + 26, true) + vista.getUint16(entrada.local + 28, true);
  const datos = bytes.slice(inicio, inicio + entrada.comprimido);
  if (entrada.metodo === 0) return new TextDecoder().decode(datos);
  if (entrada.metodo !== 8) throw new Error(`usa una compresión que no se puede leer (${entrada.metodo})`);
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(flujo).text();
}

function decodificar(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** El texto de un párrafo, con sus tabulaciones y saltos. */
function textoDelParrafo(p: string): string {
  let texto = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) {
    if (m[1] !== undefined) texto += decodificar(m[1]);
    else texto += m[0] === '<w:tab/>' ? '\t' : '\n';
  }
  return texto.trim();
}

/** El texto del Word, o un error con qué pasó. */
export async function leerWord(bytes: Uint8Array): Promise<{ texto: string } | { error: string }> {
  let documento: string | null = null;
  try {
    const entrada = entradasDelZip(bytes).get('word/document.xml');
    if (entrada) documento = await leerEntrada(bytes, entrada);
  } catch (fallo) {
    // Los .doc antiguos y los .docx con contraseña son archivos OLE, no ZIP.
    const ole = bytes.length >= 4 && new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true) === 0xe011cfd0;
    return {
      error: ole
        ? 'es un Word antiguo (.doc) o tiene contraseña; guárdelo como .docx o PDF'
        : `no se pudo abrir (${fallo instanceof Error ? fallo.message : 'dañado'})`,
    };
  }
  if (!documento) return { error: 'no parece un Word: no tiene contenido' };
  const cuerpo = /<w:body>([\s\S]*)<\/w:body>/.exec(documento)?.[1] ?? documento;
  const lineas: string[] = [];
  // Las tablas, enteras, en su lugar; lo demás, párrafo por párrafo.
  for (const trozo of cuerpo.split(/(<w:tbl>[\s\S]*?<\/w:tbl>)/)) {
    if (trozo.startsWith('<w:tbl>')) {
      for (const fila of trozo.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) ?? []) {
        const celdas = (fila.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
          (tc.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? []).map(textoDelParrafo).filter(Boolean).join(' '),
        );
        if (celdas.some(Boolean)) lineas.push(celdas.join(' | '));
      }
    } else {
      for (const p of trozo.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? []) {
        const texto = textoDelParrafo(p);
        if (texto) lineas.push(texto);
      }
    }
  }
  if (lineas.length === 0) return { error: 'no tiene texto' };
  return { texto: lineas.join('\n') };
}
