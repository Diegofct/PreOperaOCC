import {
  cuerpoDemasiadoGrande,
  documentosDelLugar,
  duenoDelPedido,
  lugarDeLaPeticion,
  moduloDelDueno,
  subirDocumento,
} from '@/features/documentos/servidor/documentos';
import { documentoDelGrupoNuevo } from '@/features/panel/contratos';
import { requerirSesion, type PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { alcanza, motivoDeRechazo, type Accion } from '@/shared/rules/permisos';

interface ArchivoDelFormulario {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface FormularioRecibido {
  get(nombre: string): string | ArchivoDelFormulario | null;
}

/** Un campo de texto del formulario; un archivo donde va texto cuenta como vacío. */
function texto(formulario: FormularioRecibido, nombre: string): string | undefined {
  const valor = formulario.get(nombre);
  return typeof valor === 'string' ? valor : undefined;
}

/**
 * La sesión, si tiene el permiso del módulo que manda sobre ese lugar (`moduloDelDueno`).
 * Es `requerirPermiso`, pero el módulo se sabe después de la sesión: el de los documentos
 * de una solicitud depende de quién pide (spec 036).
 */
async function requerirPermisoDelLugar(
  peticion: Request,
  lugar: ReturnType<typeof lugarDeLaPeticion>,
  accion: Accion,
): Promise<PersonaEnSesion | Response> {
  const sesion = await requerirSesion(peticion);
  if (sesion instanceof Response) return sesion;
  const modulo = moduloDelDueno(lugar, sesion.rol);
  return alcanza(sesion.rol, modulo, accion) ? sesion : errorDePeticion(motivoDeRechazo(modulo, accion), 403);
}

/**
 * Los documentos de una empresa o de una obra (spec 034, RF-31 a RF-41), de una persona
 * (spec 035, RF-24) o de una solicitud de compra (spec 036, RF-17). `GET
 * /api/panel/documentos?empresa=occ`, `?obraId=`, `?personaId=` o `?solicitudId=`.
 * Responde los documentos —con los anulados marcados— y cuántos están vencidos o por
 * vencer. Los de una persona piden el permiso de Recursos Humanos (`moduloDelDueno`).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const lugar = lugarDeLaPeticion(peticion);
    const sesion = await requerirPermisoDelLugar(peticion, lugar, 'listar');
    if (sesion instanceof Response) return sesion;

    const dueno = await duenoDelPedido(sesion, lugar);
    if (dueno instanceof Response) return dueno;

    return ok(await documentosDelLugar(dueno));
  });
}

/**
 * Subir un documento (RF-24 a RF-30). `POST /api/panel/documentos?empresa=`, `?obraId=`, `?personaId=`
 * o `?solicitudId=`,
 * como formulario (`multipart/form-data`): el archivo en `archivo` y sus datos en
 * `clase`, `nombre`, `fecha`, `vence`, `proveedor` y `descripcion`.
 *
 * Formulario y no bytes sueltos, como sí suben las fotos del parte: aquí el nombre del
 * archivo es dato —decide el tipo con los primeros bytes (RF-26) y se guarda para la
 * descarga (RF-36)—, y archivo y datos llegan juntos para que no quede uno sin el otro.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const lugar = lugarDeLaPeticion(peticion);
    const sesion = await requerirPermisoDelLugar(peticion, lugar, 'escribir');
    if (sesion instanceof Response) return sesion;

    const dueno = await duenoDelPedido(sesion, lugar);
    if (dueno instanceof Response) return dueno;

    if (cuerpoDemasiadoGrande(peticion)) {
      return errorDePeticion('El archivo pesa más de 20 MB. Redúzcalo antes de subirlo.', 413);
    }

    // Con los tipos de React Native, `FormData` es el del celular; en el servidor es el de
    // la web. Se nombra solo lo que se usa, como en el asistente.
    const formulario = (await peticion.formData().catch(() => null)) as unknown as FormularioRecibido | null;
    if (!formulario) return errorDePeticion('Envíe el documento como formulario, con su archivo.');

    const archivo = formulario.get('archivo');
    if (!archivo || typeof archivo === 'string') return errorDePeticion('Adjunte el archivo del documento.', 422);

    const leidos = documentoDelGrupoNuevo.safeParse({
      clase: texto(formulario, 'clase'),
      nombre: texto(formulario, 'nombre'),
      proveedor: texto(formulario, 'proveedor'),
      descripcion: texto(formulario, 'descripcion'),
      fecha: texto(formulario, 'fecha'),
      vence: texto(formulario, 'vence'),
    });
    if (!leidos.success) return errorDePeticion(leidos.error.issues[0]?.message ?? 'Revise los datos.', 422);

    const contenido = new Uint8Array(await archivo.arrayBuffer());
    const resultado = await subirDocumento(sesion, dueno, leidos.data, { nombre: archivo.name, contenido });
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
