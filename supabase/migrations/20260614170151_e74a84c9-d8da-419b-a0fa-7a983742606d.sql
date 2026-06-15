ALTER TABLE public.warehouses ADD COLUMN owner_user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.skus ADD COLUMN owner_user_id uuid NOT NULL DEFAULT auth.uid();

DROP POLICY "Authenticated company users manage warehouses" ON public.warehouses;
CREATE POLICY "Users manage own warehouses" ON public.warehouses FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY "Authenticated company users manage floor plans" ON public.floor_plans;
CREATE POLICY "Users manage own floor plans" ON public.floor_plans FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = floor_plans.warehouse_id AND w.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = floor_plans.warehouse_id AND w.owner_user_id = auth.uid()));

DROP POLICY "Authenticated company users manage map zones" ON public.map_zones;
CREATE POLICY "Users manage own map zones" ON public.map_zones FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.floor_plans fp JOIN public.warehouses w ON w.id = fp.warehouse_id WHERE fp.id = map_zones.floor_plan_id AND w.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plans fp JOIN public.warehouses w ON w.id = fp.warehouse_id WHERE fp.id = map_zones.floor_plan_id AND w.owner_user_id = auth.uid()));

DROP POLICY "Authenticated company users manage aisles" ON public.aisles;
CREATE POLICY "Users manage own aisles" ON public.aisles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = aisles.warehouse_id AND w.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = aisles.warehouse_id AND w.owner_user_id = auth.uid()));

DROP POLICY "Authenticated company users manage racks" ON public.racks;
CREATE POLICY "Users manage own racks" ON public.racks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = racks.warehouse_id AND w.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = racks.warehouse_id AND w.owner_user_id = auth.uid()));

DROP POLICY "Authenticated company users manage positions" ON public.storage_positions;
CREATE POLICY "Users manage own positions" ON public.storage_positions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.racks r JOIN public.warehouses w ON w.id = r.warehouse_id WHERE r.id = storage_positions.rack_id AND w.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.racks r JOIN public.warehouses w ON w.id = r.warehouse_id WHERE r.id = storage_positions.rack_id AND w.owner_user_id = auth.uid()));

DROP POLICY "Authenticated company users manage skus" ON public.skus;
CREATE POLICY "Users manage own skus" ON public.skus FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY "Authenticated company users manage assignments" ON public.sku_assignments;
CREATE POLICY "Users manage own assignments" ON public.sku_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.storage_positions sp JOIN public.racks r ON r.id = sp.rack_id JOIN public.warehouses w ON w.id = r.warehouse_id WHERE sp.id = sku_assignments.position_id AND w.owner_user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.skus s WHERE s.id = sku_assignments.sku_id AND s.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.storage_positions sp JOIN public.racks r ON r.id = sp.rack_id JOIN public.warehouses w ON w.id = r.warehouse_id WHERE sp.id = sku_assignments.position_id AND w.owner_user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.skus s WHERE s.id = sku_assignments.sku_id AND s.owner_user_id = auth.uid()));

CREATE INDEX warehouses_owner_idx ON public.warehouses(owner_user_id);
CREATE INDEX skus_owner_idx ON public.skus(owner_user_id);