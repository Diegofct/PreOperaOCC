# Despliegue — procedimiento

Cómo sale este proyecto de `localhost`. Es un guion para seguir de arriba abajo, con la
reversa de cada paso escrita antes de ejecutarlo (spec 014, RF-10).

> **La regla que manda sobre todas:** en ese VPS ya corre otro proyecto y **no se puede
> caer**. Por eso hay un paso que se repite después de cada cambio al proxy: *comprobar
> primero el dominio del vecino*. Si el vecino no responde, se deshace y se para.

**Lo que ya está hecho** (T1–T4, en el repositorio): la entrada del servidor, la imagen,
el compose y el perfil de compilación del APK. Aquí empieza lo que toca máquinas.

---

## Cómo está montado de verdad *(comprobado el 2026-09-23)*

> Lo que sigue **no es el plan, es la máquina**. Se levantó mirando el VPS con Diego, y
> corrige varias cosas que este documento daba por supuestas cuando se escribió el 19 de
> septiembre. Léelo antes que nada: el procedimiento de los pasos 0 a 7 describe una primera
> instalación que **ya se hizo**.

**El panel lleva desplegado desde el 2026-09-20** y está sano. `docker ps` lo muestra como
`preoperaocc-panel`, corriendo `preoperaocc:ultima`, publicado en `127.0.0.1:3000` —solo el
bucle local, como manda `compose.yaml`—. En `/opt/preoperaocc` están el `compose.yaml`
(idéntico al del repositorio, byte a byte) y el `.env` con permisos `600`.

**El dominio es `occ.licitapp-elementaling.cloud`.**

### El vecino, y por qué el proxy no es lo que decía este documento

El VPS lo comparte con **LicitApp**, que son tres contenedores: `licitapp-backend-1` (Java),
`licitapp-db-1` (MySQL) y `licitapp-proxy-1`.

Ese proxy es **Caddy, y corre en un contenedor del vecino**, no instalado en el sistema. Tiene
los puertos 80 y 443. Así que:

- **No hay `/etc/caddy/` ni `systemctl reload caddy`.** La sección «Si el proxy es Caddy» de más
  abajo describe una instalación de sistema que en esta máquina no existe.
- **No hay nginx.** `grep server_name /etc/nginx/sites-enabled/` sale vacío.
- El bloque del panel ya está dentro del `Caddyfile` de LicitApp, al final, con su propio
  comentario. Caddy termina el TLS y pasa las peticiones a `preoperaocc-panel:3000`.

### La unión entre las dos redes, que no está en ningún archivo

Caddy llega al panel **por nombre de contenedor**, y eso solo funciona si comparten red. Pero el
`compose.yaml` del panel no declara ninguna: crea la suya, `preoperaocc_default`.

Lo que hay es una conexión hecha **a mano**, y está del lado del proxy:

| Contenedor | Redes |
| --- | --- |
| `preoperaocc-panel` | `preoperaocc_default` |
| `licitapp-proxy-1` | `licitapp_licitapp-net` **y** `preoperaocc_default` |

O sea, alguien corrió `docker network connect preoperaocc_default licitapp-proxy-1`. **Eso no
está en ningún compose ni en ningún script**, y es la razón de las dos advertencias que siguen.

> ### ⚠️ Nunca `docker compose down` en `/opt/preoperaocc`
>
> `down` **borra la red** `preoperaocc_default`. Al borrarla, el proxy se desengancha, y aunque
> el panel vuelva a levantarse sano, Caddy ya no sabe llegar: el sitio queda caído y
> `docker compose ps` dice **healthy**, porque el contenedor lo está. El síntoma no señala a la
> causa. **Siempre `up -d`.**
>
> Si llegara a pasar, se arregla reconectando:
> `docker network connect preoperaocc_default licitapp-proxy-1`

> ### ⚠️ No sobrescribas el `compose.yaml` del VPS sin mirar
>
> Hoy es idéntico al del repositorio, así que copiarlo es inofensivo. Si algún día dejan de
> serlo, copiarlo a ciegas puede llevarse por delante algo que solo existe en la máquina.

**Que el panel se recree con `up -d` es seguro**: entra en `preoperaocc_default`, que es su red
por defecto, y el proxy ya está ahí esperándolo.

---

## Paso 0 — Los datos de tu VPS

Antes de nada, rellena esto. Todo lo demás se copia y se pega tal cual.

```sh
# En el VPS, como root o con sudo delante de cada comando.
export PANEL_DOMINIO="panel.tudominio.com"   # el dominio que va a servir el panel
export PANEL_PUERTO="3000"                    # un puerto libre (se comprueba abajo)
export PANEL_DIR="/opt/preoperaocc"           # dónde vive en el VPS
```

Y averigua lo que falta. **Nada de esto modifica nada:**

```sh
echo "--- proxy activo ---";        systemctl is-active nginx caddy apache2 2>/dev/null
echo "--- config del proxy ---";    ls -l /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /etc/caddy/ 2>/dev/null
echo "--- dominios servidos ---";   grep -rhE "^[[:space:]]*server_name" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
echo "--- puertos ocupados ---";    ss -tlnp
echo "--- contenedores ---";        docker ps --format "table {{.Names}}\t{{.Ports}}"
echo "--- certificados ---";        certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains"
echo "--- memoria ---";             free -h
```

Tres cosas que tienes que anotar y no olvidar:

1. **Qué archivo sirve al vecino.** Ese archivo **no se abre en todo el procedimiento.**
2. **Que `$PANEL_PUERTO` no aparezca en «puertos ocupados».** Si aparece, escoge otro.
3. **Si el certificado del vecino lo administra certbot.** Si sí, el paso 5 usa certbot y
   no toca el suyo. Si no, hay que mirarlo antes de emitir nada.

> **Si el proxy es Caddy y no nginx**, salta al final: hay una sección aparte. El resto del
> procedimiento es idéntico salvo los pasos 4 y 5.

---

## Paso 1 — La base de producción

**Riesgo para el vecino: ninguno.** No toca el VPS.

1. En el panel de Neon, crear un proyecto nuevo y copiar su cadena de conexión.
2. En la máquina de desarrollo, poner esa cadena en `.env` **temporalmente** y correr:

```sh
npm run db:migrar:servidor    # las 12 migraciones
npm run db:sembrar:servidor   # tipos de equipo y plantillas
npm run crear-admin           # la cuenta de gerencia
```

3. **Devolver el `.env` a la cadena de desarrollo.** Es el error más fácil de cometer de
   todo el despliegue y el que peor se nota: seguir trabajando contra producción sin
   saberlo.

Lo sembrado son **solo** tipos de equipo y formatos. Obras, personas y vehículos los
registra la administración desde el panel — es lo que pide RF-19.

> **Reversa:** borrar el proyecto de Neon y crear otro. Nada apunta todavía a esa base.

---

## Paso 2 — La imagen, construida aquí y transferida

**Riesgo para el vecino: ninguno.**

Se construye en la máquina de desarrollo **a propósito**: empaquetar es lo que más memoria
consume del proyecto y un VPS pequeño puede quedarse sin RAM justo ahí.

```sh
# En la máquina de desarrollo. Docker Desktop tiene que estar corriendo.
docker build -t preoperaocc:ultima .
docker save preoperaocc:ultima | gzip | ssh USUARIO@IP_DEL_VPS 'gunzip | docker load'
```

Son unos 436 MB antes de comprimir. Si la conexión se corta, se repite: no deja nada a
medias.

```sh
# En el VPS, comprobar que llegó:
docker images preoperaocc:ultima
```

> **Reversa:** `docker rmi preoperaocc:ultima` en el VPS. Nada más la referencia.

---

## Paso 3 — El contenedor arriba, sin tocar el proxy

**Riesgo para el vecino: ninguno.** El contenedor escucha **solo en el bucle local**, así
que hasta el paso 4 no le llega tráfico de fuera.

```sh
# En el VPS
mkdir -p "$PANEL_DIR" && cd "$PANEL_DIR"
```

Copia `compose.yaml` del repositorio a esa carpeta (con `scp`, o pegándolo con un editor).

Crea el `.env` **junto a él**, con las seis variables:

```sh
cat > "$PANEL_DIR/.env" <<'FIN'
DATABASE_URL=...la cadena de la base de PRODUCCIÓN...
SECRETO_TOKENS=...el secreto nuevo, no el de desarrollo...
R2_CUENTA_ID=...
R2_BUCKET=...
R2_LLAVE_ID=...
R2_LLAVE_SECRETA=...
PUERTO_PANEL=3000
FIN

chmod 600 "$PANEL_DIR/.env"
```

`chmod 600` no es adorno: ahí están las credenciales de la base y del almacén de
evidencia.

```sh
cd "$PANEL_DIR" && docker compose up -d
docker compose ps                       # debe decir "healthy" en menos de un minuto
curl -I "http://127.0.0.1:$PANEL_PUERTO/panel"   # debe responder 200
```

Si falta alguna variable, compose **se niega a arrancar** y dice cuál. Es a propósito.

> **Reversa:** `cd "$PANEL_DIR" && docker compose down`. El vecino ni se enteró.

---

## Paso 4 — El proxy · **el único paso con riesgo**

Aquí es donde se puede tumbar al vecino. Por eso va en este orden exacto.

### 4.1 — Escribir el bloque, en un archivo APARTE

**No se abre el archivo del vecino.** Si esto sale mal, se deshace borrando un archivo.

```sh
cat > "/etc/nginx/sites-available/$PANEL_DOMINIO" <<FIN
server {
    listen 80;
    listen [::]:80;
    server_name $PANEL_DOMINIO;

    # Las firmas y las fotos de los preoperacionales suben por aquí. El valor por
    # defecto de nginx es 1 MB y las cortaría: el operador vería "subido" y la
    # evidencia no llegaría.
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$PANEL_PUERTO;
        proxy_http_version 1.1;

        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 120s;
    }
}
FIN

ln -s "/etc/nginx/sites-available/$PANEL_DOMINIO" "/etc/nginx/sites-enabled/$PANEL_DOMINIO"
```

### 4.2 — Validar SIN aplicar

```sh
nginx -t
```

**Si falla, para aquí y deshaz:**

```sh
rm -f "/etc/nginx/sites-enabled/$PANEL_DOMINIO"
# nginx sigue sirviendo con la configuración vieja. El vecino nunca se enteró.
```

### 4.3 — Recargar, **nunca reiniciar**

```sh
systemctl reload nginx
```

`reload` levanta procesos nuevos con la configuración nueva y deja morir a los viejos
cuando terminan lo que están sirviendo: ninguna petición en vuelo se corta. `restart` sí
cortaría.

### 4.4 — Comprobar **el vecino primero**

```sh
curl -I https://EL_DOMINIO_DEL_VECINO      # ESTE va primero
curl -I "http://$PANEL_DOMINIO"            # y después el nuestro
```

**Si el vecino no responde:**

```sh
rm -f "/etc/nginx/sites-enabled/$PANEL_DOMINIO"
systemctl reload nginx
curl -I https://EL_DOMINIO_DEL_VECINO      # tiene que volver
```

Y no se sigue hasta entender qué pasó.

---

## Paso 5 — El certificado

**Solo para el dominio nuevo.** Tocar el certificado del vecino es tocar al vecino.

```sh
certbot --nginx -d "$PANEL_DOMINIO"
```

Cuando pregunte por la redirección de http a https, **responde que sí**: eso cumple RF-3.

```sh
# El vecino, otra vez primero
curl -I https://EL_DOMINIO_DEL_VECINO
curl -I "https://$PANEL_DOMINIO"           # 200
curl -I "http://$PANEL_DOMINIO"            # 301 hacia https

# Y que la renovación esté programada DE VERDAD, no supuesta
systemctl list-timers | grep -i certbot
certbot renew --dry-run
```

> **Reversa:** `certbot delete --cert-name "$PANEL_DOMINIO"`, y quitar del archivo del
> dominio las líneas que certbot añadió (o borrar el archivo entero y volver al paso 4.1).
> El certificado del vecino no se toca en ningún momento.

---

## Paso 6 — Sobrevivir a un reinicio

```sh
reboot
```

Cuando vuelva, **sin tocar nada**:

```sh
curl -I https://EL_DOMINIO_DEL_VECINO      # el vecino volvió
curl -I "https://$PANEL_DOMINIO"           # el panel volvió
docker compose -f "$PANEL_DIR/compose.yaml" ps   # healthy
```

El contenedor lleva `restart: unless-stopped`, así que se levanta solo. Y no guarda nada
dentro: la base está en Neon y las imágenes en R2.

---

## Paso 7 — Entrar y comprobar de punta a punta

1. Abrir `https://$PANEL_DOMINIO/panel` y entrar con la cuenta de `crear-admin`.
2. El panel está **vacío**: sin obras, sin personas, sin vehículos.
3. Registrar una obra, una persona y un vehículo reales.
4. Emitir un código de activación.

Eso cierra el panel web. Lo que sigue —compilar el APK y activar un teléfono— está en el
bloque D de `specs/014-despliegue-a-produccion/tareas.md` y necesita el dominio decidido.

---

## Si el proxy es Caddy

Los pasos 4 y 5 se sustituyen por esto; Caddy emite y renueva el certificado solo.

```sh
# Un archivo aparte, y el del vecino no se abre
cat > "/etc/caddy/conf.d/$PANEL_DOMINIO.caddy" <<FIN
$PANEL_DOMINIO {
    request_body {
        max_size 25MB
    }
    reverse_proxy 127.0.0.1:$PANEL_PUERTO
}
FIN
```

Si el `Caddyfile` principal no incluye `conf.d`, hay que añadir `import conf.d/*.caddy`
**una sola vez** — y eso sí toca su archivo, así que hazlo con una copia guardada antes:
`cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.respaldo`.

```sh
caddy validate --config /etc/caddy/Caddyfile     # validar SIN aplicar
systemctl reload caddy                            # recargar, no reiniciar
curl -I https://EL_DOMINIO_DEL_VECINO             # el vecino, primero
curl -I "https://$PANEL_DOMINIO"
```

> **Reversa:** borrar el archivo nuevo, restaurar `Caddyfile.respaldo` si se tocó, y
> `systemctl reload caddy`.

---

## Actualizar el panel · paso a paso *(reescrito el 2026-09-23)*

Con OCC ya usándolo, se acepta un corte breve **fuera del horario de obra** (RF-11). Los
operadores no se enteran: el celular trabaja sin señal y su cola reintenta sola. Quien sí puede
perder algo es un residente llenando una bitácora en ese momento — cada sección guarda por su
cuenta, así que sería lo que no haya guardado.

**Se trabaja en dos ventanas**, y confundirlas es el error más fácil:

- **Ventana A — el VPS**, conectado por ssh.
- **Ventana B — la máquina de desarrollo**, en la raíz del repositorio, con Docker Desktop
  abierto.

### 1 · Comprobar que se entra al VPS *(ventana B)*

```sh
ssh -i ~/.ssh/preoperaocc_vps root@179.199.132.56 "echo funciona"
```

**Se entra con llave y sin contraseña.** El 2026-09-23 se comprobó que `~/.ssh/preoperaocc_vps`
(la pública dice `preoperaocc-despliegue`) abre la sesión como `root` en `179.199.132.56`, que
es la IP a la que resuelven tanto `licitapp-elementaling.cloud` como el subdominio del panel.

Consecuencia práctica, y es la que ahorra el enredo: **lo de las dos ventanas es opcional**.
Todo lo que abajo va *(ventana A)* se puede lanzar desde la máquina de desarrollo poniéndole
delante `ssh -i ~/.ssh/preoperaocc_vps root@179.199.132.56`. El 2026-09-22 se perdió un intento
entero mezclando las ventanas y dejando los huecos `USUARIO@IP` sin rellenar; por eso aquí ya
no quedan huecos.

Si algún día esto falla, el paso 5 no se puede hacer como está escrito: significaría que al VPS
se entra por otro camino (la consola web de Hostinger, por ejemplo) y hay que buscar otra forma
de mover la imagen.

### 2 · Aplicar las migraciones pendientes *(ventana B)*

```sh
npx tsx --env-file=.env scripts/migrar-produccion.ts
```

> ### ⚠️ `npm run db:migrar:servidor` **no** migra producción
>
> En el mismo servidor de Neon hay **dos bases**, y la diferencia está solo en el nombre:
>
> | Quién | Base |
> | --- | --- |
> | El `.env` de desarrollo | `neondb` |
> | El contenedor del VPS (`/opt/preoperaocc/.env`) | **`preoperaocc`** |
>
> Host, usuario y contraseña son los mismos, así que `db:migrar:servidor` **conecta sin
> problema, migra la de desarrollo y dice «Listo»**. Producción queda intacta y nada avisa.
> Eso fue exactamente lo que pasó el 2026-09-23. Por eso el comando de arriba es
> `scripts/migrar-produccion.ts`, que reescribe el nombre de la base en memoria.

**Este paso no se salta nunca, aunque «no haya migraciones nuevas».** Si no hay nada pendiente
el script no hace nada; si lo hay y no se corre, el despliegue sale *healthy* y el panel queda
roto para todo el mundo —entra y falla en cada pantalla— hasta que alguien lee los registros.
Pasó el 2026-09-23, con `obras.almacen_activo`.

Va **antes** de encender a propósito: las migraciones de este proyecto son `ADD COLUMN`
aditivos, así que la imagen vieja sigue funcionando con las columnas nuevas puestas. Aplicarlas
primero significa que nunca hay un minuto con el código nuevo y la base vieja.

### 3 · La red de seguridad *(ventana A)*

```sh
docker tag preoperaocc:ultima preoperaocc:anterior && docker images preoperaocc
```

**Tienen que salir dos líneas**, `ultima` y `anterior`. Si sale una sola, parar.

Esto no es opcional: **normalmente no existe ninguna imagen de reserva**. Sin este paso, un
despliegue que salga mal no tiene vuelta atrás.

### 4 · Construir *(ventana B)*

```sh
docker build -t preoperaocc:ultima .
```

Se construye aquí **a propósito**: empaquetar es lo que más memoria consume del proyecto y el
VPS podría quedarse sin RAM justo ahí.

### 5 · Transferir *(ventana B)*

```sh
docker save preoperaocc:ultima | gzip | ssh -i ~/.ssh/preoperaocc_vps root@179.199.132.56 "gunzip | docker load"
```

Unos 436 MB antes de comprimir. Si la conexión se corta, se repite: no deja nada a medias.
Termina diciendo `Loaded image: preoperaocc:ultima`.

### 6 · Encender *(ventana A)*

```sh
cd /opt/preoperaocc && docker compose up -d && docker compose ps
```

Debe decir **healthy** en menos de un minuto. **`up -d`, nunca `down`** — ver la advertencia de
la sección «Cómo está montado de verdad».

### 7 · Comprobar, y en este orden *(ventana A)*

```sh
curl -I https://licitapp-elementaling.cloud          # EL VECINO VA PRIMERO
curl -I https://occ.licitapp-elementaling.cloud      # y después el panel
```

Los dos, `200`. Y por último, abrir en el navegador
`https://occ.licitapp-elementaling.cloud/panel` y mirar que lo que se acaba de desplegar esté
ahí de verdad: una pantalla, un texto o un botón que antes no existiera.

### Volver atrás *(ventana A)*

```sh
docker tag preoperaocc:anterior preoperaocc:ultima && cd /opt/preoperaocc && docker compose up -d
```

### Qué NO hace falta

- **Migraciones**, salvo que el cambio traiga una nueva — pero **compruébalo, no lo supongas**.
  El 2026-09-23 este documento afirmaba que las 15 primeras (`0000` a `0014`) estaban aplicadas
  desde el 2026-09-22, y era falso: al desplegar, el panel dejaba entrar y luego respondía
  *«Algo falló en el servidor»* en cada pantalla, porque `obras.almacen_activo` no existía en
  Neon. El error no se ve al desplegar —el contenedor arranca *healthy*—, solo al iniciar
  sesión.

  Antes de dar por terminada una actualización, corre `npm run db:migrar:servidor` desde la
  máquina de desarrollo. Si no hay nada pendiente no hace nada, así que **no cuesta nada
  correrlo de más y cuesta un sitio caído no correrlo**. Las migraciones de este proyecto son
  `ADD COLUMN` aditivos: no borran datos y tampoco rompen la imagen anterior, de modo que se
  pueden aplicar **antes** de encender la imagen nueva.
- **APK nuevo**, salvo que el cambio toque `src/app/(operador)/`, `src/db/local/`,
  `src/features/sync/`, `src/features/checklists/` o `src/app/api/movil/`. Un cambio que solo
  toca el panel y el servidor no obliga a repartir la app otra vez.
- **Tocar el proxy.** Caddy ya tiene su ruta al panel; una actualización no la altera. Ese era
  el único paso con riesgo para el vecino, y actualizar se lo salta entero.

---

## Dónde queda respaldada la evidencia

Un preoperacional firmado vive en tres sitios, y conviene saber qué protege cada uno:

| Pieza | Dónde | Quién la respalda |
| --- | --- | --- |
| El acta, las respuestas, el veredicto | Neon | Neon, con sus respaldos propios |
| La firma y las fotos | Cloudflare R2 | R2, y no se borran nunca desde la app |
| Una copia de todo | El teléfono que lo creó | Nadie: lo que sube se marca sincronizado, **no se borra** |

El contenedor **no guarda nada**: se puede destruir y recrear sin perder un solo registro.

> Esto se comprueba una vez, con el primer preoperacional real que llegue (RF-28), y se
> anota aquí cuál fue.
