/**
 * El inicio, según quién entró.
 *
 * Son dos oficios distintos y por eso son dos pantallas distintas, no una con
 * secciones ocultas: el operador de máquina firma preoperacionales, el jefe de
 * operadores cierra bitácoras. Ninguno de los dos debería ver el trabajo del
 * otro.
 */
import { useSesion } from '@/features/auth/sesion';
import { InicioJefe } from '@/features/bitacoras/inicio-jefe';
import { InicioOperador } from '@/features/checklists/inicio-operador';

export default function Inicio() {
  const { usuario } = useSesion();

  // La puerta del layout no monta esto sin sesión abierta; esto es el cinturón.
  if (!usuario) return null;

  return usuario.rol === 'operador' ? <InicioOperador /> : <InicioJefe />;
}
