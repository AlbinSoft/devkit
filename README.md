# DevKit

Muchas herramientas que solemos necesitar los desarrolladores en un único sitio.
*Libre de publicidad y libre de cookies.*

## Self Hosting

Adelante, ponlo en tu propio dominio/subdominio para tu uso privado.

Muchas herramientas también funcionan online si lo pones en una carpeta.

## Versión pública

Hay una versión pública con las herramientas que no consumen CPU del servidor
(no necesitan PHP o similares) para quienes no quieran o no puedan hospedar un
clon del Toolkit.

## Por qué

Yo utilizaba muchas herramientas online de buena calidad que hacían mi vida más
fácil pero con el tiempo se estaban haciendo incómodas.

- Cada una un estilo
- Aceptar cookies
- Soportar la publicidad

Así que he decidido hacer mi propio Toolkit. *Libre de publicidad y libre de cookies.*

---

## Cómo funciona

Cada herramienta es un `HTML` con su `JS`, su `CSS` y, opcionalmente, un `PHP`.
Todas se registran en `registry.json`. `index.html` lee ese registro, pinta el
menú y carga bajo demanda los ficheros de cada herramienta al entrar en ella.

Campos de una entrada en `registry.json`:

| Campo | Uso |
|---|---|
| `name`, `title`, `description`, `howto` | textos del menú y la cabecera |
| `slug` | ruta (`/base64`), empieza por `/` |
| `html`, `css`, `js` | ficheros de la herramienta |
| `php` | backend opcional |
| `needs` | array de dependencias de runtime, p. ej. `["php"]`. Sin `needs` = estática |
| `private` | herramienta personal: no entra en ninguna build publicada |
| `assets` | ficheros extra a copiar (además de los `import` locales, que se detectan solos) |

## Desarrollo

Sin dependencias. Hace falta Node solo para `build.js` / `test.js`.

```sh
# servir el árbol tal cual (las herramientas PHP necesitan un server con PHP)
php -S localhost:8000
#   o cualquier estático si no vas a tocar las PHP:
python -m http.server 8000
```

`index.html` deriva su URL base de la ubicación de la página, así que funciona
igual en la raíz de un dominio, en una subcarpeta o en `localhost` sin tocar nada.

Validar el registro antes de commitear:

```sh
node test.js
```

## Build

`build.js` genera una copia lista para desplegar, sin dependencias.

```sh
# edición pública: quita las herramientas con "needs" y las "private"
node build.js --target=public --base=https://devkit.albin.es/ --out=dist

# edición completa: quita solo las "private"
node build.js --target=full --out=dist-full
```

En `--target=public` además borra cualquier `.php`, regenera `sitemap.xml` y
`robots.txt` con el dominio de `--base`, y sella el nombre de caché del
service worker.

## Ediciones

| Dónde | Comando | Incluye |
|---|---|---|
| Tu clon de trabajo | -- | todo, incluidas las `private` |
| Self-host con PHP | release `.zip` (`--target=full`) | todo menos las `private` |
| Self-host sin PHP | `--target=public` | solo estáticas |
| `devkit.albin.es` | `--target=public` (CI) | solo estáticas |

## Deploy

La web pública se despliega sola: cada push a `main` dispara
`.github/workflows/deploy.yml`, que hace `build --target=public` y sincroniza
`dist/` al servidor por `rsync`/SSH.

Está desarmado hasta poner la variable de repo `DEPLOY_ENABLED=true` y estos
valores en *Settings > Secrets and variables > Actions*:

- Variables: `PUBLIC_BASE` (`https://devkit.albin.es/`), `SSH_PORT` (opcional)
- Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`, `DEPLOY_PATH`

Deploy manual equivalente:

```sh
DEPLOY_TARGET="usuario@host:/ruta/web" npm run deploy
```

Un tag `vX.Y.Z` publica una release con el `.zip` de la edición completa
(`.github/workflows/release.yml`).

## Licencia

Pendiente de decidir.
