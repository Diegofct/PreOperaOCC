# Ensayo con el Excel V2 OPC 8 (T27)

> Fecha: 2026-11-16 · Base de desarrollo (`neondb`), obra `PRUEBA-043` · Sesión de Gerencia en Chrome · Libro: `assets/Planificación CONSORCIO MAGADALENA 787 V2 OPC 8 251026 (Sin yondo).xlsx`

## Qué se hizo

1. **Subir** el V2 desde «Subir Excel de planificación», frente `PLANIFIC BERRIO`, programación en `FLUJO DE CAJA` (la misma selección de la T17), sustituyendo el borrador v8. Las dos lecturas salieron de la caché: **14 s**, sin llamar a la IA. Nació el borrador **v8** (`01a1e479-…`), «De un Excel», con el aviso de que lo corregido ya no coincide con el libro.
2. **Comparar por concepto**: ninguna diferencia (abajo).
3. **Digitar los costos de relleno** en el editor, campo por campo: 13 ítems sin precio de costo y 2 rubros sin costo, con el 70 % del precio contractual o del valor (**dato de prueba**, no de OCC).
4. **«Repartir en partes iguales»** en el ítem 2.8: traía 18 meses fijados que no sumaban su importe (diferencia de 5 pesos); quedó sin fijados, 18 meses de $ 1.021.502.
5. **Guardar** (4,6 s) y **aprobar** desde la pantalla, confirmando los 226 hallazgos → **v8 vigente** desde el 2026-11-16; la v7 quedó reemplazada. La descarga del Excel original de la v8 responde 200 (1,7 MB).

## Resultado contra los criterios

| Criterio | Medido | |
| --- | --- | --- |
| Total de cada concepto indirecto igual al del libro, a menos de un peso | Los 7 iguales al peso (tabla abajo) | ✓ |
| Total a costo y factor iguales a los del libro (sin los marcados) | Al leerlo: costo $ 10.803.670.516, factor 2,921; el resumen no trae ninguna diferencia con los totales del Excel | ✓ |
| Marcados para revisar < 25 % de los indirectos del libro | **16,06 %** (43 renglones, $ 3.332.565.936, todos valor fijo por RF-41/RF-42) | ✓ |
| Recálculo < 1 s con 200 ítems y 200 renglones | **3,8 ms** de media (20 vueltas de `recalcularPlanificacion`, la misma que corre la pantalla) | ✓ |
| `grep -r "DATABASE_URL\|ANTHROPIC" dist/client` vacío | Vacío (`npx expo export --platform web`, luego `rm -rf dist`) | ✓ |

| Concepto | Calculado | Libro |
| --- | ---: | ---: |
| Seguros y garantías | 117.351.244 | 117.351.244 |
| Impuestos | 6.034.837.027 | 6.034.837.027 |
| Maquinaria general | 6.189.761.388 | 6.189.761.388 |
| Instalaciones generales | 328.850.000 | 328.850.000 |
| Varios | 908.764.839 | 908.764.839 |
| Mano de obra indirecta | 4.695.599.547 | 4.695.599.547 |
| Otros | 2.479.173.118 | 2.479.173.118 |
| **Total** | **20.754.337.163** | **20.754.337.163** |

- **Periodo deducido** (RF-168 a RF-171): 147 renglones, el 68,74 % de los indirectos; 104 de ellos (52,68 %) solo llevan ese aviso y no cuentan como marcados.
- Con los costos de relleno digitados, el costo total pasa a $ 22.116.715.803 y el factor a 1,94: es lo esperado, porque el libro trae esos ítems con costo casi cero.
- Hallazgos de la versión aprobada: 147 de periodo deducido, 51 para revisar, 19 de meses fijados que no cuadran (los trae el libro), 6 sin costo en ítems con medida 0 y 3 que no están en el presupuesto.

## Fallos que encontró el ensayo y se corrigieron

1. **Ítems que se pisaban al abrir el borrador.** Tres «Transporte de material por terceros» no están en el presupuesto, no traen ítem de pago ni renglón y comparten capítulo: tenían la misma llave, y al abrir el borrador en el editor tomaban todos las cifras del último (uno pasaba de $ 124 millones a $ 1.400 millones de costo; el editor mostraba costo $ 12.079 millones y factor 2,72 en lugar de $ 10.804 millones y 2,92). Guardar lo habría dejado así. Ahora las llaves se calculan sobre la lista (`llavesDeEdicion`) y la repetida lleva su número de aparición. Prueba «045/RF-57, T27».
2. **Un porcentaje que no cuadra quedaba sin periodo.** «Liquidaciones» se leyó como porcentaje; su cifra no estaba en la fila y entró como valor fijo (RF-41) sin mes de inicio ni meses, lo que impedía aprobar. La regla del periodo deducido no lo miraba por haberse leído como porcentaje. Ahora sí. Prueba «045/RF-41, RF-168, T27».

## Observado, sin corregir

- **El servidor de desarrollo se queda sin memoria (4 GB)** al leer el V2 con la programación en `PLANIFIC BERRIO` (la que la IA propone por defecto) en vez de `FLUJO DE CAJA`. Pasó dos veces, también con el servidor recién arrancado, así que no es memoria acumulada. Las mismas funciones fuera del servidor, con la selección de la T17, usan unos 100 MB. No se investigó qué parte se dispara con esa selección: **queda pendiente antes de desplegar**, porque en el VPS tumbaría el panel. Esas dos lecturas llamaron a la IA y se perdieron (unos 4 dólares según el cálculo del código).
- Una lectura cortada por la caída queda `en_curso` hasta su vencimiento (6 minutos); la siguiente subida la da por perdida, como se diseñó.
