CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (char_length(code) BETWEEN 1 AND 30),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  aisle_width_m numeric(8,2) NOT NULL DEFAULT 3 CHECK (aisle_width_m > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage warehouses" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160), file_path text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image','pdf')),
  image_width_px integer CHECK (image_width_px > 0), image_height_px integer CHECK (image_height_px > 0),
  point_a jsonb, point_b jsonb, real_distance_m numeric(10,3) CHECK (real_distance_m > 0),
  pixels_per_meter numeric(12,5) CHECK (pixels_per_meter > 0), calibrated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floor_plans TO authenticated;
GRANT ALL ON public.floor_plans TO service_role;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage floor plans" ON public.floor_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER floor_plans_updated_at BEFORE UPDATE ON public.floor_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.map_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), floor_plan_id uuid NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  zone_type text NOT NULL CHECK (zone_type IN ('compartment','entrance','safety','restricted')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120), geometry jsonb NOT NULL,
  width_m numeric(10,2), height_m numeric(10,2), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_zones TO authenticated;
GRANT ALL ON public.map_zones TO service_role;
ALTER TABLE public.map_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage map zones" ON public.map_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER map_zones_updated_at BEFORE UPDATE ON public.map_zones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.aisles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 30), name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  width_m numeric(8,2) NOT NULL CHECK (width_m > 0), geometry jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (warehouse_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aisles TO authenticated;
GRANT ALL ON public.aisles TO service_role;
ALTER TABLE public.aisles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage aisles" ON public.aisles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER aisles_updated_at BEFORE UPDATE ON public.aisles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.racks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  aisle_id uuid NOT NULL REFERENCES public.aisles(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 30), levels integer NOT NULL CHECK (levels BETWEEN 1 AND 100),
  positions_per_level integer NOT NULL DEFAULT 1 CHECK (positions_per_level BETWEEN 1 AND 500),
  width_m numeric(8,2) NOT NULL CHECK (width_m > 0), depth_m numeric(8,2) NOT NULL CHECK (depth_m > 0),
  height_m numeric(8,2) NOT NULL CHECK (height_m > 0), max_capacity_kg numeric(12,2) CHECK (max_capacity_kg > 0),
  x_m numeric(10,2), y_m numeric(10,2), rotation_deg numeric(7,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (warehouse_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.racks TO authenticated;
GRANT ALL ON public.racks TO service_role;
ALTER TABLE public.racks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage racks" ON public.racks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER racks_updated_at BEFORE UPDATE ON public.racks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.storage_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rack_id uuid NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  level_no integer NOT NULL CHECK (level_no > 0), position_no integer NOT NULL CHECK (position_no > 0),
  address_code text NOT NULL UNIQUE, capacity_units integer CHECK (capacity_units > 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (rack_id, level_no, position_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_positions TO authenticated;
GRANT ALL ON public.storage_positions TO service_role;
ALTER TABLE public.storage_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage positions" ON public.storage_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER storage_positions_updated_at BEFORE UPDATE ON public.storage_positions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (char_length(code) BETWEEN 1 AND 80),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skus TO authenticated;
GRANT ALL ON public.skus TO service_role;
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage skus" ON public.skus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER skus_updated_at BEFORE UPDATE ON public.skus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sku_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku_id uuid NOT NULL REFERENCES public.skus(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.storage_positions(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0), assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (position_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sku_assignments TO authenticated;
GRANT ALL ON public.sku_assignments TO service_role;
ALTER TABLE public.sku_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated company users manage assignments" ON public.sku_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sku_assignments_updated_at BEFORE UPDATE ON public.sku_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX floor_plans_warehouse_idx ON public.floor_plans(warehouse_id);
CREATE INDEX map_zones_plan_idx ON public.map_zones(floor_plan_id);
CREATE INDEX aisles_warehouse_idx ON public.aisles(warehouse_id);
CREATE INDEX racks_warehouse_aisle_idx ON public.racks(warehouse_id, aisle_id);
CREATE INDEX positions_rack_idx ON public.storage_positions(rack_id);
CREATE INDEX assignments_sku_idx ON public.sku_assignments(sku_id);