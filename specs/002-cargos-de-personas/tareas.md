# Tareas — Spec 002

Mismo orden que en la 001: la lista compartida primero, después los datos, después el
servidor y al final la pantalla.

- [x] T1. `src/shared/catalogos/cargos.ts`: los 15 cargos con su rótulo, el rol que
      sugieren y si operan vehículos. Puro, sin I/O. (RF-2, RF-3, RF-6, RF-8)
      Hecho cuando: hay casos en verde para los 15 slugs y rótulos únicos, para que Director
      y los dos residentes sugieran acceso al panel, y para que solo Conductor y Operador
      operen vehículos.

- [x] T2. Columna `cargo` en las dos bases, nullable, con sus dos migraciones. (RF-1, RF-5)
      Hecho cuando: `npm run db:generate` y `npm run db:generate:servidor` dejan su
      migración en `drizzle/local/` y `drizzle/servidor/`, y las personas ya registradas
      quedan sin cargo y con su rol intacto.

- [x] T3. El cargo viaja al celular en el pull. (RF-11)
      Hecho cuando: el `select` de usuarios y su serialización incluyen el cargo, y
      `npm run typecheck` en verde.

- [x] T4. `contratos.ts`: el cargo entra en el alta, la edición y la fila de lectura, con
      su validación contra el catálogo. (RF-1, RF-3)
      Hecho cuando: un cargo fuera de la lista es rechazado por el esquema.

- [x] T5. Rutas de personas: aceptan y devuelven el cargo. (RF-1, RF-4)
      Hecho cuando: el alta guarda el cargo y el listado lo devuelve.

- [x] T6. Activación: solo se emiten códigos si el cargo opera vehículos. (RF-8)
      Hecho cuando: pedir códigos para un Topógrafo es rechazado con un mensaje que explica
      el motivo, y para un Operador sigue funcionando.

- [x] T7. Pantalla de personas: dos campos donde había uno, el cargo en la tabla, y el rol
      propuesto al elegir cargo. La columna de acciones tiene que seguir dentro del ancho.
      (RF-2, RF-4, RF-6, RF-7, RF-10)
      Hecho cuando: al elegir «Residente 1» el acceso cambia solo a panel y se puede
      corregir a mano; la tabla muestra cargo y acceso; y la suma de anchos cabe en 1280.

- [ ] T8. Validación final: recorrido RF por RF. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado y los tres comandos en
      verde.

## Notas de ejecución

- La lista de RF-2 tiene **15 cargos**, no 14: Cadenero 1 y Cadenero 2 son dos.
- Gerencia se queda con el cargo sin definir hasta que se decida si se añade «Gerente» al
  catálogo. Es la duda abierta de la spec y RF-5 ya cubre ese estado.
