import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor, baseServidorSerializable } from '@/db/servidor/cliente';
import { dispositivos, usuarios } from '@/db/servidor/esquema';
import {
  ejecutarLote,
  obrasQueNoExisten,
  personaConObras,
  sentenciasDeAcceso,
  sentenciasDeObras,
  type PersonaConObras,
} from '@/features/auth/servidor/accesos';
import { personaEditada } from '@/features/panel/contratos';
import { alcanzaLaObra, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import { motivoParaNoAsignarObras, obrasAlCambiarDeAcceso } from '@/shared/rules/cargos-de-obra';
import { empresaDeLaPersona, reparoDeObrasDelAcceso, reparoDelAccesoSinObra } from '@/shared/rules/empresas';
import {
  alcanza,
  ETIQUETA_ROL,
  motivoParaNoDarRol,
  motivoParaNoDarRolEnObra,
  puedeCambiarRol,
  rolVeTodasLasObras,
} from '@/shared/rules/permisos';

/** Editar y dar de baja una persona. `PATCH` y `DELETE /api/panel/personas/:id`. */

const COLUMNAS = {
  id: usuarios.id,
  usuario: usuarios.usuario,
  nombreCompleto: usuarios.nombreCompleto,
  documento: usuarios.documento,
  rol: usuarios.rol,
  cargo: usuarios.cargo,
  obraId: usuarios.obraId,
  activo: usuarios.activo,
  empresa: usuarios.empresa,
};

/** Un error con el campo que lo causó, para que el formulario lo señale. */
function errorDeCampo(campo: string, mensaje: string, estado = 422): Response {
  return Response.json({ error: mensaje, campos: { [campo]: mensaje } }, { status: estado });
}

/**
 * La persona, si existe y cae dentro del alcance de quien pregunta; si no, la respuesta.
 *
 * Va antes de cada escritura, y no basta con filtrar el listado: quien conoce un
 * id puede llamar directamente a esta ruta sin haber pasado por la pantalla.
 *
 * Desde la 041 mira **todas** las obras de la persona tocada: un Director de Obra no tiene
 * `obra_id`, y basta con que una de sus obras sea de quien pregunta. Y en vez de «solo la
 * gerencia toca a la gerencia», la regla general: solo corrige a alguien quien podría darle
 * ese acceso (`PUEDE_DAR`). El Director de Obra no corrige a otro director, ni a sí mismo.
 */
async function personaAlcanzable(sesion: PersonaEnSesion, id: string): Promise<PersonaConObras | Response> {
  const persona = await personaConObras(id);
  if (!persona) return noEncontrado('esa persona');
  const alcanzaAlguna =
    persona.obras.length === 0
      ? alcanzaLaObra(sesion, null)
      : persona.obras.some((obra) => alcanzaLaObra(sesion, obra));
  if (!alcanzaAlguna) return noEncontrado('esa persona');
  if (!puedeCambiarRol(sesion.rol, persona.rol)) {
    return errorDePeticion(`Su acceso no le permite corregir a quien tiene el acceso ${ETIQUETA_ROL[persona.rol]}.`, 403);
  }
  return persona;
}

/** Lo que hay que quitar y poner para pasar de una lista a otra. */
function diferencia(antes: readonly string[], despues: readonly string[]) {
  return {
    asignar: despues.filter((o) => !antes.includes(o)),
    retirar: antes.filter((o) => !despues.includes(o)),
  };
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const actual = await personaAlcanzable(sesion, id);
    if (actual instanceof Response) return actual;

    const { obras: obrasPedidas, obraConservada, ...columnas } = await cuerpoJson(peticion, personaEditada);

    // La segunda cerradura de la misma puerta: nadie da un acceso que no puede dar. 422 desde
    // la 041, con el texto de quién sí puede (RF-14, RF-27, RF-39).
    const motivo = columnas.rol ? motivoParaNoDarRol(sesion.rol, columnas.rol) : null;
    if (motivo) return errorDePeticion(motivo, 422);

    // Spec 035, RF-11: la Auxiliar Administrativa escribe en Personas pero no toca accesos. Solo
    // corrige a quien podría haber registrado —personas sin acceso al panel— y no activa
    // ni desactiva cuentas, que es dar o quitar un acceso. Para la gerencia no cambia nada.
    if (columnas.activo !== undefined && !alcanza(sesion.rol, 'personas', 'activar')) {
      return errorDePeticion('Su acceso no activa ni desactiva cuentas.', 403);
    }

    const rolNuevo = columnas.rol ?? actual.rol;
    const cambiaDeRol = rolNuevo !== actual.rol;

    // Las obras de un Director de Obra las asignan el Director de Proyectos y la gerencia,
    // nunca él mismo ni otro director (RF-13, RF-28).
    if (obrasPedidas !== undefined) {
      const noPuede = motivoParaNoAsignarObras(sesion, { id, rol: rolNuevo });
      if (noPuede) {
        const deQuien = sesion.rol === 'admin' || sesion.rol === 'director_proyectos';
        return deQuien ? errorDeCampo('obras', noPuede) : errorDePeticion(noPuede, 403);
      }
    }

    // Las obras como quedarían (RF-17, RF-32, RF-70, RF-71).
    const tocaObras = cambiaDeRol || obrasPedidas !== undefined || columnas.obraId !== undefined;
    let suyas = actual.obras;
    if (tocaObras) {
      const deDirectorABajar = actual.rol === 'director_obra' && cambiaDeRol;
      if (rolNuevo === 'director_obra') {
        suyas = obrasPedidas ?? (columnas.obraId ? [columnas.obraId] : actual.obras);
      } else if (columnas.obraId !== undefined && !deDirectorABajar) {
        suyas = columnas.obraId ? [columnas.obraId] : [];
      } else {
        const cambio = obrasAlCambiarDeAcceso(
          { rol: actual.rol, obras: actual.obras },
          rolNuevo,
          obraConservada ?? columnas.obraId ?? null,
        );
        if (!cambio.ok) return errorDeCampo('obraConservada', cambio.mensaje);
        suyas = cambio.obras;
      }

      // Quien no ve todas solo deja a la persona en obras suyas: una ajena «no existe» (RF-20,
      // RF-26).
      if (!veTodasLasObras(sesion) && suyas.some((o) => !sesion.obras.includes(o))) {
        return noEncontrado('esa obra');
      }
      const reparoDeObras = reparoDeObrasDelAcceso(rolNuevo, suyas);
      if (reparoDeObras) return errorDeCampo(reparoDeObras.campo, reparoDeObras.mensaje);
      const nuevas = suyas.filter((o) => !actual.obras.includes(o));
      if ((await obrasQueNoExisten(nuevas)).length > 0) return noEncontrado('esa obra');
    }

    // `obra_id` como quedaría: el Director de Obra y quien ve todas, sin; los demás, su obra.
    const obraIdNueva = tocaObras
      ? rolNuevo === 'director_obra' || rolVeTodasLasObras(rolNuevo)
        ? null
        : (suyas[0] ?? null)
      : actual.obraId;

    // Y con qué módulos queda su obra (spec 017, RF-11). Se mira el rol y la obra
    // **como quedarían**: cambiar de obra a un almacenista también puede dejarlo en
    // una que no lleva almacén.
    if (tocaObras || columnas.empresa !== undefined) {
      const sinModulo = motivoParaNoDarRolEnObra(rolNuevo, await modulosDeLaObra(obraIdNueva));
      if (sinModulo) {
        return Response.json({ error: sinModulo, campos: { rol: sinModulo } }, { status: 400 });
      }

      // Spec 034, RF-13; spec 035, RF-8: el Encargado de OCC y la Auxiliar Administrativa, como
      // quedarían, son de su empresa y sin obra.
      const reparo = reparoDelAccesoSinObra({
        rol: rolNuevo,
        obraId: obraIdNueva,
        empresa: columnas.empresa === undefined ? actual.empresa : columnas.empresa,
      });
      if (reparo) {
        return Response.json({ error: reparo.mensaje, campos: { [reparo.campo]: reparo.mensaje } }, { status: 400 });
      }
    }

    // La persona, sus obras de Director de Obra y su historia de accesos, en un solo lote.
    const db = baseServidor();
    const ahora = new Date();
    const asignadasDespues = rolNuevo === 'director_obra' ? suyas : [];
    await ejecutarLote(db, [
      db
        .update(usuarios)
        .set({ ...columnas, ...(tocaObras ? { obraId: obraIdNueva } : {}) })
        .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn))),
      ...(tocaObras ? sentenciasDeObras(db, id, diferencia(actual.asignadas, asignadasDespues), sesion.id, ahora) : []),
      ...(columnas.rol !== undefined || columnas.cargo !== undefined
        ? sentenciasDeAcceso(
            db,
            id,
            { rol: rolNuevo, cargo: columnas.cargo === undefined ? actual.cargo : columnas.cargo },
            sesion.id,
            ahora,
          )
        : []),
    ]);

    const [fila] = await db
      .select(COLUMNAS)
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    // La empresa como se ve: la suya o la de su rol (spec 033, RF-46).
    return fila
      ? ok({ ...fila, empresa: empresaDeLaPersona(fila.empresa, fila.rol), obras: suyas })
      : noEncontrado('esa persona');
  });
}

/**
 * Baja de una persona: `activo = false` **y** lápida, y sus celulares revocados.
 *
 * `activo` y `eliminado_en`, las dos y no una: `activo` es lo que el celular ya
 * sabe leer —la réplica local no tiene columna de lápida— y `eliminado_en` es lo
 * que libera el nombre de usuario para que se pueda reutilizar. El índice único
 * de `usuarios.usuario` es parcial justamente por esto.
 *
 * Nunca se borra la fila: hay preoperacionales y bitácoras firmados apuntándole,
 * y un registro cuyo autor desapareció deja de ser evidencia de nada.
 *
 * ── Los celulares se revocan en el mismo paso (spec 015, RF-19 a RF-21) ──
 *
 * Hasta la spec 015 esta ruta respondía 409 a quien tuviera un celular activado
 * y pedía «desactivarlo» primero, pero el panel no tenía con qué: a un operador
 * con teléfono no se le podía dar de baja. La razón del 409 sigue siendo cierta:
 * la lápida libera el nombre de usuario, y un teléfono que conservara su acceso
 * quedaría con una identidad que se le puede dar a otra persona. Revocar todos
 * sus dispositivos en la misma operación cierra esa puerta igual: la guardia del
 * móvil y el refresco de token rechazan un dispositivo revocado.
 *
 * Van en un solo `batch`, que Neon ejecuta como una transacción: o la persona
 * queda de baja y sin celulares, o queda como estaba (RF-21). Dos peticiones
 * separadas podían dejarla sin teléfono pero todavía activa. Lo que ese celular
 * tuviera sin subir se queda en él —la cola no borra— y ya no llega: la ventana
 * de confirmación lo avisa (RF-18).
 */
export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;
    // Dar de baja quita el acceso y la saca de la lista: es de quien da los accesos, la
    // gerencia (`activar`). La Auxiliar Administrativa no borra: retira (spec 035, RF-11, RF-22).
    if (!alcanza(sesion.rol, 'personas', 'activar')) {
      return errorDePeticion(
        'Solo la gerencia da de baja. Si la persona dejó de trabajar, retírela desde su ficha en Recursos Humanos.',
        403,
      );
    }

    const fueraDeAlcance = await personaAlcanzable(sesion, id);
    if (fueraDeAlcance instanceof Response) return fueraDeAlcance;

    // Darse de baja a uno mismo deja el sistema sin quien lo administre si
    // resulta ser el único administrador. Se corta aquí, que es barato.
    if (id === sesion.id) {
      return errorDePeticion('No puede darse de baja a usted mismo.', 400);
    }

    const ahora = new Date();
    const base = baseServidorSerializable();
    const [dada] = await base.batch([
      base
        .update(usuarios)
        .set({ activo: false, eliminadoEn: ahora })
        .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
        .returning(COLUMNAS),
      // Todos, no el primero: quien cambió de teléfono sin desactivar el viejo
      // tiene dos. Si la persona ya estaba de baja (otra gerencia se adelantó),
      // esto no revoca nada que debiera seguir vivo.
      base
        .update(dispositivos)
        .set({ revocadoEn: ahora })
        .where(and(eq(dispositivos.usuarioId, id), isNull(dispositivos.revocadoEn))),
    ]);

    const [fila] = dada;
    return fila ? ok(fila) : noEncontrado('esa persona');
  });
}
