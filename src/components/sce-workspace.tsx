import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  DoorOpen,
  Download,
  FileImage,
  Grid3X3,
  Map,
  Maximize2,
  Package,
  Pencil,
  Plus,
  Ruler,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function rackColor(code: string) {
  const palette = ["#1d4ed8", "#0ea5a4", "#f97316", "#64748b", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b"];
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h << 5) - h + code.charCodeAt(i);
  return palette[Math.abs(h) % palette.length];
}

type Point = { x: number; y: number };
type Zone = { id: string; type: "compartment" | "entrance" | "safety"; x: number; y: number; w: number; h: number; name: string };
type Aisle = { id: string; code: string; name: string; length: number; width: number };
type Rack = { id: string; code: string; aisle: string; levels: number; capacityPerLevel: number; width: number; depth: number };
type Assignment = { sku: string; description: string; address: string; weight: number };
type LayoutItem = { id: string; kind: "aisle" | "rack"; code: string; aisleCode: string; x: number; y: number; w: number; h: number };
type AisleDraft = Omit<Aisle, "id">;
type RackDraft = Omit<Rack, "id">;

const steps = [
  { id: "plant", label: "Planta", icon: FileImage },
  { id: "areas", label: "Áreas", icon: Map },
  { id: "structures", label: "Estruturas", icon: Grid3X3 },
  { id: "layout", label: "Layout", icon: Sparkles },
  { id: "addressing", label: "Endereçamento", icon: Package },
] as const;

const fieldClass = "h-9 border-border bg-background/60 text-foreground placeholder:text-muted-foreground";

export function SceWorkspace() {
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]["id"]>("plant");
  const [warehouseName, setWarehouseName] = useState("Armazém principal");
  const [warehouseCode, setWarehouseCode] = useState("ARM-01");
  const [aisleWidth, setAisleWidth] = useState(3);
  const [planUrl, setPlanUrl] = useState<string>();
  const [planFile, setPlanFile] = useState<File>();
  const [calibration, setCalibration] = useState<Point[]>([]);
  const [realDistance, setRealDistance] = useState(10);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drawMode, setDrawMode] = useState<Zone["type"] | null>(null);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);
  const [aisleDraft, setAisleDraft] = useState<AisleDraft>({ code: "C01", name: "Corredor 1", length: 12, width: 3 });
  const [rackDraft, setRackDraft] = useState<RackDraft>({ code: "P01", aisle: "C01", levels: 4, capacityPerLevel: 200, width: 6, depth: 1.1 });
  const [editingAisleId, setEditingAisleId] = useState<string>();
  const [editingRackId, setEditingRackId] = useState<string>();
  const [skuDraft, setSkuDraft] = useState({ sku: "", description: "", weight: 0 });
  const [selectedAddress, setSelectedAddress] = useState("AUTO");
  const [notice, setNotice] = useState("Pronto para configurar o armazém");
  const [userId, setUserId] = useState<string>();
  const [authReady, setAuthReady] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (planUrl) URL.revokeObjectURL(planUrl); }, [planUrl]);
  useEffect(() => {
    async function enterWorkspace() {
      const current = await supabase.auth.getUser();
      if (current.data.user) {
        setUserId(current.data.user.id);
        setAuthReady(true);
        return;
      }
      const anonymous = await supabase.auth.signInAnonymously();
      setUserId(anonymous.data.user?.id);
      setAuthReady(true);
      if (anonymous.error) setNotice("Não foi possível iniciar a sessão de trabalho");
    }
    enterWorkspace();
  }, []);

  const pixelsPerMeter = useMemo(() => {
    if (calibration.length !== 2 || realDistance <= 0) return 0;
    const [a, b] = calibration;
    return Math.hypot(b.x - a.x, b.y - a.y) / realDistance;
  }, [calibration, realDistance]);

  const totalLevels = racks.reduce((sum, rack) => sum + rack.levels, 0);
  const occupied = assignments.length;
  const availableAddresses = useMemo(() => racks.flatMap((rack) => Array.from({ length: rack.levels }, (_, level) => {
    const address = `${warehouseCode}-${rack.aisle}-${rack.code}-N${String(level + 1).padStart(2, "0")}`;
    const currentWeight = assignments.filter((item) => item.address === address).reduce((sum, item) => sum + item.weight, 0);
    return currentWeight < rack.capacityPerLevel ? address : null;
  }).filter(Boolean) as string[]), [assignments, racks, warehouseCode]);

  function relativePoint(event: MouseEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onCanvasDown(event: MouseEvent<HTMLDivElement>) {
    const point = relativePoint(event);
    if (activeStep === "plant" && calibration.length < 2) {
      setCalibration((current) => [...current, point]);
      return;
    }
    if (drawMode) setDrawStart(point);
  }

  function onCanvasUp(event: MouseEvent<HTMLDivElement>) {
    if (!drawMode || !drawStart) return;
    const end = relativePoint(event);
    const zone: Zone = {
      id: crypto.randomUUID(),
      type: drawMode,
      x: Math.min(drawStart.x, end.x), y: Math.min(drawStart.y, end.y),
      w: Math.max(12, Math.abs(end.x - drawStart.x)), h: Math.max(12, Math.abs(end.y - drawStart.y)),
      name: drawMode === "compartment" ? `Compartimento ${zones.filter((z) => z.type === "compartment").length + 1}` : drawMode === "entrance" ? `Entrada ${zones.filter((z) => z.type === "entrance").length + 1}` : `Segurança ${zones.filter((z) => z.type === "safety").length + 1}`,
    };
    setZones((current) => [...current, zone]);
    setLayoutItems([]);
    setNotice("Área atualizada; gere o layout novamente para aplicar os novos limites");
    setDrawStart(null);
  }

  function addAisle() {
    if (!aisleDraft.code.trim() || !aisleDraft.name.trim() || aisleDraft.length <= 0 || aisleDraft.width <= 0) {
      setNotice("Por favor, preencha o nome e as medidas válidas do corredor.");
      return;
    }
    if (aisles.some((item) => item.code === aisleDraft.code.trim().toUpperCase() && item.id !== editingAisleId)) {
      setNotice("Já existe um corredor com esse código");
      return;
    }
    if (!fitsAvailableCompartment(aisleDraft.length, aisleDraft.width)) {
      setNotice(`Alerta: o corredor ${aisleDraft.code || "informado"} (${aisleDraft.length} × ${aisleDraft.width} m) é maior que os compartimentos delimitados.`);
      return;
    }
    if (editingAisleId) {
      const previous = aisles.find((item) => item.id === editingAisleId);
      const code = aisleDraft.code.trim().toUpperCase();
      setAisles((current) => current.map((item) => item.id === editingAisleId ? { ...aisleDraft, id: item.id, code, name: aisleDraft.name.trim() } : item));
      if (previous && previous.code !== code) setRacks((current) => current.map((rack) => rack.aisle === previous.code ? { ...rack, aisle: code } : rack));
      setEditingAisleId(undefined);
      setLayoutItems([]);
      setNotice(`Corredor ${code} atualizado; gere o layout novamente`);
      return;
    }
    const aisle = { ...aisleDraft, id: crypto.randomUUID(), code: aisleDraft.code.trim().toUpperCase(), name: aisleDraft.name.trim() };
    setAisles((current) => [...current, aisle]);
    const next = aisles.length + 2;
    setAisleDraft({ code: `C${String(next).padStart(2, "0")}`, name: `Corredor ${next}`, length: aisleDraft.length, width: aisleDraft.width });
    setRackDraft((current) => ({ ...current, aisle: aisle.code }));
  }

  function addRack() {
    if (!aisles.length) { setNotice("Cadastre um corredor antes da prateleira"); return; }
    if (!rackDraft.code.trim() || rackDraft.width <= 0 || rackDraft.depth <= 0 || rackDraft.levels < 1 || rackDraft.capacityPerLevel <= 0 || rackDraft.capacityPerLevel <= 0) {
      setNotice("Por favor, preencha as medidas, níveis e capacidade de peso por nível da prateleira");
      return;
    }
    if (racks.some((item) => item.code === rackDraft.code.trim().toUpperCase() && item.id !== editingRackId)) { setNotice("Já existe uma prateleira com esse código"); return; }
    if (!fitsAvailableCompartment(rackDraft.width, rackDraft.depth)) {
      setNotice(`Alerta: a prateleira ${rackDraft.code || "informada"} (${rackDraft.width} × ${rackDraft.depth} m) é maior que os compartimentos delimitados.`);
      return;
    }
    const aisle = aisles.some((item) => item.code === rackDraft.aisle) ? rackDraft.aisle : aisles[0].code;
    if (editingRackId) {
      setRacks((current) => current.map((item) => item.id === editingRackId ? { ...rackDraft, id: item.id, aisle, code: rackDraft.code.trim().toUpperCase() } : item));
      setEditingRackId(undefined);
      setLayoutItems([]);
      setNotice(`Prateleira ${rackDraft.code.trim().toUpperCase()} atualizada; gere o layout novamente`);
      return;
    }
    setRacks((current) => [...current, { ...rackDraft, id: crypto.randomUUID(), aisle, code: rackDraft.code.trim().toUpperCase() }]);
    const next = racks.length + 2;
    setRackDraft((current) => ({ ...current, code: `P${String(next).padStart(2, "0")}`, aisle }));
  }

  function fitsAvailableCompartment(length: number, depth: number) {
    if (!pixelsPerMeter) return true;
    const compartments = zones.filter((zone) => zone.type === "compartment");
    if (!compartments.length) return true;
    return compartments.some((zone) => length * pixelsPerMeter <= zone.w && depth * pixelsPerMeter <= zone.h);
  }

  function editAisle(item: Aisle) { setEditingAisleId(item.id); setAisleDraft({ code: item.code, name: item.name, length: item.length, width: item.width }); }
  function editRack(item: Rack) { setEditingRackId(item.id); setRackDraft({ code: item.code, aisle: item.aisle, levels: item.levels, capacityPerLevel: item.capacityPerLevel, width: item.width, depth: item.depth }); }
  function deleteAisle(item: Aisle) {
    const removedRackCodes = racks.filter((rack) => rack.aisle === item.code).map((rack) => rack.code);
    setAisles((current) => current.filter((aisle) => aisle.id !== item.id));
    setRacks((current) => current.filter((rack) => rack.aisle !== item.code));
    setAssignments((current) => current.filter((assignment) => !removedRackCodes.some((code) => assignment.address.includes(`-${code}-`))));
    if (editingAisleId === item.id) setEditingAisleId(undefined);
    setLayoutItems([]); setNotice(`Corredor ${item.code} e suas prateleiras foram excluídos`);
  }
  function deleteZone(zone: Zone) {
    setZones((current) => current.filter((z) => z.id !== zone.id));
    setLayoutItems([]);
    setNotice(`${zone.name} removida`);
  }
  function deleteRack(item: Rack) {
    setRacks((current) => current.filter((rack) => rack.id !== item.id));
    setAssignments((current) => current.filter((assignment) => !assignment.address.includes(`-${item.code}-`)));
    if (editingRackId === item.id) setEditingRackId(undefined);
    setLayoutItems([]); setNotice(`Prateleira ${item.code} excluída`);
  }

  function generateLayout() {
    if (!zones.some((zone) => zone.type === "compartment")) {
      setNotice("Desenhe pelo menos um compartimento antes de otimizar");
      setActiveStep("areas");
      return;
    }
    if (!aisles.length || !racks.length) { setNotice("Cadastre corredores e prateleiras com suas medidas antes de gerar o layout"); setActiveStep("structures"); return; }
    if (!pixelsPerMeter) {
      setNotice("Conclua a calibração da planta antes de gerar o layout");
      setActiveStep("plant");
      return;
    }
    const compartments = zones.filter((zone) => zone.type === "compartment");
    const protectedZones = zones.filter((zone) => zone.type !== "compartment");
    const scale = pixelsPerMeter;
    const structureGap = Math.max(4, scale * 0.35);
    const entranceClearance = Math.max(12, aisleWidth * scale);
    const intersects = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, padding = 0) => a.x < b.x + b.w + padding && a.x + a.w + padding > b.x && a.y < b.y + b.h + padding && a.y + a.h + padding > b.y;
    const isInside = (item: { x: number; y: number; w: number; h: number }, area: Zone, inset = 0) => item.x >= area.x + inset && item.y >= area.y + inset && item.x + item.w <= area.x + area.w - inset && item.y + item.h <= area.y + area.h - inset;
    const groups = aisles.map((aisle) => {
      const aisleRacks = racks.filter((rack) => rack.aisle === aisle.code);
      const top: Rack[] = [];
      const bottom: Rack[] = [];
      let topLength = 0;
      let bottomLength = 0;
      aisleRacks.sort((a, b) => b.width - a.width).forEach((rack) => {
        if (topLength <= bottomLength) { top.push(rack); topLength += rack.width; }
        else { bottom.push(rack); bottomLength += rack.width; }
      });
      const requiredLength = Math.max(topLength, bottomLength);
      const maxDepth = Math.max(0, ...aisleRacks.map((rack) => rack.depth));
      return { aisle, top, bottom, requiredLength, maxDepth, w: aisle.length * scale, h: (aisle.width + maxDepth * 2) * scale };
    }).sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const invalid = groups.find((group) => group.requiredLength > group.aisle.length);
    if (invalid) {
      setLayoutItems([]);
      setNotice(`As prateleiras do ${invalid.aisle.code} exigem ${invalid.requiredLength.toFixed(1)} m por lado; o corredor possui ${invalid.aisle.length} m.`);
      return;
    }
    const placed: LayoutItem[] = [];
    const occupiedBlocks: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const group of groups) {
      let placement: { position: Point; compartment: Zone } | undefined;
      for (const area of compartments) {
        for (let y = area.y + structureGap; y + group.h <= area.y + area.h - structureGap && !placement; y += 2) {
          for (let x = area.x + structureGap; x + group.w <= area.x + area.w - structureGap; x += 2) {
            const candidate = { x, y, w: group.w, h: group.h };
            const relevantProtectedZones = protectedZones.filter((zone) => intersects(zone, area));
            const blocked = !isInside(candidate, area, structureGap) || relevantProtectedZones.some((zone) => intersects(candidate, zone, zone.type === "entrance" ? entranceClearance : structureGap)) || occupiedBlocks.some((existing) => intersects(candidate, existing, structureGap));
            if (!blocked) { placement = { position: { x, y }, compartment: area }; break; }
          }
        }
        if (placement) break;
      }
      if (!placement) { setLayoutItems([]); setNotice(`O conjunto do corredor ${group.aisle.code} não cabe integralmente em nenhum compartimento sem invadir entradas ou áreas de segurança.`); return; }
      const { position, compartment } = placement;
      occupiedBlocks.push({ ...position, w: group.w, h: group.h });
      const aisleY = position.y + group.maxDepth * scale;
      const aisleItem: LayoutItem = { id: group.aisle.id, kind: "aisle", code: group.aisle.code, aisleCode: group.aisle.code, x: position.x, y: aisleY, w: group.w, h: group.aisle.width * scale };
      if (!isInside(aisleItem, compartment)) { setLayoutItems([]); setNotice(`O corredor ${group.aisle.code} ultrapassaria o compartimento definido.`); return; }
      placed.push(aisleItem);
      const placeRacks = (items: Rack[], y: number) => {
        let x = position.x;
        items.forEach((rack) => {
          const rackItem: LayoutItem = { id: rack.id, kind: "rack", code: rack.code, aisleCode: group.aisle.code, x, y, w: rack.width * scale, h: rack.depth * scale };
          if (isInside(rackItem, compartment)) placed.push(rackItem);
          x += rack.width * scale;
        });
      };
      placeRacks(group.top, aisleY - group.maxDepth * scale);
      placeRacks(group.bottom, aisleY + group.aisle.width * scale);
    }
    setLayoutItems(placed);
    setNotice("Layout gerado somente dentro dos compartimentos, com entradas e áreas de segurança livres");
  }

  function addAssignment() {
    if (!availableAddresses.length) { setNotice("Não existem níveis livres com capacidade disponível"); return; }
    if (!skuDraft.sku.trim() || !skuDraft.description.trim() || skuDraft.weight <= 0) { setNotice("Informe o código, o nome e o peso do SKU"); return; }
    if (assignments.some((item) => item.sku === skuDraft.sku.trim())) { setNotice("Este SKU já foi atribuído"); return; }
    const address = selectedAddress === "AUTO" || !availableAddresses.includes(selectedAddress) ? availableAddresses[0] : selectedAddress;
    setAssignments((current) => [...current, { sku: skuDraft.sku.trim(), description: skuDraft.description.trim(), weight: skuDraft.weight, address }]);
    setSkuDraft({ sku: "", description: "", weight: 0 });
    setSelectedAddress("AUTO");
    setNotice(`SKU endereçado automaticamente em ${address}`);
  }

  async function exportLayoutImage() {
    const host = canvasRef.current;
    if (!host || !layoutItems.length) { setNotice("Gere o layout antes de criar a imagem"); return; }
    const uniqueRacks = layoutItems.filter((i) => i.kind === "rack").reduce((acc: LayoutItem[], cur) => {
      if (acc.some((a) => a.code === cur.code)) return acc;
      acc.push(cur);
      return acc;
    }, [] as LayoutItem[]);
    const areaItems = zones;
    const legendPadding = 18;
    const legendLineHeight = 22;
    const legendWidth = Math.min(280, Math.max(200, Math.round(Math.max(220, Math.min(300, uniqueRacks.length * 28 + areaItems.length * 22 + 80)))));
    const legendHeight = Math.max(140, 42 + uniqueRacks.length * legendLineHeight + areaItems.length * legendLineHeight + 16);

    const allItems = [...zones, ...layoutItems];
    const bounds = allItems.reduce(
      (acc, item) => ({
        minX: Math.min(acc.minX, item.x),
        minY: Math.min(acc.minY, item.y),
        maxX: Math.max(acc.maxX, item.x + item.w),
        maxY: Math.max(acc.maxY, item.y + item.h),
      }),
      { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
    );
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    let margin = Math.max(12, Math.round(Math.max(contentWidth, contentHeight) * 0.03));

    const computeDimensions = (marginValue: number) => {
      const mainWidth = contentWidth + marginValue * 2;
      const mainHeight = contentHeight + marginValue * 2;
      const totalWidth = mainWidth + legendWidth + marginValue;
      const totalHeight = Math.max(mainHeight, legendHeight + marginValue * 2);
      return { mainWidth, mainHeight, totalWidth, totalHeight };
    };

    let dims = computeDimensions(margin);
    let fillRatio = (contentWidth * contentHeight) / (dims.totalWidth * dims.totalHeight);
    while (fillRatio > 0.95 && margin < 60) {
      margin += 4;
      dims = computeDimensions(margin);
      fillRatio = (contentWidth * contentHeight) / (dims.totalWidth * dims.totalHeight);
    }
    while (fillRatio < 0.85 && margin > 8) {
      margin = Math.max(8, margin - 4);
      dims = computeDimensions(margin);
      fillRatio = (contentWidth * contentHeight) / (dims.totalWidth * dims.totalHeight);
    }

    const finalWidth = 1920;
    const finalHeight = Math.round(finalWidth * dims.totalHeight / dims.totalWidth);
    const scale = finalWidth / dims.totalWidth;

    const canvas = document.createElement("canvas");
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, finalWidth, finalHeight);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    const contentX = margin;
    const contentY = margin;
    const legendX = dims.mainWidth + margin;
    const legendY = margin;

    function hexToRgb(hex: string) {
      const m = hex.replace("#", "");
      const r = parseInt(m.substring(0, 2), 16);
      const g = parseInt(m.substring(2, 4), 16);
      const b = parseInt(m.substring(4, 6), 16);
      return { r, g, b };
    }

    const translateShape = (shape: { x: number; y: number; w: number; h: number }) => ({
      x: contentX + shape.x - bounds.minX,
      y: contentY + shape.y - bounds.minY,
      w: shape.w,
      h: shape.h,
    });

    zones.forEach((zone) => {
      const target = translateShape(zone);
      const fill = zone.type === "compartment" ? "rgba(37,99,235,.18)" : zone.type === "entrance" ? "rgba(22,163,74,.35)" : "rgba(217,119,6,.38)";
      const stroke = zone.type === "compartment" ? "#2563eb" : zone.type === "entrance" ? "#16a34a" : "#d97706";
      context.fillStyle = fill;
      context.strokeStyle = stroke;
      context.lineWidth = 2.5;
      context.fillRect(target.x, target.y, target.w, target.h);
      context.strokeRect(target.x, target.y, target.w, target.h);
      context.fillStyle = "#0f172a";
      context.font = "bold 9px sans-serif";
      const label = zone.type === "compartment" ? "COMP." : zone.type === "entrance" ? "ENTR." : "SEG.";
      context.fillText(label, target.x + 6, target.y + 14);
    });

    layoutItems.forEach((item) => {
      const target = translateShape(item);
      if (item.kind === "rack") {
        const color = rackColor(item.code);
        const rgb = hexToRgb(color);
        context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`;
        context.fillRect(target.x, target.y, target.w, target.h);
        context.strokeStyle = color;
        context.lineWidth = 1.7;
        context.strokeRect(target.x, target.y, target.w, target.h);
        context.fillStyle = "#0f172a";
        context.font = "bold 9px sans-serif";
        context.fillText(`${item.code} · ${item.aisleCode}`, target.x + 6, target.y + Math.min(14, target.h - 4));
      } else {
        context.fillStyle = "#334155";
        context.fillRect(target.x, target.y, target.w, target.h);
        context.strokeStyle = "#94a3b8";
        context.lineWidth = 1.7;
        context.strokeRect(target.x, target.y, target.w, target.h);
        context.fillStyle = "#ffffff";
        context.font = "bold 9px sans-serif";
        context.fillText(`CORREDOR ${item.code}`, target.x + 6, target.y + Math.min(14, target.h - 4));
      }
    });

    const legendBackgroundHeight = Math.max(dims.mainHeight, legendHeight + margin * 2);
    context.fillStyle = "rgba(255,255,255,0.96)";
    context.fillRect(legendX, legendY, legendWidth, legendBackgroundHeight - margin);
    context.strokeStyle = "rgba(15,23,42,0.14)";
    context.lineWidth = 1.5;
    context.strokeRect(legendX, legendY, legendWidth, legendBackgroundHeight - margin);

    context.fillStyle = "#0f172a";
    context.font = "bold 12px sans-serif";
    context.fillText("Legenda", legendX + legendPadding, legendY + 18);
    context.fillStyle = "#475569";
    context.font = "10px sans-serif";
    context.fillText(`${uniqueRacks.length} prateleiras`, legendX + legendPadding, legendY + 34);

    let currentY = legendY + 56;
    context.fillStyle = "#0f172a";
    context.font = "bold 11px sans-serif";
    context.fillText("Prateleiras", legendX + legendPadding, currentY);
    currentY += legendLineHeight;

    uniqueRacks.forEach((it) => {
      const color = rackColor(it.code);
      context.fillStyle = color;
      context.fillRect(legendX + legendPadding, currentY - 14, 14, 14);
      context.strokeStyle = "rgba(15,23,42,0.12)";
      context.strokeRect(legendX + legendPadding, currentY - 14, 14, 14);
      context.fillStyle = "#0f172a";
      context.font = "10px sans-serif";
      context.fillText(`${it.code} · ${it.aisleCode}`, legendX + legendPadding + 20, currentY - 3);
      currentY += legendLineHeight;
    });

    currentY += 8;
    context.font = "bold 10px sans-serif";
    context.fillText("Áreas", legendX + legendPadding, currentY);
    currentY += legendLineHeight;

    areaItems.forEach((zone) => {
      const color = zone.type === "compartment" ? "#2563eb" : zone.type === "entrance" ? "#16a34a" : "#d97706";
      context.fillStyle = color;
      context.fillRect(legendX + legendPadding, currentY - 14, 14, 14);
      context.strokeStyle = "rgba(15,23,42,0.12)";
      context.strokeRect(legendX + legendPadding, currentY - 14, 14, 14);
      context.fillStyle = "#0f172a";
      context.font = "10px sans-serif";
      context.fillText(zone.name, legendX + legendPadding + 20, currentY - 3);
      currentY += legendLineHeight;
    });

    const footerY = legendY + legendBackgroundHeight - margin - 10;
    context.fillStyle = "#0f172a";
    context.font = "bold 11px sans-serif";
    context.fillText(`${warehouseName} · ${warehouseCode}`, legendX + legendPadding, footerY);

    const link = document.createElement("a");
    link.download = `layout-${warehouseCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setNotice("Imagem do layout gerada com sucesso");
  }

  function exportCsv() {
    const rows = [["Armazém", "Corredor", "Prateleira", "Nível", "Endereço", "SKU", "Descrição", "Peso (kg)"]];
    assignments.forEach((assignment) => {
      const [warehouseCodePart, aisle, rackCode, levelPart] = assignment.address.split("-");
      rows.push([warehouseName, aisle, rackCode, levelPart.replace(/^N/, ""), assignment.address, assignment.sku, assignment.description, String(assignment.weight)]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = `enderecamento-${warehouseCode}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function saveProject() {
    if (!userId) { setNotice("A sessão ainda está sendo preparada"); return; }
    const { data: warehouse, error } = await supabase.from("warehouses").upsert({ code: warehouseCode, name: warehouseName, aisle_width_m: aisleWidth, owner_user_id: userId }, { onConflict: "owner_user_id,code" }).select("id").single();
    if (error || !warehouse) { setNotice(error?.message ?? "Não foi possível salvar"); return; }
    if (planFile) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const path = `${userData.user.id}/${warehouse.id}/${Date.now()}-${planFile.name}`;
      const upload = await supabase.storage.from("warehouse-plans").upload(path, planFile);
      if (!upload.error) await supabase.from("floor_plans").insert({ warehouse_id: warehouse.id, name: planFile.name, file_path: path, file_type: planFile.type === "application/pdf" ? "pdf" : "image", point_a: calibration[0] ?? null, point_b: calibration[1] ?? null, real_distance_m: realDistance, pixels_per_meter: pixelsPerMeter || null, calibrated_at: pixelsPerMeter ? new Date().toISOString() : null });
    }
    setNotice("Projeto salvo com segurança");
  }

  if (!authReady) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Preparando o SCE…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Boxes className="size-5" /></div><div><h1 className="text-sm font-bold tracking-wide">SCE</h1><p className="text-[11px] text-muted-foreground">Sistema de Controle de Endereçamento</p></div></div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span className="size-2 rounded-full bg-success" />{notice}</div>
          <Button variant="outline" size="sm" onClick={saveProject}><Save /> Salvar projeto</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-4 lg:px-6">
        <section className="mb-4 flex overflow-x-auto rounded-xl border border-border bg-card p-1.5">
          {steps.map((step, index) => { const Icon = step.icon; const selected = activeStep === step.id; return <Button key={step.id} variant="ghost" onClick={() => setActiveStep(step.id)} className={cn("h-11 min-w-40 flex-1 justify-start rounded-lg text-muted-foreground", selected && "bg-accent text-foreground shadow-sm")}><span className={cn("flex size-7 items-center justify-center rounded-md bg-muted", selected && "bg-primary text-primary-foreground")}><Icon className="size-4" /></span><span className="text-left"><span className="block text-[10px] uppercase tracking-widest opacity-60">Etapa {index + 1}</span><span className="block text-xs font-semibold">{step.label}</span></span></Button>; })}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0">
            <div className="relative min-h-[1080px] overflow-hidden rounded-xl border border-border bg-canvas shadow-inner">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur">
                <div><h2 className="text-sm font-semibold">Mapa operacional</h2><p className="text-[10px] text-muted-foreground">{planUrl ? "Clique e arraste para marcar elementos" : "Envie a planta para começar"}</p></div>
                <div className="flex items-center gap-2"><span className="rounded-md border border-border bg-background px-2 py-1 text-[10px]">{pixelsPerMeter ? `${pixelsPerMeter.toFixed(2)} px/m` : "Não calibrado"}</span><Button variant="outline" size="icon"><Maximize2 /></Button></div>
              </div>
              <div ref={canvasRef} onMouseDown={onCanvasDown} onMouseUp={onCanvasUp} className="absolute inset-0 top-14 cursor-crosshair select-none overflow-hidden bg-grid">
                {planUrl ? <img src={planUrl} alt="Planta do armazém" className="pointer-events-none h-full w-full object-contain opacity-65" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-border bg-card"><Warehouse className="size-7" /></div><p className="text-sm font-medium text-foreground">Nenhuma planta carregada</p><p className="max-w-xs text-center text-[11px]">Envie uma imagem ou PDF e calibre as medidas usando dois pontos.</p></div>}
                {calibration.map((point, index) => <div key={`${point.x}-${point.y}`} className="absolute z-20 -translate-x-1/2 -translate-y-1/2"><span className="block size-4 rounded-full border-4 border-primary bg-primary-foreground shadow-lg" /><span className="absolute left-5 top-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">P{index + 1}</span></div>)}
                {zones.map((zone) => <div key={zone.id} className={cn("absolute rounded-sm border px-1 text-[7px] font-bold shadow-sm", zone.type === "compartment" && "border-zone bg-zone/15 text-zone", zone.type === "entrance" && "border-success bg-success/20 text-success", zone.type === "safety" && "border-warning bg-warning/20 text-warning")} style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h, minHeight: 24 }} title={`${zone.name} (${zone.type === 'compartment' ? 'Compartimento' : zone.type === 'entrance' ? 'Entrada' : 'Segurança'})`}>
                  <div className="w-full overflow-hidden truncate rounded-sm bg-background/90 px-1 py-0.5 text-[7px] tracking-tight">{zone.type === 'compartment' ? 'COMP.' : zone.type === 'entrance' ? 'ENTR.' : 'SEG.'}</div>
                </div>)}

                {(activeStep === "layout" || activeStep === "addressing") && layoutItems.map((item) => <div key={item.id} title={item.kind === "rack" ? `Prateleira ${item.code} · vinculada ao corredor ${item.aisleCode}` : `Corredor ${item.code} · faixa livre para circulação`} className={cn("absolute z-[5] overflow-hidden border px-1 text-center font-bold shadow-sm", item.kind === "rack" ? "rounded-sm" : "layout-aisle border-border text-foreground")} style={{ left: item.x, top: item.y, width: item.w, height: item.h, background: item.kind === 'rack' ? `${rackColor(item.code)}22` : undefined, borderColor: item.kind === 'rack' ? rackColor(item.code) : undefined }} />)}
                {activeStep === "addressing" && assignments.map((assignment) => { const rackCode = assignment.address.split("-").find((part) => racks.some((rack) => rack.code === part)); const item = layoutItems.find((placed) => placed.kind === "rack" && placed.code === rackCode); if (!item) return null; const rackAssignments = assignments.filter((entry) => entry.address.includes(`-${rackCode}-`)); const offset = rackAssignments.findIndex((entry) => entry.sku === assignment.sku); return <div key={assignment.sku} title={`${assignment.description} · ${assignment.address}`} className="absolute z-20 flex size-5 items-center justify-center rounded-full border-2 border-background bg-success text-[8px] font-bold text-success-foreground shadow" style={{ left: item.x + 4 + (offset % Math.max(1, Math.floor((item.w - 8) / 22))) * 22, top: item.y + 4 + Math.floor(offset / Math.max(1, Math.floor((item.w - 8) / 22))) * 22 }}>{offset + 1}</div>; })}
              </div>
            </div>
            {(activeStep === "layout" || activeStep === "addressing") && layoutItems.length > 0 && <div className="mt-3 rounded-2xl border border-border bg-background p-5 text-sm shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">Legenda</div>
                  <small className="text-muted-foreground">{String(layoutItems.filter((i) => i.kind === "rack").length)} prateleiras</small>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Prateleiras</div>
                  {layoutItems.filter((i) => i.kind === "rack").reduce((acc: LayoutItem[], cur) => {
                    if (acc.some((a) => a.code === cur.code)) return acc;
                    acc.push(cur);
                    return acc;
                  }, [] as LayoutItem[]).map((it) => <div key={it.id} className="flex items-center gap-2 rounded-lg border border-border/80 px-2 py-1 text-[12px]"><span style={{ width: 14, height: 14, background: rackColor(it.code), borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)' }} /> <span className="truncate">{it.code} · {it.aisleCode}</span></div>)}
                </div>
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Áreas</div>
                  {zones.map((zone) => <div key={zone.id} className="flex items-center gap-2 rounded-lg border border-border/80 px-2 py-1 text-[12px]"><span style={{ width: 14, height: 14, background: zone.type === "compartment" ? "#2563eb" : zone.type === "entrance" ? "#16a34a" : "#d97706", borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)' }} /> <span className="truncate">{zone.name}</span></div>)}
                </div>
              </div>
            </div>}

          </section>

          <aside className="rounded-xl border border-border bg-card p-4">
            {activeStep === "plant" && <PlantPanel {...{ warehouseName, setWarehouseName, warehouseCode, setWarehouseCode, planFile, setPlanFile, setPlanUrl, calibration, setCalibration, realDistance, setRealDistance, pixelsPerMeter }} />}
            {activeStep === "areas" && <AreasPanel {...{ drawMode, setDrawMode, zones, deleteZone, aisleWidth, setAisleWidth }} />}
            {activeStep === "structures" && <StructuresPanel {...{ aisles, addAisle, aisleDraft, setAisleDraft, racks, addRack, rackDraft, setRackDraft, editingAisleId, editingRackId, editAisle, editRack, deleteAisle, deleteRack }} />}
            {activeStep === "layout" && <LayoutPanel {...{ zones, racks, totalLevels, aisleWidth, generateLayout, layoutItems, exportLayoutImage }} />}
            {activeStep === "addressing" && <AddressPanel {...{ assignments, addAssignment, racks, totalLevels, exportCsv, skuDraft, setSkuDraft, availableAddresses, selectedAddress, setSelectedAddress }} />}
            <div className="mt-5 border-t border-border pt-4"><Button className="w-full" onClick={() => { const current = steps.findIndex((step) => step.id === activeStep); setActiveStep(steps[Math.min(current + 1, steps.length - 1)].id); }}>Avançar etapa <ArrowRight /></Button></div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, copy }: { icon: typeof Ruler; title: string; copy: string }) { return <div className="mb-5"><div className="mb-2 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="size-4" /></span><h2 className="text-sm font-semibold">{title}</h2></div><p className="text-xs leading-relaxed text-muted-foreground">{copy}</p></div>; }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{children}</label>; }

function PlantPanel(props: any) {
  return <><PanelTitle icon={Upload} title="Planta e escala" copy="Envie a planta e marque dois pontos cuja distância real você conhece." /><div className="space-y-3"><div><Label>Armazém</Label><Input value={props.warehouseName} onChange={(e) => props.setWarehouseName(e.target.value)} className={fieldClass} /></div><div><Label>Código</Label><Input value={props.warehouseCode} onChange={(e) => props.setWarehouseCode(e.target.value.toUpperCase())} className={fieldClass} /></div><div><Label>Arquivo da planta</Label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-5 text-xs text-muted-foreground hover:bg-accent"><Upload className="size-4" />{props.planFile?.name ?? "Selecionar imagem ou PDF"}<input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; props.setPlanFile(file); props.setPlanUrl(URL.createObjectURL(file)); props.setCalibration([]); }} /></label></div><div><Label>Distância real entre os pontos (m)</Label><Input type="number" min="0.01" step="0.01" value={props.realDistance} onChange={(e) => props.setRealDistance(Number(e.target.value))} className={fieldClass} /></div><div className="grid grid-cols-2 gap-2"><Metric label="Pontos marcados" value={`${props.calibration.length}/2`} /><Metric label="Escala" value={props.pixelsPerMeter ? `${props.pixelsPerMeter.toFixed(2)} px/m` : "—"} /></div><Button variant="outline" className="w-full" onClick={() => props.setCalibration([])}><Ruler /> Refazer calibração</Button></div></>;
}
function AreasPanel(props: any) { const tools: Array<[Zone["type"], typeof Warehouse, string]> = [["compartment", Warehouse, "Compartimento"], ["entrance", DoorOpen, "Entrada"], ["safety", ShieldAlert, "Área de segurança"]]; return <><PanelTitle icon={DoorOpen} title="Áreas e entradas" copy="Desenhe o perímetro útil, marque entradas e preserve zonas de segurança." /><div className="space-y-3"><div><Label>Largura mínima de corredor (m)</Label><Input type="number" min="0.5" step="0.1" value={props.aisleWidth} onChange={(e) => props.setAisleWidth(Number(e.target.value))} className={fieldClass} /></div><div className="grid gap-2">{tools.map(([type, Icon, label]) => <Button key={type} variant={props.drawMode === type ? "default" : "outline"} className="justify-start" onClick={() => props.setDrawMode(props.drawMode === type ? null : type)}><Icon className="size-4" />{label}</Button>)}</div><p className="rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">Selecione um tipo e arraste sobre a planta. As dimensões serão convertidas para metros após a calibração.</p><div className="space-y-2">{props.zones.map((zone: Zone) => <div key={zone.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"><span>{zone.name}</span><Button size="icon" variant="ghost" className="size-7 text-destructive" title="Remover área" onClick={() => props.deleteZone(zone)}><Trash2 className="size-3.5" /></Button></div>)}</div></div></>; }
function StructuresPanel(props: any) { return <><PanelTitle icon={Grid3X3} title="Estruturas sob medida" copy="Edite ou exclua estruturas cadastradas. Medidas maiores que o compartimento serão bloqueadas com um alerta." /><div className="space-y-5"><div><Label>{props.editingAisleId ? "Editar corredor" : "Novo corredor"}</Label><div className="grid grid-cols-2 gap-2"><Input placeholder="Código" value={props.aisleDraft.code} onChange={(e) => props.setAisleDraft({ ...props.aisleDraft, code: e.target.value.toUpperCase() })} className={fieldClass} /><Input placeholder="Nome" value={props.aisleDraft.name} onChange={(e) => props.setAisleDraft({ ...props.aisleDraft, name: e.target.value })} className={fieldClass} /><NumberField label="Comprimento (m)" value={props.aisleDraft.length} onChange={(value) => props.setAisleDraft({ ...props.aisleDraft, length: value })} /><NumberField label="Largura (m)" value={props.aisleDraft.width} onChange={(value) => props.setAisleDraft({ ...props.aisleDraft, width: value })} /></div><Button size="sm" variant={props.editingAisleId ? "default" : "outline"} className="mt-2 w-full" onClick={props.addAisle}>{props.editingAisleId ? <Check /> : <Plus />}{props.editingAisleId ? "Salvar corredor" : "Adicionar corredor"}</Button>{props.aisles.map((item: Aisle) => <div key={item.id} className={cn("mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs", props.editingAisleId === item.id ? "border-primary bg-primary/10" : "border-border")}><div className="min-w-0 flex-1"><b>{item.code}</b> · {item.name}<p className="text-[10px] text-muted-foreground">{item.length} × {item.width} m</p></div><Button size="icon" variant="ghost" className="size-7" title="Editar corredor" onClick={() => props.editAisle(item)}><Pencil className="size-3.5" /></Button><Button size="icon" variant="ghost" className="size-7 text-destructive" title="Excluir corredor" onClick={() => props.deleteAisle(item)}><Trash2 className="size-3.5" /></Button></div>)}</div><div><Label>{props.editingRackId ? "Editar prateleira" : "Nova prateleira"}</Label><div className="grid grid-cols-2 gap-2"><Input placeholder="Código" value={props.rackDraft.code} onChange={(e) => props.setRackDraft({ ...props.rackDraft, code: e.target.value.toUpperCase() })} className={fieldClass} /><Select value={props.rackDraft.aisle} onValueChange={(value) => props.setRackDraft({ ...props.rackDraft, aisle: value })}><SelectTrigger className={fieldClass}><SelectValue placeholder="Corredor" /></SelectTrigger><SelectContent>{props.aisles.map((item: Aisle) => <SelectItem key={item.id} value={item.code}>{item.code}</SelectItem>)}</SelectContent></Select><NumberField label="Comprimento (m)" value={props.rackDraft.width} onChange={(value) => props.setRackDraft({ ...props.rackDraft, width: value })} /><NumberField label="Profundidade (m)" value={props.rackDraft.depth} onChange={(value) => props.setRackDraft({ ...props.rackDraft, depth: value })} /><NumberField label="Níveis" value={props.rackDraft.levels} step={1} onChange={(value) => props.setRackDraft({ ...props.rackDraft, levels: value })} /><NumberField label="Capacidade por nível (kg)" value={props.rackDraft.capacityPerLevel} step={1} onChange={(value) => props.setRackDraft({ ...props.rackDraft, capacityPerLevel: value })} /></div><Button size="sm" variant={props.editingRackId ? "default" : "outline"} className="mt-2 w-full" onClick={props.addRack}>{props.editingRackId ? <Check /> : <Plus />}{props.editingRackId ? "Salvar prateleira" : "Adicionar prateleira"}</Button>{props.racks.map((item: Rack) => <div key={item.id} className={cn("mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs", props.editingRackId === item.id ? "border-primary bg-primary/10" : "border-border")}><div className="min-w-0 flex-1"><div><b>{item.code}</b> · {item.aisle}</div><p className="mt-1 text-[10px] text-muted-foreground">{item.width} × {item.depth} m · {item.levels} níveis · {item.capacityPerLevel} kg/nível</p></div><Button size="icon" variant="ghost" className="size-7" title="Editar prateleira" onClick={() => props.editRack(item)}><Pencil className="size-3.5" /></Button><Button size="icon" variant="ghost" className="size-7 text-destructive" title="Excluir prateleira" onClick={() => props.deleteRack(item)}><Trash2 className="size-3.5" /></Button></div>)}</div></div></>; }
function LayoutPanel(props: any) { const grouped = props.racks.reduce((result: Record<string, number>, rack: Rack) => ({ ...result, [rack.aisle]: (result[rack.aisle] ?? 0) + 1 }), {}); return <><PanelTitle icon={Sparkles} title="Layout de maior capacidade" copy="Organiza cada prateleira junto ao corredor cadastrado, mantendo entradas, segurança e circulação totalmente livres." /><div className="grid grid-cols-2 gap-2"><Metric label="Níveis totais" value={String(props.totalLevels)} /><Metric label="Corredor mínimo" value={`${props.aisleWidth} m`} /><Metric label="Compartimentos" value={String(props.zones.filter((z: Zone) => z.type === "compartment").length)} /><Metric label="Áreas protegidas" value={String(props.zones.filter((z: Zone) => z.type !== "compartment").length)} /></div><div className="my-4 overflow-hidden rounded-lg border border-border"><div className="border-b border-border bg-muted/70 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wider">Vínculos do layout</p></div><div className="divide-y divide-border">{Object.entries(grouped).map(([aisle, count]) => <div key={aisle} className="flex items-center justify-between px-3 py-2 text-xs"><span><b>{aisle}</b> <small className="text-muted-foreground">corredor</small></span><span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{String(count)} prateleira{count === 1 ? "" : "s"}</span></div>)}</div></div><div className="mb-4 rounded-lg border border-success/25 bg-success/10 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><DoorOpen className="size-3.5 text-success" />Faixa de acesso protegida</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">O sistema reserva, em frente a cada entrada, no mínimo a largura definida para circulação.</p></div><div className="grid gap-2"><Button className="w-full" onClick={props.generateLayout}><Sparkles /> Gerar melhor layout</Button><Button variant="outline" disabled={!props.layoutItems.length} onClick={props.exportLayoutImage}><FileImage /> Gerar imagem do layout</Button></div></>; }
function AddressPanel(props: any) { return <><PanelTitle icon={Package} title="Endereçamento" copy="Cadastre o SKU e escolha um nível livre ou deixe o sistema selecionar automaticamente." /><div className="grid grid-cols-2 gap-2"><Metric label="Níveis totais" value={String(props.totalLevels)} /><Metric label="Disponíveis" value={String(props.availableAddresses.length)} /></div><div className="my-4 space-y-2"><div><Label>Código do SKU</Label><Input placeholder="Ex.: SKU-10025" value={props.skuDraft.sku} onChange={(e) => props.setSkuDraft({ ...props.skuDraft, sku: e.target.value })} className={fieldClass} /></div><div><Label>Nome do SKU</Label><Input placeholder="Ex.: Caixa organizadora 30 L" value={props.skuDraft.description} onChange={(e) => props.setSkuDraft({ ...props.skuDraft, description: e.target.value })} className={fieldClass} /></div><div><NumberField label="Peso do SKU (kg)" value={props.skuDraft.weight} onChange={(value) => props.setSkuDraft({ ...props.skuDraft, weight: value })} /></div><div><Label>Nível de armazenagem</Label><Select value={props.selectedAddress} onValueChange={props.setSelectedAddress}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Automática — próximo nível livre</SelectItem>{props.availableAddresses.map((address: string) => <SelectItem key={address} value={address}>{address}</SelectItem>)}</SelectContent></Select></div><div className="max-h-52 space-y-2 overflow-auto">{props.assignments.slice().reverse().map((item: Assignment) => <div key={item.sku} className="rounded-md border border-border px-3 py-2"><div className="flex justify-between text-xs"><b>{item.sku}</b><span className="text-success">No mapa</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{item.description}</p><p className="mt-1 text-[10px] font-semibold text-primary">{item.address}</p></div>)}</div></div><div className="grid gap-2"><Button variant="outline" onClick={props.addAssignment}><Plus /> Alocar e endereçar SKU</Button><Button onClick={props.exportCsv}><Download /> Exportar planilha CSV</Button></div></>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
function NumberField({ label, value, onChange, step = 0.1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) { return <div><Label>{label}</Label><Input type="number" min={step} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={fieldClass} /></div>; }
