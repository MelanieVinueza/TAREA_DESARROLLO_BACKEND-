# Backend de productos

API REST para PostgreSQL `bdproductos`, tabla `dbo."Producto"`. Implementa MVC, Repository, Singleton del pool y Factory con inyección de dependencias. Express 5 y módulos ES; Node.js 22 o superior.

## Ejecutar en Windows / PowerShell

Desde esta carpeta:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Editar .env y completar DB_USER y DB_PASSWORD localmente.
npm.cmd install
npm.cmd run db:check
npm.cmd test
npm.cmd start
```

En este equipo, la copia global de npm falla con `Cannot find module './cache/policy.js'`. Si ocurre, utilizar la copia incluida con Node.js:

```powershell
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
node server.js
```

La API escucha por defecto en `http://127.0.0.1:5050/api/v1/productos`. `npm.cmd run dev` activa reinicio automático con nodemon. Detener con Ctrl+C; el servidor cierra las solicitudes y el pool.

Toda la configuración se lee y valida en `src/config/env.js`. `.env` está excluido de Git. `.env.example` sirve como plantilla para otras instalaciones. Las variables del entorno prevalecen sobre `.env`. Reiniciar el servidor después de cambiar la configuración.

El servidor HTTP puede iniciar antes de conectar a PostgreSQL. `db:check` verifica las credenciales, la tabla, la cuenta y muestra el conteo real. Una conexión temporalmente inaccesible devuelve 503; una configuración o un esquema incorrectos producen un error seguro sin SQL ni credenciales.

## Base existente y permisos

No se necesita crear otra base: usar `DB_NAME=bdproductos`. Configurar un usuario propio con permisos mínimos. Si todavía no existe, un administrador puede crearlo desde pgAdmin; sustituir la contraseña localmente:

```sql
-- Ejecutar conectado a bdproductos como administrador.
CREATE ROLE productos_app LOGIN PASSWORD 'REEMPLAZAR_CON_CLAVE_LOCAL';
GRANT CONNECT ON DATABASE bdproductos TO productos_app;
GRANT USAGE ON SCHEMA dbo TO productos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dbo."Producto" TO productos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dbo TO productos_app;
```

No ejecutar `CREATE ROLE` si el usuario ya existe. Cambiar `DB_USER` si se usa otra cuenta autorizada. La API no debe conectarse como superusuario.

`sql/001-schema.sql` contiene la definición de la tabla para instalaciones nuevas. Si ya existe, no la modifica. `sql/002-seed.sql` carga 10 000 productos **solo si la tabla está vacía**, con bloqueo y transacción para impedir cargas duplicadas simultáneas. No rellena una tabla parcialmente poblada ni borra datos existentes.

Los scripts SQL pueden ejecutarse desde Query Tool de pgAdmin con una cuenta autorizada. También están disponibles `npm.cmd run db:schema` y `npm.cmd run db:seed`; el primero requiere permisos DDL que no deben otorgarse a la cuenta habitual de la API. El backend no crea tablas ni carga datos automáticamente al iniciar.

```sql
SELECT COUNT(*) AS total_productos FROM dbo."Producto";
```

## Contrato HTTP

| Método | Ruta | Respuesta |
|---|---|---|
| GET | /api/v1/productos?page=1&limit=20 | 200, data y pagination |
| GET | /api/v1/productos/:id | 200, data; 404 si no existe |
| POST | /api/v1/productos | 201, data y Location |
| PUT | /api/v1/productos/:id | 200, reemplazo de los cinco campos |
| PATCH | /api/v1/productos/:id | 200, modificación parcial no vacía |
| DELETE | /api/v1/productos/:id | 204 sin cuerpo; 404 si no existe |

POST y PUT exigen los cinco campos editables. PATCH admite al menos uno. Se rechazan campos desconocidos e ID del cliente. En las escrituras se requiere `Content-Type: application/json`, también válido con `charset=utf-8`.

```json
{
  "nombre": "Teclado mecánico",
  "descripcion": "Teclado con conexión USB",
  "URLImagen": "https://ejemplo.com/imagenes/teclado.jpg",
  "pvp": "49.90",
  "stock": 25
}
```

Ejemplo PowerShell:

```powershell
$producto = @{
    nombre = 'Teclado'
    descripcion = 'Teclado USB'
    URLImagen = 'https://ejemplo.com/teclado.jpg'
    pvp = '49.90'
    stock = 25
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:5050/api/v1/productos' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($producto))
Invoke-RestMethod -Uri 'http://127.0.0.1:5050/api/v1/productos?page=1&limit=20'
```

- `ID`: siempre cadena JSON; acepta de 1 a 9223372036854775807 sin conversión a Number.
- `pvp`: se recibe como **cadena decimal**, sin exponentes ni signo, de 0 a 99999999.99 y hasta dos decimales; siempre se devuelve con dos decimales. Los números JSON se rechazan para mantener un contrato inequívoco.
- `stock`: número JSON entero, de 0 a 2147483647.
- `nombre`: texto no vacío, máximo 250 caracteres. Se recortan espacios externos de los textos.
- `URLImagen`: URL HTTP/HTTPS; se almacena sin descargar su contenido.
- Paginación: page=1, limit=20, máximo 100, orden ascendente por ID. Se rechazan consultas ambiguas, repetidas y desplazamientos fuera del rango seguro.
- Lista vacía: `data: []`, total=0, totalPages=0. Conteo y listado se consultan por separado; pueden variar si hay escrituras concurrentes.
- Una versión diferente a v1 devuelve 404. Los métodos no admitidos en rutas conocidas devuelven 405 con Allow. HEAD usa el comportamiento de GET sin cuerpo.
- Los errores usan `{ "error": { "code": "...", "message": "...", "details": [] } }`; details se incluye solo cuando corresponde. Códigos: 400 entrada/JSON/paginación, 403 origen, 404 recurso/ruta, 405 método, 409 conflicto, 413 tamaño, 415 contenido, 422 validación, 429 tasa, 500 interno y 503 conexión temporalmente inaccesible.

## Arquitectura

```text
server.js → app.js → rutas → middlewares → controlador
                                            ↓
                                      repositorio → modelo / JSON
                                            ↓
                                      pool pg → PostgreSQL
```

La Factory crea el repositorio y el controlador al iniciar la aplicación. El módulo de base de datos conserva una instancia compartida del pool. El modelo define reglas y representación; el repositorio concentra SQL parametrizado. PATCH utiliza una lista fija de columnas. Para agregar otra entidad, crear rutas, validación, modelo, repositorio, controlador y Factory propios, reutilizando middleware global.

Seguridad: Helmet, CORS con orígenes explícitos, límite JSON, limitador de tasa por IP en memoria, identificadores de solicitud y errores sin detalles sensibles. No se confía en proxies automáticamente. El límite de tasa es por proceso; un despliegue con varias instancias necesita un almacén compartido. Antes de una exposición pública, añadir autenticación/autorización y HTTPS. DB_SSL=true verifica los certificados del servidor.

Referencias de implementación: [manejo asíncrono de errores en Express](https://expressjs.com/en/guide/writing-middleware/) y [consultas parametrizadas de node-postgres](https://node-postgres.com/features/queries).

## Pruebas

```powershell
npm.cmd test
```

- `producto.validation.test.js`: tipos, campos, precios, BIGINT, límites y variables.
- `producto.integration.test.js`: peticiones HTTP reales con repositorio de memoria; CRUD, 10 000 elementos simulados, paginación, CORS, tamaño, tasa y errores.
- `producto.repository.test.js`: parametrización SQL y rechazo de columnas arbitrarias.
- `producto.postgres.test.js`: al configurar .env, verifica PostgreSQL real y ejecuta CRUD HTTP dentro de una transacción que termina en ROLLBACK. Se omite explícitamente mientras la contraseña sea el valor de ejemplo. Los identificadores de identidad pueden avanzar, aunque los datos se reviertan.

Las pruebas en memoria no verifican la conexión ni la existencia de los 10 000 productos reales. Para eso ejecutar `db:check` y la prueba PostgreSQL después de configurar las credenciales.

## Frontend separado

La interfaz web está en el repositorio público [TAREA_DESARROLLO_FRONTEND](https://github.com/MelanieVinueza/TAREA_DESARROLLO_FRONTEND). Con el backend iniciado, abre el frontend en <http://localhost:5173>; `CORS_ORIGINS` ya permite ese origen por defecto.

El workflow de GitHub Actions ejecuta `npm ci` y `npm test` con Node.js 22 en cada push o pull request a `main`. La prueba que necesita PostgreSQL queda omitida en CI.
