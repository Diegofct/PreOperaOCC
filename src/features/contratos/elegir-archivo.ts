/**
 * Abre el selector de archivos del navegador y devuelve el elegido, o `null` si se
 * cerró sin elegir. Solo en la web: el panel no existe en el celular.
 *
 * Lo usan las pólizas y los documentos del contrato (PDF o imagen) y la importación del
 * presupuesto (.xlsx) (spec 031).
 */
import { Platform } from 'react-native';

export function elegirArchivo(aceptar: string): Promise<File | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = aceptar;
    entrada.onchange = () => resolver(entrada.files?.[0] ?? null);
    entrada.click();
  });
}
