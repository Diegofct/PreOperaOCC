import { uuidv7 } from 'uuidv7';

import { baseServidorSerializable } from '@/db/servidor/cliente';
import {
  filaDeMaterial,
  leerMaterialAlAlcance,
} from '@/features/almacen-obra/servidor/materiales';
import {
  historialDelMaterial,
  sentenciaDeMovimiento,
} from '@/features/almacen-obra/servidor/movimientos';
import { movimientoNuevo } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  conReintentoSiChoca,
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import {
  filtrarMovimientos,
  rechazoDeSalida,
  validarMovimiento,
} from '@/shared/rules/almacen';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Los movimientos del almacén (spec 009).
 *
 * `GET /api/panel/almacen/movimientos?materialId=&desde=&hasta=&tipo=` — el
 * historial de un material, con el stock que dejó cada movimiento (RF-20, RF-21).
 *
 * `POST` — registrar un ingreso o una salida (RF-8 a RF-16). No hay `PATCH` ni
 * `DELETE`: un movimiento no se modifica ni se borra, se anula (RF-23).
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const materialId = parametros.get('materialId');
    if (!materialId) return errorDePeticion('Falta el material.');

    const material = await leerMaterialAlAlcance(sesion, materialId);
    if (!material) return noEncontrado('ese material');

    const tipo = parametros.get('tipo');
    const historial = await historialDelMaterial(materialId);

    return ok(
      filtrarMovimientos(historial, {
        desde: parametros.get('desde'),
        hasta: parametros.get('hasta'),
        tipo: tipo === 'ingreso' || tipo === 'salida' ? tipo : null,
      }),
    );
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, movimientoNuevo);
    const paraQue = datos.tipo === 'salida' ? datos.paraQue : null;

    // RF-10: la fecha posterior a hoy se mira aquí, con el día de la obra, y con
    // la misma regla que usa el formulario.
    const faltas = validarMovimiento(
      {
        tipo: datos.tipo,
        fecha: datos.fecha,
        cantidad: datos.cantidad,
        paraQue,
        responsable: datos.responsable,
      },
      fechaDeJornada(),
    );
    if (faltas.length > 0) {
      return Response.json(
        {
          error: faltas[0].mensaje,
          campos: Object.fromEntries(faltas.map((f) => [f.campo, f.mensaje])),
        },
        { status: 400 },
      );
    }

    const id = uuidv7();

    return conReintentoSiChoca(async () => {
      const material = await leerMaterialAlAlcance(sesion, datos.materialId);
      if (!material) return noEncontrado('ese material');

      const rechazar = (mensaje: string) =>
        Response.json({ error: mensaje, campos: { cantidad: mensaje } }, { status: 409 });

      // RF-15: la regla decide con el stock leído y redacta el rechazo.
      if (datos.tipo === 'salida') {
        const { stock } = await filaDeMaterial(material);
        const rechazo = rechazoDeSalida(stock, datos.cantidad, material.unidad);
        if (rechazo) return rechazar(rechazo);
      }

      // RF-16: la misma condición, repetida en la base dentro de un lote
      // serializable. Si otra salida entró en medio, o la guarda no deja o
      // Postgres aborta con 40001 y `conReintentoSiChoca` repite todo esto.
      const [resultado] = await baseServidorSerializable().batch([
        baseServidorSerializable().execute(
          sentenciaDeMovimiento({
            id,
            materialId: material.id,
            tipo: datos.tipo,
            fecha: datos.fecha,
            cantidad: datos.cantidad,
            paraQue,
            observacion: datos.tipo === 'ingreso' ? datos.observacion : null,
            // RF-40 y RF-41: quién entregó o recibió, del otro lado del mostrador.
            responsable: datos.responsable,
            // RF-27 y RF-30: quien responde por el movimiento es quien tiene la sesión.
            registradoPor: sesion.id,
          }),
        ),
      ]);

      if (resultado.rows.length === 0) {
        const ahora = await leerMaterialAlAlcance(sesion, datos.materialId);
        if (!ahora) return noEncontrado('ese material');
        const { stock } = await filaDeMaterial(ahora);
        return rechazar(
          rechazoDeSalida(stock, datos.cantidad, ahora.unidad) ??
            'El material cambió mientras se registraba. Vuelva a intentarlo.',
        );
      }

      const registrado = (await historialDelMaterial(material.id)).find((m) => m.id === id);
      return registrado ? ok(registrado, 201) : noEncontrado('ese movimiento');
    });
  });
}
