# La imagen del servidor del panel.
#
# Dos etapas, y la segunda no hereda nada de la primera salvo lo que se le copia
# a mano. Eso es lo que permite que la imagen final no tenga dentro ni el
# empaquetador, ni las dependencias de desarrollo, ni el código fuente.
#
# ── Se construye sin ningún secreto ──
#
# El empaquetado no necesita credenciales: el código las lee con `process.env`
# en el momento de cada petición, no al compilar. Y `.dockerignore` deja el
# `.env` fuera del contexto, así que no hay forma de que se cuelen por descuido.
# Las credenciales entran al arrancar el contenedor. Ver `compose.yaml`.

# ---------------------------------------------------------------------------
# Etapa 1: empaquetar
# ---------------------------------------------------------------------------
FROM node:22-slim AS constructor

WORKDIR /app

# Las dependencias antes que el código: mientras no cambien `package.json` ni
# `package-lock.json`, Docker reutiliza esta capa y no vuelve a instalar.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Deja `dist/client` (lo que descarga el navegador) y `dist/server` (el
# manifiesto de rutas y el código de cada `+api.ts`, ya empaquetado).
RUN npx expo export --platform web

# ---------------------------------------------------------------------------
# Etapa 2: servir
# ---------------------------------------------------------------------------
FROM node:22-slim AS servidor

WORKDIR /app
ENV NODE_ENV=production

# ── Por qué aquí no se instala nada ──
#
# Porque no hace falta, y se comprobó antes de escribirlo: el bundle de
# `dist/server` es autocontenido —el único `require` de un paquete que le queda
# es `crypto`, que es de Node—, y `expo-server` no tiene ni una dependencia y
# pesa 746 KB. Un `npm ci --omit=dev` aquí instalaría React Native entero para
# no usarlo: cientos de megas de más en una imagen que hay que mandar por la red
# a un VPS en cada despliegue.
COPY --from=constructor --chown=node:node /app/node_modules/expo-server ./node_modules/expo-server
COPY --from=constructor --chown=node:node /app/dist ./dist
COPY --chown=node:node servidor ./servidor

# Sin privilegios. Si algún día una ruta tiene un fallo que permita ejecutar
# algo, que lo ejecute alguien que no puede tocar nada.
USER node

EXPOSE 3000

# `--enable-source-maps` porque los mapas del servidor van dentro de la imagen
# (42 de sus 82 MB) y sin esta bandera Node no los mira: serían peso muerto. Con
# ella, un fallo en producción da una traza que se puede leer en vez de una
# posición dentro de un archivo empaquetado de 800 KB.
CMD ["node", "--enable-source-maps", "servidor/entrada.cjs"]
