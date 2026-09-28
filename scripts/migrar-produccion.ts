/**
 * Aplica las migraciones a la base de **producción**.
 *
 *   npx tsx --env-file=.env scripts/migrar-produccion.ts
 *
 * Es `migrar-servidor.ts` con la cadena de `.env` apuntada a `preoperaocc`. Por
 * qué hace falta —y por qué `db:migrar:servidor` a secas migra la base
 * equivocada— está en `produccion.ts`.
 */
import { apuntarAProduccion } from './produccion';

apuntarAProduccion('Migrando');

void import('./migrar-servidor');
