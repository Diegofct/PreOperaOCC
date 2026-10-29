# Plan técnico — Spec 035

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Decisiones

- **La ficha va en una tabla aparte, `fichas_laborales`** (una fila por persona, `usuario_id` como llave), y no en `usuarios`. Tres razones:
  - el salario no puede colarse en ninguna consulta de `usuarios` que ya exista (personas, sesión, pull del celular, asistente): estando en otra tabla, solo sale donde se pide a propósito (RF-13);
  - `usuarios` viaja al celular; la ficha no tiene nada que hacer allí;
  - las personas de hoy quedan sin fila, que es justo «ficha vacía» (caso límite de primer arranque).
- **El historial (RF-15)** va en `ficha_eventos`: quién, cuándo y **qué campos** cambió, sin los valores. Así el historial no tiene salarios que esconder.
- **Dos personas editan la misma ficha**: la ficha lleva `version`; guardar con una versión vieja responde 409, como el contrato (spec 031).
- **Los documentos de la persona van en `documentos_del_grupo`** (spec 034), con un tercer dueño: `persona_id`. El `check` del dueño pasa a «exactamente uno de empresa, obra o persona». Se reutiliza todo: subir, listar, abrir, descargar, anular, firma del archivo, vencimientos. `LugarDeDocumentos` suma `'persona'` con las clases de RF-23. La tabla es de la 0033, que todavía no está en producción: cambiar el `check` no toca datos reales.
- **Retirar** = estado `retirado` en la ficha (con fecha y motivo) **y** `usuarios.activo = false`, que ya cierra el ingreso al panel, la sesión y el celular (`sesion.ts`, `ingresar`, `movil/activar`, `movil/refrescar`). Además se revocan sus sesiones abiertas. Los registros pasados no se tocan.
- **Rol nuevo `auxiliar_rrhh`** («Auxiliar de Recursos Humanos»), como el Encargado de OCC en la 034: empresa Elemental, sin obra, entra a `/panel/elemental/recursos-humanos`.
  - Permisos: `rrhh` todo; `documentos` ver, listar y escribir (anular es de gerencia, spec 034); `compras` y `tesoreria` ver y listar, `licitaciones` ver (lo demás lo dicen la 036 y la 037); `obras` ver y listar (la pestaña Obras de RR. HH., de consulta); `personas` ver, listar y escribir, sin `activar`; `asistente` nada.
  - `PUEDE_DAR`: solo `operador` (personas sin acceso al panel), RF-11.
  - **Ve todas las obras** (`rolVeTodasLasObras`; cambio de la T1): la pestaña Personas de Elemental lista al personal de todas, y su ruta filtra por obra a quien no las ve todas. No le abre nada de las obras: cada ruta exige el permiso de su módulo, y ella no tiene bitácoras, contrato, almacén… (las fotos tampoco: `alcanzaLaImagen` le exige el módulo, como al Encargado de OCC).
  - Personas y Obras con `ver`, además de `listar`: son las pestañas de su Recursos Humanos, y `MarcoPantalla` muestra «Este módulo es de la gerencia» sin `ver`.
- **Quién ve el salario**: regla pura `veElSalario(rol)` = gerencia o auxiliar de RR. HH. El servidor arma la ficha **sin** el campo para los demás (no lo manda en `null`: no lo manda).
- **Alcance de RR. HH. por lugar** (`personalDelLugar`):
  - Elemental: todo el personal (gerencia y auxiliar);
  - OCC y Geolab: las personas cuya empresa (`empresaDeLaPersona`) es esa;
  - obra: las personas de esa obra.
  El que entra lo deciden `alcanzaLaEmpresa` y `alcanzaLaObraDeLaRuta`, como en Documentos.
- **Menús**: «Recursos Humanos» (`rrhh`) se suma a OCC y a Geolab después de Documentos; en la obra ya está. Las tres son la misma pantalla de consulta; la de Elemental es la de edición.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | `auxiliar_rrhh` en `ROLES`, etiquetas, `TABLA`, `PUEDE_DAR`, `MODULO_DEL_ROL`; filas `rrhh` (gerencia y auxiliar todo; residente, Encargado y laboratorista ver/listar) | RF-2 a RF-11 |
| `src/shared/rules/empresas.ts` | Menús de OCC y Geolab con RR. HH.; `EMPRESAS_DEL_ROL`/`EMPRESA_DEL_ROL` (Elemental), `destinoAlEntrar`, `rutaNueva` para la auxiliar | RF-3, RF-8 a RF-10 |
| `src/shared/catalogos/cargos.ts` | Cargo «Auxiliar de Recursos Humanos» | RF-8 |
| `src/shared/rules/ficha.ts` (nuevo) | Tipos de documento, de contrato y estados laborales; `faltasDeLaFicha` (fechas, salario > 0); `fichaIncompleta`; `veElSalario`; `faltasParaRetirar(tipoDeContrato, clasesVigentes)`; `avisosDeLaPersona` y `resumenDelPersonal` | RF-12 a RF-19, RF-26 a RF-31 |
| `src/shared/rules/documentos.ts` | `'persona'` en `LugarDeDocumentos` con sus clases (RF-23) | RF-23 a RF-25 |
| `src/db/servidor/esquema.ts` + migración `0034_*` | `fichas_laborales`, `ficha_eventos`, `persona_id` y el `check` nuevo en `documentos_del_grupo`, `auxiliar_rrhh` en `rol_usuario` | RF-12, RF-15, RF-18 a RF-20, RF-24 |
| `src/features/rrhh/servidor/*.ts` (nuevo) | `personalDelLugar` (con avisos, sin salario salvo `veElSalario`), `fichaDe`, `guardarFicha` (versión, historial), `retirar` | RF-1 a RF-6, RF-12 a RF-22, RF-26 a RF-33 |
| `src/features/documentos/servidor/documentos.ts` | El dueño `persona` en `duenoDelPedido` y `documentoAlAlcance`, con el alcance de RR. HH. | RF-24, RF-32, RF-33 |
| `src/app/api/panel/rrhh/…+api.ts` (nuevos) | `GET personal?empresa=|obraId=`, `GET/PUT fichas/:id`, `GET fichas/:id/historial`, `POST fichas/:id/retirar` | todos los de servidor |
| `src/app/api/panel/personas+api.ts`, `asignaciones`, `partes`, `preoperacionales` | Los selectores no ofrecen a los inactivos (hoy sí) | RF-21 |
| `src/features/rrhh/*.tsx` (nuevo) | Listado del personal con avisos y filtros; ficha (ver/editar, salario según rol, historial); documentos de la persona (la pantalla de la 034 con el lugar `persona`); retirar | RF-1 a RF-31 |
| `src/features/empresas/pantalla-recursos-humanos.tsx`, `paginas-de-empresa.tsx` | Personas con la ficha; RR. HH. de consulta en OCC, Geolab y la obra | RF-1 a RF-5 |
| `src/features/panel/pantalla-personas.tsx` | El acceso nuevo; la auxiliar solo ofrece «Operador» | RF-8, RF-11 |
| `scripts/verificar-reglas.ts` | Casos de todo lo de reglas | — |

## Modelo de datos

**Local**: sin cambios.

**Servidor** (migración `0034_*`, aditiva salvo el `check` de una tabla todavía vacía en producción):
- `rol_usuario` + `auxiliar_rrhh`.
- **`fichas_laborales`**: `usuario_id` (PK → `usuarios`); `tipo_documento`, `fecha_nacimiento`, `telefono`, `correo`, `direccion`, `ciudad`; `emergencia_nombre`, `emergencia_parentesco`, `emergencia_telefono`; `fecha_ingreso`, `tipo_contrato`, `fin_contrato`; `salario` (bigint, nulo); `eps`, `arl`, `pension`, `caja`; `notas`; `estado` (activo, vacaciones, incapacidad, licencia, retirado; por defecto activo); `retiro_fecha`, `retiro_motivo`; `version`; `actualizado_por`, `actualizado_en`. `check`: `fin_contrato >= fecha_ingreso`, `salario > 0`, retirado ⇔ fecha y motivo.
- **`ficha_eventos`**: `id`, `usuario_id`, `accion` (guardado, retirado), `campos` (jsonb: los nombres de los campos cambiados), `por`, `en`.
- **`documentos_del_grupo`** + `persona_id` (→ `usuarios`, nulo), índice `(persona_id, fecha)`, y el `check` del dueño con las tres.

## Riesgos

- **El salario por accidente**: cualquier `select` de la ficha que no pase por `fichaDe` podría llevarlo. Se lee solo en `rrhh/servidor`, y una prueba en vivo revisa la respuesta cruda de cada ruta para cada rol.
- **Los selectores** hoy muestran inactivos; cambiarlos toca pantallas que funcionan. Se filtra en el servidor con un parámetro (`?activos=1`) para no cambiar lo que listan las pantallas de administración.
- **La auxiliar en pantallas de Elemental** que hoy solo ve gerencia (Obras, Documentos): se revisan una por una en la demo, como el Encargado en la 034.
- R2 es compartido con producción: lo de prueba lleva PRUEBA-035 y se borra objeto por objeto.

## Verificación

- En cada tarea: `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, y nota en `tareas.md`.
- Pruebas en vivo con sesiones temporales; demo en Chrome con las sesiones de los otros roles en `127.0.0.1:8081` (la sesión del usuario en `localhost` no se toca).
