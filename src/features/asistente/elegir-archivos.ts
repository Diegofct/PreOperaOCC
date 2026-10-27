/**
 * Abre el selector de archivos del navegador y devuelve los elegidos (vacío si se cerró
 * sin elegir). Como `contratos/elegir-archivo.ts`, pero con varios a la vez: una pregunta
 * al asistente lleva hasta 5 adjuntos (spec 028, RF-67). Solo en la web.
 */
import { Platform } from 'react-native';

/** Lo que acepta el asistente (RF-66); el servidor lo vuelve a comprobar por el contenido. */
export const TIPOS_DEL_ASISTENTE = 'image/jpeg,image/png,image/webp,application/pdf,.xlsx,.docx';

export function elegirArchivos(aceptar: string): Promise<File[]> {
  if (Platform.OS !== 'web') return Promise.resolve([]);
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = aceptar;
    entrada.multiple = true;
    entrada.onchange = () => resolver(Array.from(entrada.files ?? []));
    entrada.click();
  });
}
