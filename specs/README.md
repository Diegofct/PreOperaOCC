# specs/ — una carpeta por funcionalidad

Aquí vive el contrato de cada cambio de comportamiento del sistema, antes de que
exista el código. El flujo completo está en [`docs/flujo-sdd.md`](../docs/flujo-sdd.md)
y los principios que toda spec debe cumplir, en [`docs/constitucion.md`](../docs/constitucion.md).

## Numeración

```
specs/NNN-nombre-en-kebab/
  spec.md      el QUÉ y el POR QUÉ, con los RF en notación EARS
  plan.md      el CÓMO: módulos, datos, decisiones técnicas
  tareas.md    el orden de ejecución, con checkboxes
```

`NNN` es de tres dígitos y **nunca se reutiliza**: siempre el siguiente número libre,
aunque la spec anterior se haya descartado. Los RF se citan como `001/RF-4` cuando se
habla de ellos desde fuera de su carpeta (un commit, otra spec, un comentario).

## Estados

Una spec está en uno de estos, y lo dice en su primera línea:

| Estado | Significa |
| --- | --- |
| `Borrador` | En entrevista o redacción. No se planifica todavía. |
| `Aprobada` | Acordada con el cliente. Ya se puede planificar y trocear en tareas. |
| `En curso` | Hay tareas marcadas en `tareas.md`. |
| `Cumplida` | Validación RF por RF en verde. |
| `Descartada` | No se hace. Se conserva la carpeta con el motivo escrito. |

## Reglas de la carpeta

- **La spec se edita, no se parchea con código.** Si aparece un requisito nuevo a mitad
  de la implementación, se actualiza primero la spec (`/sdd:cambio`) y luego el plan.
- **Nada se borra**: una spec descartada se marca como tal y se queda, igual que en el
  resto del proyecto. El historial de decisiones es parte de la evidencia.
- **`_plantillas/` no se edita para un caso concreto**: se copia. Si una plantilla se
  queda corta para todos los casos, ahí sí se mejora la plantilla.
