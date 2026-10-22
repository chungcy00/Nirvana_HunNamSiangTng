-- 富贵山庄 · schema v1.3 · migration 1/3
-- Apply once, in filename order, as the Supabase database migration role.
-- Fail closed on an existing private.products table; this is not an ALTER migration.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname IN ('private','api'))
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname IN ('private','api')) THEN
    RAISE EXCEPTION 'private/api must be empty for this initial migration; existing installations require an ALTER migration';
  END IF;
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR to_regclass('storage.objects') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'Supabase Auth and Storage schemas are required';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS api;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA api FROM PUBLIC, anon, authenticated;

CREATE TABLE private.product_categories (
  id smallint PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT category_identity CHECK ((id,code) IN
    ((1,'cremation_burial'),(2,'traditional_burial'),(3,'niche'),(4,'funeral'),
     (5,'ancestral_tablet'),(6,'fengshui'),(7,'pet_memorial')))
);
CREATE TABLE private.product_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE CHECK (code IS NULL OR btrim(code) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  series_type text CHECK (series_type IN ('park','hall','cemetery','series')),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE private.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text UNIQUE CHECK (product_code IS NULL OR btrim(product_code) <> ''),
  category_id smallint NOT NULL REFERENCES private.product_categories(id) ON DELETE RESTRICT,
  series_id uuid REFERENCES private.product_series(id) ON DELETE RESTRICT,
  name text,
  slug text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text CHECK (btrim(slug) <> ''),
  product_form text CHECK (product_form IN ('lot','package','other')),
  capacity_group text CHECK (capacity_group IN ('single','double','triple','four_plus','family')),
  capacity_count integer CHECK (capacity_count > 0),
  subtitle text,
  description text,
  price_display_mode text NOT NULL DEFAULT 'fixed'
    CHECK (price_display_mode IN ('fixed','multiple','starting_from','funeral_dual')),
  price_note_override text,
  internal_notes text,
  source_reference text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','published','hidden')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT capacity_consistent CHECK (
    capacity_count IS NULL OR capacity_group IS NULL OR capacity_group='family' OR
    (capacity_group='single' AND capacity_count=1) OR
    (capacity_group='double' AND capacity_count=2) OR
    (capacity_group='triple' AND capacity_count=3) OR
    (capacity_group='four_plus' AND capacity_count>=4)),
  CONSTRAINT capacity_category CHECK (
    (category_id IN (1,2) AND (capacity_group IS NULL OR capacity_group IN ('single','double','family'))) OR
    (category_id=3 AND (capacity_group IS NULL OR capacity_group IN ('single','double','triple','four_plus'))) OR
    (category_id IN (4,5,6,7) AND capacity_group IS NULL AND capacity_count IS NULL))
);
CREATE TABLE private.burial_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  facing text,
  area_sqft numeric(12,2) CHECK (area_sqft > 0 AND area_sqft <> 'NaN'::numeric),
  length_ft numeric(10,2) CHECK (length_ft > 0 AND length_ft <> 'NaN'::numeric),
  width_ft numeric(10,2) CHECK (width_ft > 0 AND width_ft <> 'NaN'::numeric),
  urn_capacity integer CHECK (urn_capacity > 0),
  cremation_count integer CHECK (cremation_count > 0),
  burial_notes text
);
CREATE TABLE private.niche_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  theme_name text, niche_style text, niche_notes text
);
CREATE TABLE private.funeral_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  duration_days integer CHECK (duration_days > 0),
  duration_nights integer CHECK (duration_nights >= 0),
  funeral_method text CHECK (funeral_method IN ('cremation','burial','both')),
  service_venue text, terms_summary text
);
CREATE TABLE private.tablet_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  tablet_type text,
  tablet_capacity integer CHECK (tablet_capacity > 0),
  facing text, tablet_notes text
);
CREATE TABLE private.fengshui_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  fengshui_type text, facing text,
  area_sqft numeric(12,2) CHECK (area_sqft > 0 AND area_sqft <> 'NaN'::numeric),
  configuration_notes text
);
CREATE TABLE private.pet_details (
  product_id uuid PRIMARY KEY REFERENCES private.products(id) ON DELETE CASCADE,
  pet_burial_method text CHECK (pet_burial_method IN ('body_burial','ash_burial')),
  pet_size_class text,
  length_ft numeric(10,2) CHECK (length_ft > 0 AND length_ft <> 'NaN'::numeric),
  width_ft numeric(10,2) CHECK (width_ft > 0 AND width_ft <> 'NaN'::numeric),
  area_sqft numeric(12,2) CHECK (area_sqft > 0 AND area_sqft <> 'NaN'::numeric),
  facing text, pet_notes text
);
CREATE TABLE private.religions (
  id smallint PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE private.product_religions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES private.products(id) ON DELETE CASCADE,
  religion_id smallint NOT NULL REFERENCES private.religions(id) ON DELETE RESTRICT,
  configuration_name text, configuration_notes text,
  is_published boolean NOT NULL DEFAULT false,
  UNIQUE (product_id,religion_id)
);
CREATE TABLE private.product_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES private.products(id) ON DELETE CASCADE,
  offer_code text NOT NULL DEFAULT 'default' CHECK (btrim(offer_code) <> ''),
  name text,
  religion_id smallint,
  position_type text, facing_override text,
  area_sqft_override numeric(12,2)
    CHECK (area_sqft_override > 0 AND area_sqft_override <> 'NaN'::numeric),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (product_id,id),
  UNIQUE (product_id,offer_code),
  FOREIGN KEY (product_id,religion_id)
    REFERENCES private.product_religions(product_id,religion_id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE
);
CREATE TABLE private.offer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES private.product_offers(id) ON DELETE CASCADE,
  price_type text NOT NULL CHECK (price_type IN ('standard','pre_need','at_need')),
  price_amount numeric(12,2) NOT NULL CHECK (price_amount > 0 AND price_amount <> 'NaN'::numeric),
  currency char(3) NOT NULL DEFAULT 'MYR' CHECK (currency='MYR'),
  price_note text,
  is_published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (offer_id,price_type)
);
CREATE TABLE private.product_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES private.products(id) ON DELETE CASCADE,
  offer_id uuid,
  religion_id smallint,
  item_name text NOT NULL CHECK (btrim(item_name) <> ''),
  quantity numeric(10,2) CHECK (quantity > 0 AND quantity <> 'NaN'::numeric),
  unit text, description text,
  sort_order integer NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id,offer_id) REFERENCES private.product_offers(product_id,id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE,
  FOREIGN KEY (product_id,religion_id)
    REFERENCES private.product_religions(product_id,religion_id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE
);
CREATE TABLE private.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES private.products(id) ON DELETE CASCADE,
  religion_id smallint,
  storage_bucket text NOT NULL REFERENCES storage.buckets(id) ON DELETE RESTRICT,
  storage_path text NOT NULL CHECK (btrim(storage_path) <> '' AND storage_path !~ '(^/|(^|/)\.\.(/|$))'),
  image_type text NOT NULL DEFAULT 'real' CHECK (image_type IN ('primary','real','design')),
  alt_text text, design_name text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  UNIQUE (storage_bucket,storage_path),
  FOREIGN KEY (product_id,religion_id)
    REFERENCES private.product_religions(product_id,religion_id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE,
  CHECK (NOT is_primary OR religion_id IS NULL),
  CHECK (NOT (is_published AND image_type='design' AND religion_id IS NOT NULL)
         OR NULLIF(btrim(design_name),'') IS NOT NULL),
  CHECK (design_name IS NULL OR (design_name=btrim(design_name) AND design_name<>''))
);
CREATE UNIQUE INDEX product_one_public_primary ON private.product_images(product_id)
  WHERE is_primary AND is_published;
CREATE TABLE private.catalog_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_type text NOT NULL DEFAULT 'price' CHECK (notice_type='price'),
  content text NOT NULL CHECK (btrim(content) <> ''),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.admin_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','editor')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','PUBLISH','HIDE')),
  old_data jsonb, new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX products_category_status_order ON private.products(category_id,publication_status,sort_order);
CREATE INDEX products_category_capacity ON private.products(category_id,capacity_group);
CREATE INDEX products_series ON private.products(series_id);
CREATE INDEX product_religions_filter ON private.product_religions(religion_id,product_id);
CREATE INDEX product_images_order ON private.product_images(product_id,sort_order);
CREATE INDEX product_inclusions_order ON private.product_inclusions(product_id,sort_order);
CREATE INDEX product_inclusions_offer ON private.product_inclusions(product_id,offer_id);
CREATE INDEX product_images_religion ON private.product_images(product_id,religion_id);
CREATE INDEX product_offers_religion ON private.product_offers(product_id,religion_id);
CREATE INDEX audit_logs_time ON private.audit_logs(created_at);
CREATE INDEX audit_logs_product_history ON private.audit_logs(table_name,record_id,action);

INSERT INTO private.product_categories(id,code,name,sort_order) VALUES
 (1,'cremation_burial','火化土葬',1),(2,'traditional_burial','传统土葬',2),
 (3,'niche','骨灰位',3),(4,'funeral','殡仪服务',4),
 (5,'ancestral_tablet','祖先牌位',5),(6,'fengshui','生基风水',6),(7,'pet_memorial','宠物安葬',7);
-- Dictionary examples only; no products, offers or fabricated prices are seeded.
INSERT INTO private.religions(id,code,name) VALUES (1,'buddhism','佛教'),(2,'christianity','基督教');
INSERT INTO private.catalog_notices(content) VALUES ('以上价格未包含印花税。');

-- Default-deny immediately, even if only migration 1 has been applied.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='private' LOOP
    EXECUTE format('ALTER TABLE private.%I ENABLE ROW LEVEL SECURITY',t.tablename);
    EXECUTE format('REVOKE ALL ON private.%I FROM PUBLIC, anon, authenticated',t.tablename);
  END LOOP;
END $$;
COMMIT;
