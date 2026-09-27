-- QuickBite Core — catalog/menu hardening
-- Tarea 06/17
-- Catalog rules and read model for the future API. No production data is seeded.

BEGIN;

ALTER TABLE quickbite.categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE quickbite.products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku
  ON quickbite.products(sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_active_order
  ON quickbite.categories(active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_products_menu_order
  ON quickbite.products(category_id, active, sort_order, name);

ALTER TABLE quickbite.categories
  DROP CONSTRAINT IF EXISTS categories_sort_order_check;

ALTER TABLE quickbite.categories
  ADD CONSTRAINT categories_sort_order_check
  CHECK (sort_order >= 0);

ALTER TABLE quickbite.products
  DROP CONSTRAINT IF EXISTS products_sort_order_check;

ALTER TABLE quickbite.products
  ADD CONSTRAINT products_sort_order_check
  CHECK (sort_order >= 0);

ALTER TABLE quickbite.products
  DROP CONSTRAINT IF EXISTS products_image_url_check;

ALTER TABLE quickbite.products
  ADD CONSTRAINT products_image_url_check
  CHECK (image_url IS NULL OR length(trim(image_url)) > 0);

CREATE OR REPLACE VIEW quickbite.v_menu AS
SELECT
  p.id,
  p.category_id,
  c.name AS category_name,
  c.sort_order AS category_sort_order,
  p.sku,
  p.name,
  p.description,
  p.price,
  p.stock,
  (p.stock > 0) AS in_stock,
  p.image_url,
  p.calories,
  p.protein_g,
  p.carbohydrates_g,
  p.fats_g,
  p.sort_order AS product_sort_order
FROM quickbite.products AS p
LEFT JOIN quickbite.categories AS c
  ON c.id = p.category_id
WHERE p.active = TRUE
  AND (c.id IS NULL OR c.active = TRUE);

COMMENT ON VIEW quickbite.v_menu
IS 'API read model for the active cafeteria menu. Prices and stock come from PostgreSQL.';

COMMIT;
