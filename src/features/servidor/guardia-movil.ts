/**
 * La puerta de las rutas del celular.
 *
 * Deliberadamente **separada** de `guardia.ts`, la del panel, aunque las dos
 * hagan lo mismo de lejos. Son dos superficies con dos credenciales y dos
 * públicos: el panel entra con una cookie de sesión y una contraseña; el celular
 * con un token firmado y un PIN que nunca sale del equipo.
 *
 * Mezclarlas —una sola guardia que aceptara cualquiera de las dos— significaría
 * que un token de operador abre el panel de administración, o que la cookie del
 * residente sirve para pedir la instantánea de otro. Cada una acepta lo suyo y
 * rechaza lo demás.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { dispositivos, usuarios } from '@/db/servidor/esquema';
import { leerAccessToken, tokenDeLaPeticion } from '@/features/auth/servidor/tokens';

import { errorDePeticion } from './respuestas';

export interface OperadorEnPeticion {
  id: string;
  usuario: string;
  nombreCompleto: string;
  rol: 'admin' | 'supervisor' | 'operador';
  obraId: string | null;
  dispositivoId: string;
}

/**
 * Exige un token válido de un equipo vigente. Devuelve el operador, o el rechazo.
 *
 * El token se verifica por su firma, sin tocar la base — de eso se trata. Pero
 * el **dispositivo sí se consulta**: un equipo revocado tiene que dejar de
 * funcionar aunque su token siga sin caducar, y esa es la única forma de cortar
 * un celular perdido antes de que pase la hora.
 */
export async function requerirEquipo(
  peticion: Request,
): Promise<OperadorEnPeticion | Response> {
  const token = tokenDeLaPeticion(peticion);
  if (!token) return errorDePeticion('Falta el token del equipo.', 401);

  const contenido = await leerAccessToken(token);
  if (!contenido) return errorDePeticion('El token no es válido o caducó.', 401);

  const [fila] = await baseServidor()
    .select({
      id: usuarios.id,
      usuario: usuarios.usuario,
      nombreCompleto: usuarios.nombreCompleto,
      rol: usuarios.rol,
      obraId: usuarios.obraId,
      activo: usuarios.activo,
      eliminadoEn: usuarios.eliminadoEn,
      dispositivoId: dispositivos.id,
    })
    .from(dispositivos)
    .innerJoin(usuarios, eq(usuarios.id, dispositivos.usuarioId))
    .where(and(eq(dispositivos.id, contenido.dis), isNull(dispositivos.revocadoEn)))
    .limit(1);

  if (!fila) return errorDePeticion('Este equipo ya no está autorizado.', 401);
  if (!fila.activo || fila.eliminadoEn) {
    return errorDePeticion('Su cuenta está inactiva. Comuníquese con su supervisor.', 403);
  }
  if (fila.id !== contenido.sub) {
    // El token dice un usuario y el equipo pertenece a otro: o el equipo cambió
    // de dueño, o alguien está reusando un token viejo.
    return errorDePeticion('Este equipo ya no está autorizado.', 401);
  }

  return {
    id: fila.id,
    usuario: fila.usuario,
    nombreCompleto: fila.nombreCompleto,
    rol: fila.rol,
    obraId: fila.obraId,
    dispositivoId: fila.dispositivoId,
  };
}
