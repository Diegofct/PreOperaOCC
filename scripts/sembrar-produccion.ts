/**
 * Siembra el catálogo en la base de **producción**.
 *
 *   npm run db:sembrar:produccion
 *
 * Es `sembrar-servidor.ts` con la cadena de `.env` apuntada a `preoperaocc`.
 * Nació en la spec 019: los tipos de equipo nuevos son filas del catálogo, no
 * una migración, y `migrar-produccion.ts` no siembra. Hasta entonces sembrar
 * producción era editar `.env` a mano y acordarse de devolverlo, que es la misma
 * trampa que ya tumbó el panel con las migraciones (ver `produccion.ts`).
 *
 * Hay que correrlo cada vez que cambie el catálogo —tipos de equipo o
 * formatos—, justo antes de desplegar la imagen que lo trae. Es idempotente.
 */
import { apuntarAProduccion } from './produccion';

apuntarAProduccion('Sembrando');

void import('./sembrar-servidor');
