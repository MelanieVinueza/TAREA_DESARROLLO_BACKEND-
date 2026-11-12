-- Solo carga una tabla vacía: no duplica registros al repetirlo.
BEGIN;
LOCK TABLE dbo."Producto" IN EXCLUSIVE MODE;
INSERT INTO dbo."Producto" (nombre, descripcion, "URLImagen", pvp, stock)
SELECT 'Producto ' || n,
  'Descripción detallada del producto número ' || n,
  'https://ejemplo.com/imagenes/producto_' || n || '.jpg',
  ROUND((RANDOM() * 500 + 10)::NUMERIC, 2),
  FLOOR(RANDOM() * 100 + 1)::INTEGER
FROM generate_series(1, 10000) AS serie(n)
WHERE NOT EXISTS (SELECT 1 FROM dbo."Producto");
COMMIT;
