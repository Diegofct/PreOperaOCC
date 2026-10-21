import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { importarPresupuesto, vistaPrevia } from '@/features/presupuestos/servidor/importar';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Importar el presupuesto desde el Excel del formulario oficial (spec 031, RF-41 a RF-46).
 *
 * `POST /api/panel/presupuestos/importar?obraId=` con los bytes del .xlsx en el cuerpo
 * responde la vista previa sin escribir nada: conteos, valor calculado, «VALOR TOTAL» del
 * Excel, si cuadra y los ítems con diferencias. Con `&confirmar=1` (y `&nombre=`, opcional)
 * vuelve a leer el mismo archivo y crea el borrador: 201, o 200 si era un doble clic.
 * Un archivo que no es el formulario responde 422 con lo que no se encontró.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const obraId = await obraDelContrato(sesion, parametros.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const contenido = new Uint8Array(await peticion.arrayBuffer());
    if (parametros.get('confirmar') !== '1') {
      const previa = await vistaPrevia(contenido);
      return previa instanceof Response ? previa : ok(previa);
    }

    const nombre = parametros.get('nombre')?.trim().slice(0, 120) || 'Presupuesto del contrato';
    const resultado = await importarPresupuesto(sesion, obraId, nombre, contenido);
    if (resultado instanceof Response) return resultado;
    return ok(resultado.presupuesto, resultado.creado ? 201 : 200);
  });
}
