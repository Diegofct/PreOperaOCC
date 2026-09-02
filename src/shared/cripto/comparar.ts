/**
 * La única comparación en tiempo constante del repositorio.
 *
 * Vivía privada dentro de `src/features/auth/pin.ts`. Salió de ahí cuando el
 * servidor necesitó la misma operación para las contraseñas web: dos copias de
 * esto es como acaba existiendo una versión buena y otra que alguien "simplificó"
 * a `===` sin entender para qué estaba.
 *
 * Módulo puro: lo importan Hermes, Node y Cloudflare Workers por igual.
 */

/**
 * Compara dos cadenas sin cortar en el primer carácter distinto.
 *
 * Un `===` normal para en cuanto encuentra una diferencia, y ese tiempo es
 * medible desde fuera: repitiendo la petición se puede ir adivinando un hash
 * carácter a carácter. Aquí siempre se recorre la cadena entera.
 *
 * La longitud sí se filtra —salir antes cuando no coinciden revela cuánto mide
 * el valor correcto— pero en este proyecto ambos lados son hashes de longitud
 * fija, así que no hay nada que revelar.
 */
export function igualEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}
