/**
 * La puerta de todos los endpoints.
 *
 * Sustituye a `solo-desarrollo.ts`, que era un tapón mientras esto no existía y
 * que se borra en el mismo commit: dejar los dos puestos sería tener dos
 * controles de acceso donde hace falta uno, y en cuanto hay dos alguien acaba
 * quitando el que estorba sin mirar cuál era.
 *
 * Se invoca como **primera línea** de cada ruta, siempre igual:
 *
 *     const sesion = await requerirSesion(peticion);
 *     if (sesion instanceof Response) return sesion;
 *
 * Esa forma —devolver o la persona o la respuesta de rechazo— es fea de leer una
 * vez y difícil de equivocar: no hay manera de olvidarse de comprobar el
 * resultado, porque el tipo obliga a distinguir los dos casos antes de usarlo.
 */
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { credencialesWeb } from '@/db/servidor/esquema';
import { personaDeLaPeticion, type PersonaEnSesion } from '@/features/auth/servidor/sesion';
import {
  alcanza,
  avisoDeModuloApagado,
  moduloApagado,
  motivoDeRechazo,
  type Accion,
  type Modulo,
} from '@/shared/rules/permisos';

import { errorDePeticion } from './respuestas';

export type { PersonaEnSesion };

/**
 * Exige una sesión abierta. Devuelve la persona, o la respuesta de rechazo.
 *
 * `exigirClaveDefinitiva` es lo que hace de verdad obligatorio el cambio de una
 * contraseña temporal: sin esto, bastaría con navegar directamente a otra URL
 * del panel para saltarse la pantalla. Solo las rutas de cambiar la propia clave
 * y de cerrar sesión lo desactivan.
 */
export async function requerirSesion(
  peticion: Request,
  opciones: { exigirClaveDefinitiva?: boolean } = {},
): Promise<PersonaEnSesion | Response> {
  const persona = await personaDeLaPeticion(peticion);
  if (!persona) return errorDePeticion('Necesita ingresar.', 401);

  // El operador tiene su propia superficie. Su sitio es el celular, con PIN, y
  // el panel no le enseñaría nada que le sirva en obra.
  if (persona.rol === 'operador') {
    return errorDePeticion('Esta cuenta es de operador: su acceso es la app del celular.', 403);
  }

  const [credencial] = await baseServidor()
    .select({ debeCambiar: credencialesWeb.debeCambiar })
    .from(credencialesWeb)
    .where(eq(credencialesWeb.usuarioId, persona.id))
    .limit(1);

  const debeCambiarClave = credencial?.debeCambiar ?? false;

  if (debeCambiarClave && opciones.exigirClaveDefinitiva !== false) {
    return errorDePeticion('Tiene que cambiar su contraseña temporal antes de continuar.', 409);
  }

  return { ...persona, debeCambiarClave };
}

/** Además de sesión, exige gerencia. Para lo que no le toca a un residente. */
export async function requerirAdmin(peticion: Request): Promise<PersonaEnSesion | Response> {
  const sesion = await requerirSesion(peticion);
  if (sesion instanceof Response) return sesion;

  if (sesion.rol !== 'admin') {
    return errorDePeticion('Esta acción es solo para la gerencia.', 403);
  }
  return sesion;
}

/**
 * La puerta con nombre y apellido: además de sesión, exige el permiso concreto.
 *
 * Recibe módulo y acción, y le pregunta a la tabla de `shared/rules/permisos`,
 * que es la misma que usa la barra de navegación para decidir qué enseña. Esa es
 * toda la gracia: el menú y la cerradura no pueden desalinearse, porque leen la
 * misma frase.
 *
 * Se prefiere esto a ir multiplicando `requerirAdmin` en variantes —
 * `requerirGerenciaOResidente`, `requerirQuienPuedaAnular`— porque por ese camino
 * se llega a catorce funciones parecidas y a olvidarse de una.
 */
export async function requerirPermiso(
  peticion: Request,
  modulo: Modulo,
  accion: Accion,
): Promise<PersonaEnSesion | Response> {
  const sesion = await requerirSesion(peticion);
  if (sesion instanceof Response) return sesion;

  if (!alcanza(sesion.rol, modulo, accion)) {
    // Qué no se puede y quién sí, leído de la misma tabla que decide (008/RF-13).
    return errorDePeticion(motivoDeRechazo(modulo, accion), 403);
  }

  // El cargo no basta: la obra tiene que llevar el módulo (spec 017, RF-9). Va aquí
  // y no en cada ruta de almacén y cantera por la misma razón por la que existe esta
  // guardia: una ruta que se olvide de comprobarlo no se nota hasta que alguien entra
  // por fuera del panel. La gerencia no se filtra —no está adscrita a una obra—; lo
  // que a ella se le ocultan son las obras apagadas dentro del módulo (RF-10).
  if (sesion.obraId && moduloApagado(modulo, sesion.modulosDeObra)) {
    return errorDePeticion(avisoDeModuloApagado(modulo), 403);
  }

  return sesion;
}
