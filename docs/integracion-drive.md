# Integración del Drive de la obra (spec 052)

Cómo se conecta una carpeta de Google Drive a Kontrola por n8n. El flujo listo para importar es
**`docs/n8n/drive-de-la-obra.json`**.

## Qué hace el flujo, y por qué así

Son dos ramas, cada una con su disparo:

| Cada 5 minutos | Qué pasa |
| --- | --- |
| **Inventario** (minuto 0, 5, 10…) | n8n lista **toda** la carpeta y sus subcarpetas y se la manda a Kontrola. Kontrola compara con lo que ya tiene y responde qué archivos le faltan. n8n baja esos archivos y los sube **de a uno**, hasta 15 por vuelta. |
| **Pulso** (minuto 2, 7, 12…) | Kontrola lee lo que está pendiente durante unos 4 minutos: el texto, la IA para PDF e imágenes, y el resumen. |

- **n8n no recuerda nada.** Manda el listado completo y Kontrola decide qué es nuevo, qué cambió,
  qué se renombró o movió y qué se sacó del Drive. Por eso repetir una vuelta, o que se encimen dos,
  no hace daño: lo que ya estaba no se vuelve a subir.
- **15 archivos por vuelta** a propósito: la primera carga de una carpeta con años de documentos
  se reparte en varias vueltas en vez de juntar cientos de archivos en la memoria de n8n. Lo que no
  alcanza a subir se vuelve a pedir en la siguiente. Unos 180 archivos por hora.
- **Si el listado de Google falla a medias**, el flujo lo dice (`completo: false`) y Kontrola recibe
  lo nuevo pero **no retira nada**. Un listado incompleto nunca hace desaparecer documentos.
- **Lo propio de Google** se manda convertido: un documento de Google llega como Word, una hoja como
  Excel y una presentación como PDF. Los formularios, los accesos directos y los mapas no se mandan.
- **Lo de más de 50 MB no se copia:** Kontrola no lo pide, y en el panel se abre en el Drive.
- **El flujo solo lee el Drive.** No crea, no mueve y no borra nada ahí.

## Lo que hace falta

1. **La carpeta del Drive** y su id. El id es lo que sigue a `/folders/` en la dirección de la
   carpeta: en `https://drive.google.com/drive/folders/1AbCdEf…` es `1AbCdEf…`.
2. **Un acceso de solo lectura a esa carpeta** para n8n (paso 1).
3. **El token del Drive** de Kontrola (paso 2).

## Paso 1 — El acceso a Google: una cuenta de servicio

Se recomienda una **cuenta de servicio** de Google en vez de la cuenta de una persona: es como un
usuario robot con su propio correo. **El consorcio no le da a n8n acceso a toda su cuenta, solo
comparte esa carpeta**, como Lector, igual que la compartiría con un ingeniero. Para cortar el acceso,
basta dejar de compartirla.

### 1.1 — Crear la cuenta de servicio (lo hace quien administra n8n, una sola vez)

1. Entre a <https://console.cloud.google.com/> con una cuenta de Google propia (no hace falta que sea
   la del consorcio) y cree un proyecto, por ejemplo «Kontrola Drive».
2. En **APIs y servicios → Biblioteca**, busque **Google Drive API** y actívela.
3. En **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**: póngale un nombre
   («kontrola-drive»), y termine sin darle roles.
4. Abra la cuenta de servicio, pestaña **Claves → Agregar clave → Crear clave nueva → JSON**. Se
   descarga un archivo `.json`. **Ese archivo es la llave:** no lo mande por chat ni lo deje en el
   repositorio. Se usa en el paso 1.3 y después se guarda en un lugar seguro.
5. Anote el **correo** de la cuenta de servicio, del estilo
   `kontrola-drive@kontrola-drive.iam.gserviceaccount.com`.

### 1.2 — Compartir la carpeta (lo hace el consorcio)

En el Drive, clic derecho sobre la carpeta → **Compartir** → pegar el correo de la cuenta de servicio
→ rol **Lector** → desmarcar «Notificar» → **Compartir**. Las subcarpetas quedan compartidas solas.

> **Si Google no deja compartir con ese correo**, es que el Workspace del consorcio prohíbe compartir
> fuera de su dominio. Hay dos salidas: que el administrador del Workspace permita esa cuenta, o usar
> en su lugar una cuenta de Google del consorcio (ver «Con la cuenta de una persona», al final).

### 1.3 — La credencial en n8n

En n8n: **Credentials → Add credential → Google Service Account API**.

- **Name:** `Google — Drive de la obra` (el flujo la busca con ese nombre).
- **Service Account Email:** el correo del paso 1.1.
- **Private Key:** el valor de `private_key` del archivo `.json`, completo, desde
  `-----BEGIN PRIVATE KEY-----` hasta `-----END PRIVATE KEY-----`.
- Active **Set up for use in HTTP Request node**, y en **Scope(s)** ponga
  `https://www.googleapis.com/auth/drive.readonly`.
- Guarde.

## Paso 2 — El token de Kontrola

En la máquina de desarrollo, en la raíz del repositorio:

```sh
npx tsx scripts/token-integracion.ts drive
```

Imprime dos líneas:

- `TOKEN=…` → va en n8n. En n8n: **Credentials → Add credential → Header Auth**, con
  **Name** `Kontrola — Drive de la obra`, **Header Name** `Authorization` y **Header Value**
  `Bearer ` seguido del token (con el espacio).
- `TOKEN_INTEGRACION_DRIVE=…` → es el hash y va en el `.env` del servidor (en desarrollo, el `.env`
  de la raíz; en el VPS, ver `docs/despliegue.md`, «La integración del Drive»).

Un token distinto para desarrollo y para producción. Para revocarlo, se emite otro y se cambian los dos.

## Paso 3 — Importar y ajustar el flujo

1. En n8n: **Workflows → Import from File** → `docs/n8n/drive-de-la-obra.json`.
2. Abra el nodo **Ajustes** y cambie:
   - `carpetaRaiz`: el id de la carpeta;
   - `kontrola`: la dirección del panel. En producción ya viene puesta
     (`https://occ.licitapp-elementaling.cloud`). Para probar contra el servidor de desarrollo
     desde un n8n en Docker en el mismo PC, `http://host.docker.internal:8081`.
3. Haga lo mismo con `kontrola` en **Ajustes del pulso**.
4. Si al importar algún nodo marca la credencial en rojo, ábralo y escoja la del paso 1.3 o 2. Son
   los nodos de Google (**Carpeta raíz**, **Todas las carpetas**, **Todos los archivos**,
   **Descargar del Drive**) y los de Kontrola (**Entregar inventario**, **Subir a Kontrola**,
   **Leer lo pendiente**).

## Paso 4 — Probar antes de activar

1. Clic en **Execute workflow** (el disparo «Ejecutar a mano»). Debe quedar todo en verde.
   - **Carpeta raíz** en rojo con 404: el id está mal, o la carpeta no se compartió con la cuenta de
     servicio.
   - **Entregar inventario** con 401: el token de n8n y el hash del `.env` no son pareja, o el
     servidor no se reinició después de poner el hash.
2. Abra **Entregar inventario**: la respuesta dice cuántos archivos son nuevos y qué pidió. La
   primera vez, todo.
3. En Kontrola, la **gerencia** entra a la obra → **Drive** → **Conectar carpeta**, y escoge la
   carpeta que acaba de aparecer. Hasta que no se conecta, la carpeta existe pero solo la ve la
   gerencia.
4. Abra el nodo **Leer lo pendiente** y dele **Execute step**: la respuesta dice cuántos documentos
   leyó. Si dice que la lectura con IA está apagada, es el freno `DRIVE_LECTURA_ACTIVA` (ver
   `docs/despliegue.md`): los Word y los Excel se leen igual, los PDF y las fotos esperan.
5. Si todo está bien, active el flujo (interruptor **Active** arriba a la derecha).

> El flujo **no guarda las ejecuciones que salen bien** (`saveDataSuccessExecution: none`): cada
> vuelta lleva archivos y llenaría el disco del VPS. Las que fallan sí quedan, para revisarlas.

## Con la cuenta de una persona (si no se puede la cuenta de servicio)

Si el consorcio no puede compartir con una cuenta de servicio, se usa una cuenta suya de Google:

1. En n8n, una credencial **Google Drive OAuth2 API**, con su propio cliente OAuth creado en la
   consola de Google, e **iniciar sesión con la cuenta del consorcio** que ve la carpeta. Lo tiene que
   hacer alguien del consorcio, porque es quien autoriza.
2. En cada nodo de Google del flujo (los cuatro del paso 3.4): **Authentication → Predefined Credential
   Type → Google Drive OAuth2 API**, y escoger esa credencial.

La diferencia que importa: así n8n puede leer **todo** el Drive de esa cuenta, no solo la carpeta,
aunque el flujo solo lea la carpeta del nodo **Ajustes**.

## Cortar la integración

Cualquiera de estas, de la más suave a la más dura:

- Desactivar el flujo en n8n.
- Dejar de compartir la carpeta con la cuenta de servicio.
- Vaciar `TOKEN_INTEGRACION_DRIVE` en el `.env` del servidor y reiniciar: Kontrola rechaza todo con 401.

Lo que ya entró a Kontrola se queda: es la copia de lo que había en el Drive, y sigue disponible para el
asistente.
