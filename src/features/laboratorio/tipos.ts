/**
 * La forma de lo que el laboratorio guarda en columnas `jsonb` (spec 018).
 *
 * Aquí y no en la regla pura por lo mismo que `bitacoras/tipos`: son formas de
 * datos guardados, que importan el esquema de Postgres, el servidor y el panel. Solo
 * importa **tipos**: drizzle-kit empaqueta el esquema por su cuenta y un valor
 * importado de aquí arrastraría el alias `@/`, que no entiende.
 */
import type { EstadoEnsayo } from '../../shared/catalogos/estados-ensayo';
import type { AccionSobreEnsayo } from '../../shared/rules/granulometria';

/**
 * Una entrada de la historia del ensayo (RF-94): quién hizo qué y cuándo.
 *
 * Guarda el **nombre y el cargo** de ese momento, no solo el id: si mañana la persona
 * cambia de cargo, el acta tiene que seguir diciendo con qué cargo revisó o aprobó.
 */
export interface EventoDelEnsayo {
  accion: Exclude<AccionSobreEnsayo, 'editar'>;
  usuarioId: string;
  nombre: string;
  /** El nombre del cargo, no su id: se imprime tal cual en el informe. */
  cargo: string | null;
  /** Instante ISO 8601. */
  en: string;
  /** El comentario de una devolución o el motivo de una anulación. */
  texto?: string;
}

/**
 * Un ensayo tal como queda fijado en el parte al cerrarlo (RF-111).
 *
 * Con **nombres y no ids**, como los viajes de cantera: si después el ensayo se
 * aprueba, se anula o se corrige la franja del catálogo, el parte cerrado sigue
 * diciendo lo que decía ese día (RF-112).
 */
export interface GranulometriaDelParte {
  id: string;
  numeroInforme: string | null;
  material: string | null;
  /** El nombre de la franja, no su id. */
  franja: string | null;
  veredicto: 'cumple' | 'no_cumple' | null;
  estado: EstadoEnsayo;
}
