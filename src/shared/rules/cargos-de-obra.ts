/**
 * Las reglas de la spec 041 que no son la tabla de permisos: a qué acceso pasa cada persona
 * que tenía «Residente / Director», qué obras le quedan a alguien cuando cambia de acceso,
 * quién asigna obras a un Director de Obra y cuál es la obra en uso de una petición.
 *
 * Son puras y viven aquí, y no en la migración ni en las rutas, por lo de siempre: la
 * migración es SQL escrito a mano y una ruta es un `if` que en la siguiente se olvida. Escrito
 * aquí, `scripts/verificar-reglas.ts` lo prueba sin base y sin servidor, y la migración y las
 * rutas tienen contra qué compararse.
 */
import { ETIQUETA_ROL, ROLES, rolVeTodasLasObras, type Rol } from './permisos';

/**
 * Cómo se llama en pantalla un acceso guardado en la historia (RF-42, RF-52).
 *
 * La historia guarda el rol como texto, porque lo de antes de la 041 dice `supervisor` y ese
 * valor ya no es un `Rol`: se muestra con el nombre que tenía entonces, «Residente / Director».
 * Un valor desconocido se muestra tal cual en vez de inventarle un nombre.
 */
export function etiquetaDeAccesoHistorico(rol: string): string {
  if (rol === 'supervisor') return 'Residente / Director';
  return (ROLES as readonly string[]).includes(rol) ? ETIQUETA_ROL[rol as Rol] : rol;
}

/** Un tramo de la historia de accesos de una persona. `hasta` nulo es el vigente. */
export interface TramoDeAcceso {
  rol: string;
  desde: Date;
  hasta: Date | null;
}

/**
 * Cómo se llamaba el acceso de una persona en ese momento, o `null` si la historia no lo dice
 * (RF-42, RF-52). `desde` cuenta y `hasta` no: en el instante del cambio ya vale el acceso nuevo,
 * que es el que tenía quien hizo algo justo después de que se lo dieran.
 *
 * Sin historia no se inventa nada: las personas creadas por otro camino (WhatsApp, `crear-admin`)
 * pueden no tener fila, y decir un acceso que nadie registró sería peor que no decirlo.
 */
export function etiquetaDelAccesoEn(tramos: readonly TramoDeAcceso[], fecha: Date): string | null {
  const vigente = tramos
    .filter((t) => t.desde <= fecha && (t.hasta === null || t.hasta > fecha))
    .sort((a, b) => b.desde.getTime() - a.desde.getTime())[0];
  return vigente ? etiquetaDeAccesoHistorico(vigente.rol) : null;
}

/** Quien aprobó o anuló, como se lee en una historia: «Ana Ruiz (Residente / Director)». */
export function firmaConAcceso(nombre: string, etiqueta: string | null): string {
  return etiqueta ? `${nombre} (${etiqueta})` : nombre;
}

/**
 * A qué acceso pasa una persona al poner en marcha la 041 (RF-46 a RF-48), o `null` si no la
 * toca.
 *
 * Recibe el rol **de antes** como texto, porque `supervisor` ya no existe en `Rol`. El cargo
 * decide: «Director» → Director de Obra; «Residente 1» y «Residente 2» → Residente. Cualquier
 * otro cargo, o ninguno, queda como Residente, que es el acceso más bajo de los tres —sigue
 * registrando en su obra como hasta hoy y solo pierde aprobar y anular—, y marcado para que la
 * gerencia o el Director de Proyectos lo revisen (RF-51). Quien se queda **sin obra** también va
 * a esa lista, tenga el cargo que tenga (RF-65): no ve nada hasta que le asignen una, y alguien
 * tiene que enterarse. La migración 0040 hace lo mismo en SQL; si una cambia, la otra también.
 */
export function accesoTrasLaMigracion(
  rolDeAntes: string,
  cargo: string | null,
  tieneObra = true,
): { rol: Extract<Rol, 'residente' | 'director_obra'>; revisar: boolean } | null {
  if (rolDeAntes !== 'supervisor') return null;
  if (cargo === 'director') return { rol: 'director_obra', revisar: !tieneObra };
  if (cargo === 'residente_1' || cargo === 'residente_2') return { rol: 'residente', revisar: !tieneObra };
  return { rol: 'residente', revisar: true };
}

/**
 * Las obras que le quedan a una persona al pasar a otro acceso (RF-70, RF-71), o el motivo por
 * el que no se puede así.
 *
 * - De Director de Obra a Residente: el Residente está en una sola obra (RF-32), así que hay que
 *   escoger cuál conserva. Con una sola obra no hay nada que escoger y se toma esa: pedirle a
 *   alguien que elija entre una opción es una pregunta sin respuesta posible. Lo mismo al pasar
 *   a cualquier otro acceso de una sola obra (almacenista, operador…): el RF-70 solo nombra al
 *   Residente, pero guardar las dos obras en un acceso de una sería quedarse con una al azar.
 * - De Residente a Director de Obra: conserva la que tenía.
 * - A Director de Proyectos, o a cualquier acceso que ve todas sin estar en ninguna (gerencia,
 *   Encargado de OCC, Auxiliar Administrativa): ninguna (RF-16).
 *
 * Fuera de esos casos, las obras no cambian aquí: las de los demás accesos las sigue diciendo
 * su propia obra.
 */
export function obrasAlCambiarDeAcceso(
  antes: { rol: Rol; obras: readonly string[] },
  despues: Rol,
  obraEscogida: string | null | undefined,
): { ok: true; obras: string[] } | { ok: false; mensaje: string } {
  if (rolVeTodasLasObras(despues)) return { ok: true, obras: [] };
  if (antes.rol === 'director_obra' && despues !== 'director_obra') {
    if (!obraEscogida) {
      if (antes.obras.length === 1) return { ok: true, obras: [...antes.obras] };
      return { ok: false, mensaje: `Escoja cuál de sus obras conserva como ${ETIQUETA_ROL[despues]}.` };
    }
    if (!antes.obras.includes(obraEscogida)) return { ok: false, mensaje: 'Esa obra no es de este Director de Obra.' };
    return { ok: true, obras: [obraEscogida] };
  }
  return { ok: true, obras: [...antes.obras] };
}

/** Qué le pregunta el formulario de Personas sobre las obras. */
export type CampoDeObras = 'varias' | 'conservada' | 'una-obligatoria' | 'una' | 'ninguna';

/**
 * Qué campo de obras lleva el formulario de Personas para ese acceso (RF-17, RF-32, RF-70).
 *
 * Vive aquí y no en la pantalla porque son las mismas cuentas de `obrasAlCambiarDeAcceso` y de
 * `reparoDeObrasDelAcceso`: si la pantalla decidiera por su lado, pediría una cosa y el servidor
 * exigiría otra. `rolDeAntes` es el acceso que tenía al corregirla; en un alta no viene.
 *
 * La gerencia conserva su selector de siempre, que puede quedar vacío, salvo cuando viene de
 * Director de Obra: ahí no le queda ninguna obra y ofrecerle una sería una pregunta sin efecto.
 */
export function campoDeObras(rol: Rol, rolDeAntes: Rol | null = null): CampoDeObras {
  if (rol === 'director_obra') return 'varias';
  if (rolVeTodasLasObras(rol)) return rol === 'admin' && rolDeAntes !== 'director_obra' ? 'una' : 'ninguna';
  if (rolDeAntes === 'director_obra') return 'conservada';
  return rol === 'residente' ? 'una-obligatoria' : 'una';
}

/**
 * Por qué no puede asignar o retirar obras a esa persona, o `null` si puede (RF-13, RF-28).
 *
 * Lo hacen el Director de Proyectos y la gerencia. El Director de Obra no, **tampoco a sí
 * mismo**: qué obras dirige es decisión de arriba, y si pudiera asignarse una se daría acceso a
 * cualquier obra. Y solo se le asignan varias obras al Director de Obra: el Residente y los demás
 * cargos de obra llevan la suya, que se cambia al corregir a la persona.
 */
export function motivoParaNoAsignarObras(
  quien: { id: string; rol: Rol },
  aQuien: { id: string; rol: Rol },
): string | null {
  if (quien.rol !== 'admin' && quien.rol !== 'director_proyectos') {
    return 'Asignar o retirar obras a un Director de Obra lo hacen el Director de Proyectos o la Gerencia.';
  }
  if (aQuien.rol !== 'director_obra') return 'Solo al Director de Obra se le asignan varias obras.';
  return null;
}

/**
 * ¿Puede apagar la marca «revisar» de una persona? (RF-51)
 *
 * La lista de quienes pasaron a Residente por la migración es para que la Gerencia y el Director
 * de Proyectos decidan si les toca otro acceso; darlo es de ellos, y por eso cerrarla también. El
 * Director de Obra no, aunque dé accesos de obra: lo que se revisa es si alguien debería ser
 * director, y eso no lo decide otro director de obra.
 */
export function puedeMarcarRevisado(rol: Rol): boolean {
  return rol === 'admin' || rol === 'director_proyectos';
}

/**
 * La obra en la que trabaja una petición (RF-22, RF-23), o `null` si no hay ninguna clara.
 *
 * `pedida` es la obra de la pestaña —la de la dirección `/panel/proyectos/<obra>`—, y se acepta
 * solo si está entre las de la persona. Una obra ajena no es un error: se ignora, y la petición
 * queda en la única obra que tenga o en ninguna. Así pedir otra obra por la dirección da lo
 * mismo que si no existiera (RF-20), y nunca «ve todo».
 *
 * Sin obra clara —varias y ninguna pedida— es `null`: la pantalla lo manda a la lista de sus
 * obras (RF-24) y toda consulta filtrada da vacío, como hoy a quien no tiene obra.
 */
export function obraEnUso(pedida: string | null | undefined, obras: readonly string[]): string | null {
  if (pedida && obras.includes(pedida)) return pedida;
  return obras.length === 1 ? obras[0] : null;
}
