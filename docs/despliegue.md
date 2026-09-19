# Despliegue — procedimiento

Cómo sale este proyecto de `localhost`. Es un guion para seguir de arriba abajo, con la
reversa de cada paso escrita antes de ejecutarlo (spec 014, RF-10).

> **La regla que manda sobre todas:** en ese VPS ya corre otro proyecto y **no se puede
> caer**. Por eso hay un paso que se repite después de cada cambio al proxy: *comprobar
> primero el dominio del vecino*. Si el vecino no responde, se deshace y se para.

**Lo que ya está hecho** (T1–T4, en el repositorio): la entrada del servidor, la imagen,
el compose y el perfil de compilación del APK. Aquí empieza lo que toca máquinas.

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

## Actualizar el panel más adelante

Con OCC ya usándolo, se acepta un corte breve fuera del horario de obra (RF-11). Los
operadores no se enteran: el celular trabaja sin señal y su cola reintenta sola.

```sh
# En desarrollo
docker build -t preoperaocc:ultima .
docker save preoperaocc:ultima | gzip | ssh USUARIO@IP_DEL_VPS 'gunzip | docker load'

# En el VPS
cd "$PANEL_DIR" && docker compose up -d      # recrea el contenedor con la imagen nueva
docker compose ps                             # healthy
```

> **Reversa:** hay que tener la imagen anterior etiquetada antes de sobrescribir.
> Antes de construir: `docker tag preoperaocc:ultima preoperaocc:anterior` en el VPS.
> Para volver: retiquetar `anterior` como `ultima` y `docker compose up -d`.

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
