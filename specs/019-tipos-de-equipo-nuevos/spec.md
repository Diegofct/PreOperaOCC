# Spec 019 — Tipos de equipo nuevos

> Estado: En curso · Fecha: 2026-09-28 · Aprobada: 2026-09-28

## Contexto y objetivo

OCC tiene en obra equipos que hoy no se pueden registrar porque su tipo no existe en el
sistema: camiones, carrotanques, excavadoras, excavadoras de oruga, montacargas y un carro
taller. Mientras no estén registrados no se les puede asignar operador, no aparecen en la
flota de la obra y quedan por fuera del parte diario. El objetivo es que toda la flota que
está trabajando se pueda registrar y asignar, aunque OCC todavía no haya entregado el
formato de preoperacional de estos equipos.

Es el mismo camino que siguieron la vibrocompactadora y la recicladora en la spec 003: el
tipo entra primero, marcado como «formato pendiente», y el formato llega después en una
spec aparte.

## Usuarios / actores

- **Gerencia** (panel web, `admin`) — registra los equipos nuevos eligiendo su tipo.
- **Residente / director de obra** (panel web, `supervisor`) — ve los equipos de su obra y
  se los asigna a los operadores.
- **Operador** (móvil) — puede tener asignado uno de estos equipos; no levanta
  preoperacional de él mientras el formato esté pendiente, y el celular le explica por qué.

## Historias de usuario

- H1: Como gerencia quiero registrar camiones, carrotanques, excavadoras, excavadoras de
  oruga, montacargas y el carro taller, para tener toda la flota en el sistema y no en una
  hoja aparte.
- H2: Como gerencia quiero que a cada uno se le pida el medidor que de verdad marca su
  tablero, para que las lecturas sirvan para el mantenimiento.
- H3: Como residente quiero asignar estos equipos aunque aún no tengan formato, para que
  quede escrito quién opera cada máquina.
- H4: Como operador con uno de estos equipos asignado quiero entender por qué no puedo
  hacerle el preoperacional, en vez de encontrarme una pantalla vacía.

## Requisitos funcionales (criterios de aceptación en EARS)

### Tipos nuevos (H1)

- RF-1: EL SISTEMA ofrecerá Camión como tipo de equipo al registrar un vehículo.
- RF-2: EL SISTEMA ofrecerá Carrotanque como tipo de equipo al registrar un vehículo,
  distinto de Camión.
- RF-3: EL SISTEMA ofrecerá Excavadora —la de llantas— como tipo de equipo al registrar
  un vehículo, distinto de Retroexcavadora.
- RF-4: EL SISTEMA ofrecerá Excavadora de oruga como tipo de equipo al registrar un
  vehículo, distinto de Excavadora.
- RF-5: EL SISTEMA ofrecerá Montacargas como tipo de equipo al registrar un vehículo.
- RF-6: EL SISTEMA ofrecerá Carro taller como tipo de equipo al registrar un vehículo.
- RF-7: EL SISTEMA registrará la marca o el modelo de un equipo (por ejemplo, un camión
  Ford) como dato del vehículo, sin que exista un tipo de equipo por marca.

### Medidores (H2)

- RF-8: EL SISTEMA controlará los equipos de tipo Camión, Carrotanque y Carro taller por
  kilometraje.
- RF-9: EL SISTEMA controlará los equipos de tipo Excavadora, Excavadora de oruga y
  Montacargas por horas de motor.
- RF-10: CUANDO la gerencia elija uno de los tipos nuevos al registrar un equipo, EL
  SISTEMA mostrará únicamente el medidor que corresponde a ese tipo.

### Formato pendiente (H3, H4)

- RF-11: MIENTRAS un tipo nuevo no tenga formato de preoperacional, EL SISTEMA permitirá
  registrar equipos de ese tipo.
- RF-12: MIENTRAS un tipo nuevo no tenga formato de preoperacional, EL SISTEMA permitirá
  asignar equipos de ese tipo a un operador.
- RF-13: MIENTRAS un tipo nuevo no tenga formato de preoperacional, EL SISTEMA indicará en
  la ficha y en el listado del panel que ese equipo tiene el formato pendiente.
- RF-14: SI un operador abre el preoperacional de un equipo cuyo tipo no tiene formato,
  ENTONCES EL SISTEMA le explicará en el celular que el formato está pendiente, sin
  permitirle iniciar el registro.

### Cumplimiento en el inicio del panel (H3)

- RF-21: EL SISTEMA excluirá del conteo de «máquinas sin preoperacional» del inicio del
  panel los equipos cuyo tipo no tenga formato de preoperacional.
- RF-22: EL SISTEMA excluirá del cálculo del porcentaje de cumplimiento los equipos cuyo
  tipo no tenga formato de preoperacional.
- RF-23: SI todos los equipos visibles son de tipos sin formato, ENTONCES EL SISTEMA
  mostrará el cumplimiento como sin dato, no como 0% ni como 100%.

RF-21 a RF-23 valen también para la Vibro Compactadora y la Recicladora, que llevan con
formato pendiente desde la spec 003 y hoy cuentan como incumplimiento.

### Parte diario (H1, H2)

- RF-24: EL SISTEMA permitirá incluir los equipos de los tipos nuevos en la sección de
  maquinaria del parte diario de su obra.
- RF-25: CUANDO se registre en el parte un equipo de tipo nuevo, EL SISTEMA pedirá su
  lectura inicial y final en el medidor de su tipo (RF-8, RF-9).
- RF-26: EL SISTEMA sumará el avance de los equipos de tipo nuevo al resumen de gerencia:
  los kilómetros en los kilómetros recorridos y las horas en las horas máquina.

### Llantas

- RF-15: EL SISTEMA ofrecerá para Camión, Carrotanque y Carro taller las posiciones de
  llanta de dos delanteras, un eje trasero de rueda doble y un repuesto.
- RF-16: EL SISTEMA ofrecerá para Excavadora y Montacargas las posiciones de llanta de dos
  delanteras y dos traseras.
- RF-17: EL SISTEMA no ofrecerá posiciones de llanta para la Excavadora de oruga.

### Reglas transversales

- RF-18: CUANDO el celular sincronice, EL SISTEMA le entregará los tipos de equipo nuevos
  sin necesidad de reinstalar la aplicación.
- RF-19: EL SISTEMA conservará sin cambios los tipos de equipo existentes y los
  preoperacionales ya firmados con ellos.
- RF-20: EL SISTEMA definirá la lista de tipos de equipo en un solo sitio para el celular y
  el servidor.

## Superficies afectadas

- [x] **Móvil** — recibe los tipos nuevos; el aviso de formato pendiente ya existe (spec 003)
  y aplica a ellos sin cambios de pantalla.
- [x] **Panel web** — el selector de tipo en Vehículos muestra los seis nuevos; ficha y
  listado muestran el aviso de formato pendiente; el inicio deja de contar como
  incumplimiento a los equipos sin formato; el parte diario los admite en maquinaria.
- [x] **API** — sin endpoints nuevos; cambia el cálculo del resumen del inicio (RF-21 a
  RF-23).
- [x] **Sincronización** — los tipos nuevos bajan al celular con el pull de catálogo.
- [x] **Datos** — filas nuevas en el catálogo de tipos de equipo, en las dos bases. Sin
  cambios de esquema. La base de producción necesita recibir el catálogo actualizado.
- [x] **Reglas** — el catálogo de tipos y el de posiciones de llanta cambian; casos nuevos
  en el guion de verificación.

## Requisitos no funcionales

- Ningún identificador de tipo existente se renombra ni se reutiliza.
- Los nombres de los tipos se muestran en español, tal como se dicen en obra.

## Casos límite

- **Sin señal**: un celular que no ha sincronizado no conoce los tipos nuevos. No bloquea
  nada: el operador solo los ve cuando tenga uno asignado, y esa asignación también llega
  por sincronización, junto con el tipo.
- **Evidencia firmada**: no hay equipos ya registrados con un tipo equivocado que haya que
  reclasificar (confirmado por Diego); ningún preoperacional firmado cambia (RF-19).
- **Primer arranque / equipo recién activado**: el celular recibe el catálogo completo,
  tipos nuevos incluidos, en su primera sincronización.
- Un equipo de tipo nuevo **asignado a un operador**: el operador lo ve entre sus equipos y
  al intentar el preoperacional recibe la explicación de RF-14.
- Una **excavadora de oruga**: su ficha de llantas queda vacía sin error (RF-17).
- Una obra cuya flota es **solo de equipos sin formato**: el inicio no la marca como
  incumplida ni como cumplida (RF-23).
- El día que OCC entregue el formato de uno de estos tipos, sus equipos vuelven a contar
  para el cumplimiento desde ese momento; eso lo decide la spec que traiga el formato.
- Un equipo cuya configuración real de llantas **no coincide** con la propuesta: queda
  pendiente de la validación de OCC (ver Dudas abiertas).

## Fuera de alcance

- Los formatos de preoperacional de los seis tipos nuevos, hasta que OCC entregue su hoja
  de cálculo; cada uno entrará en su propia spec, junto con lo que pasa con los equipos ya
  asignados de ese tipo.
- Subtipos o marcas como tipo de equipo (camión Ford, carrotanque de agua o de combustible).
- Reclasificar equipos ya registrados de un tipo a otro.
- Cambiar los medidores o las posiciones de llanta de los tipos existentes.
- Campos propios de un tipo (capacidad del tanque, tonelaje del montacargas, herramientas
  del carro taller).

## Criterios de finalización

- RF-15 a RF-17, RF-21 a RF-23 y la marca de formato pendiente de los seis tipos, como
  casos en el guion de verificación; el resto, como paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: en el panel, abrir el selector de tipo y ver los seis nuevos; registrar un
  Camión (marca Ford) y comprobar que pide kilometraje y muestra «formato pendiente»;
  registrar una Excavadora de oruga y comprobar que pide horas y no tiene llantas;
  asignar el camión a un operador, sincronizar el celular —con el APK ya instalado, sin
  reinstalar— y ver la explicación al abrir el preoperacional; comprobar que el inicio del
  panel no cuenta el camión como «sin preoperacional»; incluirlo en el parte del día con
  kilometraje inicial y final, y ver los kilómetros en el resumen.
- El catálogo actualizado queda cargado en la base de producción y comprobado iniciando
  sesión en el panel del VPS.

## Dudas abiertas

Resueltas el 2026-09-28 con Diego:

- **Carrotanque**: es un tipo aparte de Camión.
- **Formato**: ninguno de los seis tiene todavía formato de OCC; entran como pendientes.
- **Medidores**: kilometraje para Camión, Carrotanque y Carro taller; horas de motor para
  Excavadora, Excavadora de oruga y Montacargas.
- **Equipos ya registrados**: ninguno está clasificado con un tipo prestado.
- **Llantas**: se usa una propuesta habitual (RF-15 a RF-17), marcada como pendiente de
  validar en obra, igual que en la spec 003.

Resueltas en la clarificación, 2026-09-28:

- **Excavadora**: es de llantas; la de oruga es otro tipo (RF-3, RF-4).
- **Parte diario**: los equipos nuevos entran a la sección de maquinaria (RF-24 a RF-26).
- **Cumplimiento**: los equipos sin formato no cuentan como incumplimiento (RF-21 a RF-23).
- **Eje trasero**: camión, carrotanque y carro taller con un solo eje trasero de rueda
  doble (RF-15), pendiente de validar en obra.
- **Nombre**: «Montacargas», con s, como se dice en obra.
- **Flota solo sin formato**: el cumplimiento se muestra como sin dato (RF-23), igual que
  una obra sin equipos.

No quedan dudas abiertas.
