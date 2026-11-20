/**
 * El nombre del registro que se está viendo, para el título de la pestaña (spec 051, RF-58).
 *
 * El título lo pone el layout del panel a partir de la dirección (`tituloDeLaPestana`), y la
 * dirección no sabe cómo se llama la carpeta abierta de Documentos: `?carpeta=rut` es una clave,
 * y su nombre sale del catálogo de clases de ese lugar. En vez de enseñarle al layout ese catálogo,
 * la pantalla publica el nombre aquí y el layout lo antepone («RUT · Documentos · OCC»).
 *
 * Tampoco se escribe `document.title` desde la pantalla: el efecto del layout corre en otro orden y
 * lo pisaba.
 *
 * Con la carpeta abierta como pantalla nueva del Stack (T4 de la 051), la de abajo sigue montada.
 * Por eso cada pantalla quita al irse solo **su** nombre: si ya hay otro publicado, no lo toca.
 */
import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

const Contexto = createContext<{
  registro: string | null;
  publicar: Dispatch<SetStateAction<string | null>>;
} | null>(null);

export function ProveedorTituloDelRegistro({ children }: { children: ReactNode }) {
  const [registro, publicar] = useState<string | null>(null);
  return <Contexto.Provider value={{ registro, publicar }}>{children}</Contexto.Provider>;
}

/** El nombre publicado, para quien arma el título. */
export function useRegistroDeLaPestana(): string | null {
  return useContext(Contexto)?.registro ?? null;
}

/** La pantalla publica el nombre del registro abierto; `undefined` o vacío no publica nada. */
export function useTituloDelRegistro(nombre: string | undefined) {
  const publicar = useContext(Contexto)?.publicar;
  useEffect(() => {
    if (!publicar || !nombre) return;
    publicar(nombre);
    return () => publicar((actual) => (actual === nombre ? null : actual));
  }, [publicar, nombre]);
}
