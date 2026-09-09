-- Spec 002 / RF-12.
--
-- Antes de separar cargo y acceso, el campo que la pantalla llamaba «Cargo» era
-- el rol: quien registró a un operador eligió literalmente «Operador» en esa
-- casilla. Así que esto no adivina nada, restituye lo que ya se había dicho.
--
-- Hace falta porque RF-8 condiciona los códigos de activación al cargo: sin este
-- relleno, todo operador registrado antes del cambio se queda sin poder recibir
-- un código nuevo, es decir, sin salida si pierde el teléfono.
--
-- A los residentes y a la gerencia no se les toca: su acceso no depende del
-- cargo, y adivinar si alguien es Director, Residente 1 o Residente 2 sí sería
-- inventar.
UPDATE "usuarios" SET "cargo" = 'operador'
WHERE "rol" = 'operador' AND "cargo" IS NULL AND "eliminado_en" IS NULL;
