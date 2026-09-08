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

## Herramientas

<!-- TOOLS:START -->

<!-- Generado por readme-tools.js desde registry.json. No editar a mano: npm run readme -->

### Browsers

- **Browser Report** `/browser-report` — Full browser report: user agent, network, battery, storage, permissions, GPU, WebGL and supported APIs.
- **Screen Resolution** `/screen-resolution` — Check your screen resolution, window size, pixel density, color depth and display orientation.

### Code

- **JSON Beautifier** `/json-beautifier` — Format and pretty-print JSON with configurable indentation, or minify it to a single line.
- **Regex tester** `/regex` — Test a JavaScript regular expression against sample text: live match highlighting, capture groups and a replacement preview.
- **SQL Beautifier** `/sql-beautifier` — Format and prettify SQL queries with configurable dialect, indentation and keyword casing. Supports MySQL, PostgreSQL, T-SQL, PL/SQL, SQLite, MariaDB, DB2 and BigQuery.

### Files

- **Background Remover** `/bg-remove` — Remove the background from any photo using a hosted AI model, with a choice of models for different subjects.
- **Email viewer** `/view-email` — Open and preview .eml email files directly in your browser — headers, body and attachments.
- **Favicon generator** `/favicongen` — Generate all favicon sizes (ICO, PNG, Apple Touch, Android Chrome) and manifest.json from a single image.
- **Hex viewer** `/hex-view` — Open any binary file and inspect its raw bytes as a hex dump. 16 bytes per row with ASCII sidebar. Hover or click a byte to highlight the corresponding pair and see its value.
- **Image converter** `/image-converter` — Convert images between JPEG, PNG and WebP formats instantly in your browser, no upload needed.
- **Image optimizer** `/image-optimizer` — Compress and optimize JPEG, PNG and WebP images in your browser using native codecs, no upload needed.
- **Image resizer** `/image-resizer` — Resize one or more images by max width, max height, or fixed dimensions with contain, cover or stretch fit. No upload needed.
- **Image Shrink** `/image-shrink` — Shrink JPEG, PNG, WebP or AVIF images using a hosted compression service, with optional format conversion.
- **JSON viewer** `/view-json` — Visualize and explore JSON data as an interactive tree. Filter results with JSONPath expressions.
- **Literals rewrite** `/literals-rewrite` _(needs php; private)_ — Rewrite string literals in JSON files.
- **Markdown viewer** `/view-markdown` — Preview Markdown as rendered HTML in real time, with a toggle to inspect the generated HTML source.
- **Metadata viewer** `/metadata-viewer` — Inspect the metadata of a JPEG, PNG, WebP or TIFF image: EXIF, GPS location, XMP, IPTC, ICC profile and PNG text chunks. Nothing is uploaded.
- **QR code generator** `/qr-code` — Generate a QR code from text or a URL and download it as PNG or SVG. Everything runs locally in your browser.

### Network

- **CIDR calculator** `/cidr` — Calculate network address, broadcast, host range, subnet mask and more from any IPv4 CIDR block.
- **DNS lookup** `/dns-lookup` — Query DNS records for any domain via DNS-over-HTTPS. Supports A, AAAA, MX, TXT, NS, CNAME, SOA, CAA and PTR.
- **Ping** `/ping` _(needs php)_ — Send ICMP pings to any hostname or IPv4 address and measure round-trip time, with live streaming output.
- **Traceroute** `/traceroute` _(needs php)_ — Trace the network path to any hostname or IPv4 address, hop by hop, with live streaming output.
- **What Is My IP** `/what-is-my-ip` — Instantly see your public IPv4 and IPv6 addresses, plus geolocation, ISP and network details.
- **Whois** `/whois` _(needs php)_ — Query WHOIS records for any domain or IPv4 address. Follows referrals to the authoritative server automatically.

### Security

- **Hash checker** `/hash-checker` — Verify file or text integrity by computing and comparing MD5, SHA-1, SHA-256 or SHA-512 hashes, entirely in your browser.
- **JWT decoder** `/jwt` — Decode a JSON Web Token's header and payload, inspect the standard claims with expiry countdown, and verify HS256/384/512 signatures with a shared secret.
- **Password generator** `/password-generator` — Generate strong, cryptographically random passwords with full control over length, character sets and quantity.

### Server

- **htpasswd generator** `/htpasswd` — Generate .htaccess and .htpasswd content for Apache HTTP Basic Authentication using bcrypt.

### Settings

- **API Keys** `/settings` — Configure personal API keys for the tools that use hosted services (Tinify, Background Removal).

### String

- **Base64** `/base64` — Encode text to Base64 or decode Base64 back to plain text, directly in your browser.
- **Case converter** `/case-converter` — Convert text or identifiers between camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE and more.
- **Char info** `/char-info` — Look up any character's ASCII value, Unicode codepoint and all its encodings: decimal, hex, U+, HTML entities, CSS escape, URL percent-encoding, UTF-8 bytes and binary.
- **Epoch converter** `/epoch` — Convert Unix timestamps to and from human dates: seconds or milliseconds, UTC and local time, relative time, ISO week and a live clock.
- **HTML Entities** `/html-entities` — Encode special characters to HTML entities (&amp;, &lt;, &gt;, &quot;, &#39;) or decode any HTML entity — named or numeric — back to plain text.
- **MD5** `/md5` — Generate an MD5 hash from any text string, instantly in your browser.
- **SHA hash** `/sha-hash` — Generate SHA-1, SHA-256 or SHA-512 hashes from any text string, instantly in your browser.
- **String / Array** `/string-array` — Turn a newline-separated list into a JS array literal and back, and run list operations on it: map case, sort, unique, filter empties and stringify for a SQL IN clause.
- **URL encoding** `/urlencode` — Encode or decode URL components (percent-encoding) instantly in your browser.
- **UUID generator** `/uuid` — Generate cryptographically random UUIDs v4 or time-ordered UUIDs v7, in bulk.

_39 herramientas en 8 grupos._

<!-- TOOLS:END -->

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

Al añadir o cambiar una herramienta, regenerar la lista de la sección
[Herramientas](#herramientas) (se rellena sola desde `registry.json`):

```sh
npm run readme
```

Validar el registro y que la lista del README esté al día:

```sh
npm test
```

CI ejecuta ambas comprobaciones en cada push y PR.

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
