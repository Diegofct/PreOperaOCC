# Spec 017 — Módulos por obra: Almacén y Control Cantera

> Estado: Cumplida · Fecha: 2026-09-22 · Cumplida: 2026-09-22

## Contexto y objetivo

Hoy todas las obras tienen Almacén y Control Cantera, los necesiten o no. Hay obras de OCC
sin almacén propio, o que no mueven material de cantera, y para ellas los dos módulos son
ruido: aparecen en el menú, piden un almacenista o un encargado de planta que no existe, y
la sección de Cantera sale vacía en cada parte diario.

Esta spec le da a la gerencia un interruptor por obra para cada uno de los dos módulos. Una
obra con un módulo apagado no lo ofrece a nadie, y lo que ya se había registrado en él no se
pierde: vuelve a verse al encenderlo.

## Usuarios / actores

- **Gerencia** (panel web) — enciende o apaga Almacén y Control Cantera en cada obra. Es la
  única que puede hacerlo.
- **Almacenista y encargado de planta** (panel web) — trabajan en el módulo de su obra; si se
  apaga, dejan de verlo.
- **Residente / director de obra** (panel web) — consulta el almacén y llena el parte, que
  incluye la sección de Cantera.
- **Operador** (móvil) — no interviene. Nada de esto cambia la app del celular.

## Historias de usuario

- H1: Como gerencia quiero apagar Almacén o Control Cantera en una obra que no los usa, para
  que nadie vea ni llene módulos que allí no aplican.
- H2: Como gerencia quiero volver a encender un módulo y encontrar todo lo que se había
  registrado, para no perder historia por haberlo apagado.
- H3: Como residente quiero que el parte de mi obra no muestre la sección de Cantera si la
  obra no la usa, para no llenar ni revisar una sección vacía.

## Requisitos funcionales (criterios de aceptación en EARS)

### El interruptor de cada obra (H1, H2)

- RF-1: EL SISTEMA guardará para cada obra si tiene encendido el módulo Almacén y si tiene
  encendido el módulo Control Cantera, por separado.
- RF-2: EL SISTEMA dejará los dos módulos encendidos en las obras registradas antes de esta
  spec.
- RF-3: CUANDO la gerencia registre una obra, EL SISTEMA le permitirá elegir qué módulos
  quedan encendidos, y los propondrá los dos encendidos.
- RF-4: CUANDO la gerencia corrija una obra, EL SISTEMA le permitirá encender o apagar cada
  módulo.
- RF-5: EL SISTEMA permitirá encender o apagar un módulo únicamente a la gerencia.
- RF-6: SI la gerencia apaga un módulo en una obra que tiene a alguien con el rol de ese
  módulo (almacenista para Almacén, encargado de planta para Control Cantera), ENTONCES EL
  SISTEMA lo permitirá y avisará antes de guardar a quién dejará sin su módulo.

### Qué cambia con un módulo apagado (H1, H3)

- RF-7: MIENTRAS un módulo esté apagado en una obra, EL SISTEMA no lo mostrará en el menú a
  las personas de esa obra.
- RF-8: CUANDO una persona cuyo módulo está apagado en su obra entre al panel, EL SISTEMA le
  dirá que su obra no tiene ese módulo, en vez de mostrarle una pantalla vacía o un error.
- RF-9: MIENTRAS un módulo esté apagado en una obra, EL SISTEMA rechazará cualquier consulta o
  registro de ese módulo en esa obra, aunque llegue por fuera del panel.
- RF-10: MIENTRAS un módulo esté apagado en una obra, EL SISTEMA no mostrará esa obra en el
  filtro, en la tabla ni en la descarga en Excel de ese módulo para la gerencia, ni la
  ofrecerá para registrar en él.
- RF-11: SI se intenta dar a una persona el rol de almacenista o de encargado de planta en una
  obra que tiene apagado el módulo correspondiente, ENTONCES EL SISTEMA lo rechazará diciendo
  que la obra no tiene ese módulo.
- RF-12: MIENTRAS Control Cantera esté apagado en una obra, EL SISTEMA no mostrará la sección
  de Cantera en los partes abiertos de esa obra.
- RF-13: CUANDO se cierre un parte de una obra con Control Cantera apagado, EL SISTEMA no le
  fijará viajes de cantera.

### Nada se pierde (H2)

- RF-14: EL SISTEMA conservará todo lo registrado en un módulo aunque se apague en la obra.
- RF-15: CUANDO se vuelva a encender un módulo en una obra, EL SISTEMA volverá a mostrar todo
  lo que se había registrado en él, y la persona con el rol de ese módulo volverá a verlo.
- RF-16: EL SISTEMA seguirá mostrando la sección de Cantera de los partes cerrados o anulados,
  con los viajes que fijaron, aunque después se apague Control Cantera en esa obra.

### Reglas transversales

- RF-17: EL SISTEMA no cambiará nada para el operador ni para la app del celular.
- RF-18: EL SISTEMA seguirá mostrando la sección Control Calidad de Obra en todos los partes:
  el laboratorio no depende de estos interruptores.

## Superficies afectadas

- [ ] **Móvil** — sin cambios. Los dos módulos son del panel.
- [x] **Panel web** — interruptores en el alta y la corrección de la obra, con el aviso de
  RF-6; menú; aviso de «su obra no tiene este módulo»; filtros de obra de Almacén y Control
  Cantera; sección de Cantera del parte; rechazo al dar el rol en una obra sin el módulo.
- [x] **API** — guardar los interruptores; rechazar consultas y registros de un módulo apagado;
  rechazar el rol; no fijar viajes al cerrar un parte con Cantera apagada.
- [ ] **Sincronización** — sin impacto: nada de esto viaja al celular.
- [x] **Datos** — los dos interruptores de cada obra, encendidos en las existentes.
- [x] **Reglas** — qué módulos ve una persona según su rol y los módulos de su obra, con sus
  casos en el guion de verificación.

## Requisitos no funcionales

- Todo en español. El aviso de RF-6 y el de RF-8 dicen el nombre del módulo y de la obra.
- Apagar o encender un módulo toma efecto la próxima vez que la persona cargue el panel, sin
  cerrarle la sesión.

## Casos límite

- **Sin señal**: no aplica. Todo es del panel web; el celular no cambia (RF-17).
- **Evidencia firmada**: un parte cerrado o anulado conserva su sección de Cantera aunque se
  apague el módulo (RF-16). Nada registrado se borra (RF-14).
- **Primer arranque / equipo recién activado**: no aplica al celular. Una obra nueva nace con
  los dos módulos encendidos salvo que la gerencia diga otra cosa (RF-3).

Y los del caso:

- **Apagar Cantera con un parte abierto que ya tiene viajes ese día**: la sección deja de verse
  en el parte y, al cerrarlo, no se fijan (RF-12, RF-13). Los viajes siguen registrados en
  Control Cantera y reaparecen al encender (RF-14, RF-15).
- **Apagar Almacén con stock**: se permite; el stock y el historial siguen guardados y vuelven
  al encender (RF-14, RF-15).
- **Almacenista de una obra con Almacén apagado**: conserva su cuenta y su rol; al entrar ve
  que su obra no tiene el módulo (RF-8). Al encender, vuelve a trabajar sin que nadie le cambie
  nada (RF-15).
- **Gerencia con el filtro puesto en una obra a la que luego se le apaga el módulo**: esa obra
  deja de salir en el filtro y la pantalla vuelve a «todas» (RF-10).
- **Una obra con los dos módulos apagados**: su almacenista y su encargado de planta, si los
  tiene, ven el aviso de RF-8; el residente sigue con su parte, sin la sección de Cantera.

## Fuera de alcance

- Encender o apagar Control Calidad de Obra (laboratorio) por obra: pendiente de que OCC lo
  confirme (RF-18).
- Encender o apagar cualquier otro módulo (Bitácoras, Preoperacionales, Vehículos, Personas).
- Quitar automáticamente el rol a quien queda sin módulo, o impedir apagar mientras haya
  alguien con ese rol (se decidió avisar, RF-6).
- Borrar lo registrado de un módulo apagado.
- Un historial de cuándo se encendió o apagó cada módulo.
- Cualquier cambio en la app del celular.

## Criterios de finalización

- Casos en `scripts/verificar-reglas.ts` para: qué módulos ve cada rol según los módulos de su
  obra; que la gerencia no vea una obra apagada en el módulo; que no se pueda dar el rol en una
  obra sin el módulo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: apagar Control Cantera en una obra de prueba con el aviso de su encargado de
  planta, si lo tiene; ver que el menú y el filtro de gerencia ya no la ofrecen, que el parte
  abierto no muestra la sección y que un parte cerrado de antes sí; que un registro por fuera
  del panel se rechaza; volver a encender y ver todo lo registrado. Lo mismo con Almacén, y
  que no se pueda dar el rol de almacenista en una obra con Almacén apagado.

## Dudas abiertas

Resueltas el 2026-09-22 (Diego):

- **Apagar con alguien en el rol**: se permite, con aviso, y esa persona ve que su obra no
  tiene el módulo (RF-6, RF-8).
- **Partes cerrados**: conservan su sección de Cantera (RF-16).
- **Gerencia**: las obras con el módulo apagado se ocultan del filtro, la tabla y el Excel de
  ese módulo (RF-10).

Siguen abiertas: ninguna.
