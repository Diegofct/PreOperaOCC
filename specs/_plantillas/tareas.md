# Tareas — Spec NNN

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

- [ ] T1. <Título corto y accionable>. (RF: —)
      Hecho cuando: <condición comprobable>.
- [ ] T2. <…>. (RF-1, RF-2)
      Hecho cuando: <…>.
- [ ] T3. <…>. (RF-3)
      Hecho cuando: <…>.
- [ ] TN. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos
      están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

<Se va llenando durante la implementación: sorpresas, decisiones tomadas sobre la
marcha, cosas que la spec no preveía. Si algo de aquí cambia el comportamiento
acordado, va a la spec con `/sdd:cambio`, no se queda en esta nota.>
