# Cómo instalar la app PreOperaOCC en su celular

> Para conductores y operadores de OCC. Se puede imprimir o enviar por WhatsApp.
> Solo funciona en celulares **Android**.

---

## Antes de empezar, pídale a la oficina

1. **El enlace para descargar la app.** Se lo envían por WhatsApp.
2. **Su usuario.** Por ejemplo: `jperez`.
3. **Su código de activación.** Sirve **una sola vez** y **vence en 2 días**.

La primera vez necesita **señal o WiFi**. Después, la app funciona **sin señal**.

---

## Paso 1 — Descargar e instalar

1. Abra el enlace que le enviaron y toque **Descargar**.
2. El celular le va a decir que la app es de un **origen desconocido**. Es normal: no viene
   de la Play Store.
   - Toque **Configuración**.
   - Active **Permitir desde esta fuente**.
   - Vuelva atrás.
3. Toque **Instalar** y espere.
4. Toque **Abrir**. La app se llama **PreOperaOCC**.

> Si no le aparece **Instalar**, busque el archivo en **Descargas** y tóquelo.

---

## Paso 2 — Activar su celular *(una sola vez, con señal)*

En la pantalla **«Active este equipo»**:

1. Escriba su **usuario**.
2. Escriba su **código de activación**.
3. Toque **Activar**.

Si le dice que el código no sirve, puede haber vencido: pídale uno nuevo a la oficina.

---

## Paso 3 — Crear su PIN

1. En **«Defina su PIN»**, escriba **seis números** que usted recuerde.
2. En **«Repita su PIN»**, escríbalos otra vez.

**Su PIN es solo suyo.** Nadie más lo conoce, ni la oficina. No se lo diga a nadie.

---

## Todos los días

1. Abra **PreOperaOCC**.
2. En **«Ingrese su PIN»**, escriba su PIN.
3. Escoja su vehículo y haga el **preoperacional**: responda cada punto, tome las fotos que
   pida y **firme**.

**No necesita señal.** Lo que firma queda guardado en el celular y **se envía solo** cuando
vuelva a tener señal o WiFi. La firma se envía siempre; las fotos esperan a una WiFi, para
no gastar sus datos.

---

## Si le pasa algo

| Si… | Haga esto |
| --- | --- |
| **Olvidó su PIN** | Toque **«Olvidé mi PIN»**. Pídale al residente el **código de respaldo** de la obra y cree un PIN nuevo. Funciona sin señal. |
| **No le aparece su vehículo** | Pídale al residente que se lo asigne. Le llega la próxima vez que tenga señal. |
| **Cambió de celular** | Pídale a la oficina un código de activación nuevo y haga los pasos 1 a 3 en el celular nuevo. |
| **Le llega una versión nueva de la app** | Instálela **encima**, igual que el paso 1. **No desinstale la anterior.** |

> ⚠️ **Nunca desinstale la app si tiene preoperacionales sin enviar.** Se perderían.
> Primero póngase donde haya señal o WiFi y deje que se envíen.

---
---

## Para la oficina: antes de entregar la app a una persona

Esto se hace en el panel web (`https://occ.licitapp-elementaling.cloud/panel`), con gerencia
o con el residente de la obra.

1. **Personas → registrar** a la persona:
   - **Cargo:** «Conductor» u «Operador».
   - **Acceso:** «Operador».
   - **Obra:** la suya.
   - **Usuario:** corto y fácil de escribir. Es lo que tecleará en el celular.
2. **Asignaciones → asignarle su vehículo.** Sin un vehículo asignado, la app no le deja
   hacer ningún preoperacional. Puede tener varios.
3. **Personas → «Códigos»** de esa persona. Salen dos, y **se muestran una sola vez**:
   - **Código de activación:** para el paso 2. Un solo uso, vence en 48 horas.
   - **Código de respaldo:** **imprímalo y guárdelo en la carpeta de la obra.** No vence.
     Es lo que se le dicta el día que olvide su PIN, aunque no haya señal.
   - Volver a emitir códigos deja sin efecto los anteriores.
4. Envíele el **enlace de la app**, su **usuario** y su **código de activación**.

**La primera vez, conviene estar al lado de la persona**, sobre todo en el permiso de
«origen desconocido» del paso 1, que es donde casi todo el mundo se traba.

### Cuando haya una versión nueva de la app

Se compila otra vez (`npx eas-cli build -p android --profile production`) y se envía el
enlace nuevo. Se instala **encima** de la anterior, sin desinstalar: así no se pierde lo que
el operador tenga pendiente de enviar. Solo hace falta cuando el cambio toca la app del
celular; los cambios del panel no obligan a repartirla de nuevo.
