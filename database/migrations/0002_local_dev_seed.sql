-- Local-only seed data for QuickBite Core development.
-- Do not reuse these credentials in production.
INSERT INTO quickbite.users (id,email,password_hash,role)
VALUES
 ('00000000-0000-0000-0000-000000000001','admin@quickbite.local','qb-local-admin:e7651b0df058d85510c7d47f81a7be1ebfadb9f5d4ae1ec049f816946db40fe8715a72e141b8d2ef814a39d6ee2fc50d0726d8cee38c7ec537d15506537fdb0a','admin'),
 ('00000000-0000-0000-0000-000000000002','student@quickbite.local','qb-local-student:c805412b43083f3a66733de504bde52196103dccb1142933c2c42566e9636b686a8b9ce34b50cbce1e6a34501d592a2ca551b83b701f146f0c0b60f62d01e76a','student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO quickbite.profiles (user_id,full_name)
VALUES
 ('00000000-0000-0000-0000-000000000001','Administrador QuickBite'),
 ('00000000-0000-0000-0000-000000000002','Estudiante QuickBite')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO quickbite.categories (id,name)
VALUES ('10000000-0000-0000-0000-000000000001','Bebidas'),
       ('10000000-0000-0000-0000-000000000002','Comidas')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quickbite.products (id,category_id,name,description,price)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agua','Agua embotellada',2500),
       ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Sandwich','Sandwich de prueba',7000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quickbite.inventory (product_id,quantity)
VALUES ('20000000-0000-0000-0000-000000000001',50),
       ('20000000-0000-0000-0000-000000000002',25)
ON CONFLICT (product_id) DO NOTHING;
