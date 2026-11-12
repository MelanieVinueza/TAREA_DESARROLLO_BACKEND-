Kit de pruebas - Productos

1. Inicia el backend si no esta ejecutandose: node server.js
2. Importa productos.postman_collection.json en Postman.
3. Ejecuta toda la coleccion en orden: una iteracion, pausa 200 ms entre peticiones.
4. Revisa Test Results. Cada peticion comprueba su codigo HTTP esperado.

La coleccion incluye baseUrl=http://127.0.0.1:5050. No requiere credenciales de PostgreSQL.
El POST guarda su ID en productoId. Las siguientes peticiones usan ese ID; no lo cambies por uno existente.
El CRUD crea un producto temporal, lo modifica y lo elimina. Si interrumpes el recorrido, completa el DELETE para limpiarlo. No repitas POST sin limpiar el producto anterior.
Las pruebas negativas deben rechazar los datos antes de escribir en PostgreSQL.

Resultados esperados: GET/PUT/PATCH 200, POST 201 con Location, DELETE 204 sin cuerpo; recurso eliminado 404; validacion 422; JSON/ID/paginacion invalidos 400; tipo de contenido 415; metodo 405.

Incluye 29 peticiones. Si recibes 429 por ejecuciones repetidas, espera la ventana configurada (15 minutos por defecto).
El kit no fuerza fallos de base de datos ni sobrecarga el servidor. Para las pruebas automatizadas existentes: node --test.

Referencia: https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-examples/
