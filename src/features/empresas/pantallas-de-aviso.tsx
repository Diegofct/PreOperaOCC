/**
 * Las pantallas que solo dicen algo: no tener acceso (RF-12), una página que no existe y
 * un módulo del menú que todavía se está construyendo.
 */

import { Aviso } from '@/features/panel/componentes';
import { MarcoPantalla } from '@/features/panel/marco';
import { SIN_ACCESO } from '@/shared/rules/empresas';

/** RF-12: la dirección de una empresa o una obra que no le corresponde. Sin datos. */
export function PantallaSinAcceso() {
  return (
    <MarcoPantalla titulo="Sin acceso" descripcion="Esta sección es de otra empresa u otra obra.">
      <Aviso tono="info">{SIN_ACCESO}.</Aviso>
    </MarcoPantalla>
  );
}

export function PantallaQueNoExiste() {
  return (
    <MarcoPantalla titulo="No existe" descripcion="La dirección no corresponde a ninguna pantalla.">
      <Aviso tono="info">Esta página no existe. Use el menú para llegar a lo que busca.</Aviso>
    </MarcoPantalla>
  );
}

/**
 * Un módulo de los menús definitivos (cambio del 2026-10-27) que llega con su propia
 * spec, de la 034 a la 038. Ninguna sube a producción con este aviso (RF-53): la T22
 * comprueba que no quede ninguno.
 */
export function PantallaEnConstruccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <MarcoPantalla titulo={titulo} descripcion={descripcion}>
      <Aviso tono="info">Este módulo está en construcción.</Aviso>
    </MarcoPantalla>
  );
}

