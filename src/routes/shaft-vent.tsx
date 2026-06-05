import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type VentStyle = "ring" | "circle";

interface Params {
  // 共用
  shaftDia: number; // 转轴外径
  count: number; // 通风孔数目
  offsetDeg: number; // 偏移角度
  // 圆孔
  holeDia: number; // 通风孔直径
  pitchDia: number; // 通风孔位置直径
  // 环形
  innerDia: number; // 通风孔内圆直径
  archH: number; // 通风孔高度（径向）
  toothW: number; // 齿宽（角向，单位°）
}

const defaultParams: Params = {
  shaftDia: 120,
  count: 6,
  offsetDeg: 0,
  holeDia: 14,
  pitchDia: 80,
  innerDia: 60,
  archH: 14,
  toothW: 8,
};

type DimKey =
  | "shaftDia"
  | "count"
  | "offsetDeg"
  | "holeDia"
  | "pitchDia"
  | "innerDia"
  | "archH"
  | "toothW";

export function ShaftVentDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [style, setStyle] = useState<VentStyle>("circle");
  const [p, setP] = useState<Params>(defaultParams);
  const [hot, setHot] = useState<DimKey | null>(null);

  const set = <K extends keyof Params>(k: K, v: Params[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(1280px,96vw)] !max-w-none p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b border-border px-5 py-3">
          <SheetTitle className="text-[14px]">
            转轴 · 径向通风道配置
            <span className="ml-2 rounded bg-[var(--fem-bg)] px-1.5 py-0.5 text-[11px] font-normal text-[var(--fem)]">
              异步电机
            </span>
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            选择通风道样式并配置参数，右侧示意图随参数实时缩放；鼠标悬停参数行可高亮对应尺寸标号。
          </SheetDescription>
        </SheetHeader>

        <div className="grid h-[calc(100vh-72px)] grid-cols-[420px_1fr]">
          {/* 左：参数表 */}
          <div className="overflow-y-auto border-r border-border">
            <div className="border-b border-border px-5 py-4">
              <div className="mb-2 text-[12px] font-medium text-muted-foreground">通风道样式</div>
              <RadioGroup
                value={style}
                onValueChange={(v) => setStyle(v as VentStyle)}
                className="grid grid-cols-2 gap-2"
              >
                <StyleCard
                  selected={style === "circle"}
                  value="circle"
                  title="圆孔"
                  desc="沿圆周均布的圆形通风孔"
                />
                <StyleCard
                  selected={style === "ring"}
                  value="ring"
                  title="环形"
                  desc="环形弧段+齿宽间隔"
                />
              </RadioGroup>
            </div>

            <div className="px-5 py-4">
              <div className="mb-2 text-[12px] font-medium text-muted-foreground">尺寸参数</div>
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                <PRow
                  label="转轴外径"
                  unit="mm"
                  value={p.shaftDia}
                  min={20}
                  onChange={(v) => set("shaftDia", v)}
                  hot={hot === "shaftDia"}
                  onHot={() => setHot("shaftDia")}
                  onCold={() => setHot(null)}
                />
                <PRow
                  label="通风孔数目"
                  unit="个"
                  value={p.count}
                  min={1}
                  step={1}
                  integer
                  onChange={(v) => set("count", v)}
                  hot={hot === "count"}
                  onHot={() => setHot("count")}
                  onCold={() => setHot(null)}
                />
                {style === "circle" ? (
                  <>
                    <PRow
                      label="通风孔直径"
                      unit="mm"
                      value={p.holeDia}
                      min={1}
                      onChange={(v) => set("holeDia", v)}
                      hot={hot === "holeDia"}
                      onHot={() => setHot("holeDia")}
                      onCold={() => setHot(null)}
                      mark="①"
                    />
                    <PRow
                      label="通风孔位置直径"
                      unit="mm"
                      value={p.pitchDia}
                      min={1}
                      onChange={(v) => set("pitchDia", v)}
                      hot={hot === "pitchDia"}
                      onHot={() => setHot("pitchDia")}
                      onCold={() => setHot(null)}
                      mark="②"
                    />
                  </>
                ) : (
                  <>
                    <PRow
                      label="通风孔内圆直径"
                      unit="mm"
                      value={p.innerDia}
                      min={1}
                      onChange={(v) => set("innerDia", v)}
                      hot={hot === "innerDia"}
                      onHot={() => setHot("innerDia")}
                      onCold={() => setHot(null)}
                      mark="①"
                    />
                    <PRow
                      label="通风孔高度"
                      unit="mm"
                      value={p.archH}
                      min={1}
                      onChange={(v) => set("archH", v)}
                      hot={hot === "archH"}
                      onHot={() => setHot("archH")}
                      onCold={() => setHot(null)}
                      mark="②"
                    />
                    <PRow
                      label="齿宽"
                      unit="°"
                      value={p.toothW}
                      min={0}
                      onChange={(v) => set("toothW", v)}
                      hot={hot === "toothW"}
                      onHot={() => setHot("toothW")}
                      onCold={() => setHot(null)}
                      mark="④"
                    />
                  </>
                )}
                <PRow
                  label="偏移角度"
                  unit="°"
                  value={p.offsetDeg}
                  onChange={(v) => set("offsetDeg", v)}
                  hot={hot === "offsetDeg"}
                  onHot={() => setHot("offsetDeg")}
                  onCold={() => setHot(null)}
                  mark="③"
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                提示：示意图为等比例缩放预览，仅用于校核参数关系；最终模型以求解器为准。
              </p>
            </div>
          </div>

          {/* 右：示意图 */}
          <div className="relative flex flex-col bg-[hsl(var(--muted))]/30">
            <div className="flex items-center justify-between border-b border-border bg-background px-5 py-2 text-[12px]">
              <span className="font-medium">尺寸示意图 · {style === "circle" ? "圆孔通风" : "环形通风"}</span>
              <button
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                onClick={() => onOpenChange(false)}
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <VentDiagram style={style} p={p} hot={hot} />
              <Legend style={style} hot={hot} onHover={setHot} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StyleCard({
  selected,
  value,
  title,
  desc,
}: {
  selected: boolean;
  value: string;
  title: string;
  desc: string;
}) {
  return (
    <Label
      htmlFor={`vs-${value}`}
      className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors ${
        selected
          ? "border-[var(--fem)] bg-[var(--fem-bg)]"
          : "border-border hover:border-[var(--fem)] hover:bg-[var(--fem-bg)]/40"
      }`}
    >
      <RadioGroupItem value={value} id={`vs-${value}`} className="mt-0.5" />
      <div>
        <div className={`text-[13px] font-medium ${selected ? "text-[var(--fem)]" : ""}`}>{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

function PRow({
  label,
  unit,
  value,
  onChange,
  min,
  step,
  integer,
  hot,
  onHot,
  onCold,
  mark,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  integer?: boolean;
  hot: boolean;
  onHot: () => void;
  onCold: () => void;
  mark?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_120px_40px] items-center gap-2 px-3 py-2 text-[12px] transition-colors ${
        hot ? "bg-yellow-100/70" : "hover:bg-accent/40"
      }`}
      onMouseEnter={onHot}
      onMouseLeave={onCold}
    >
      <div className="flex items-center gap-1.5">
        {mark && (
          <span
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-bold ${
              hot ? "bg-yellow-300 text-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {mark}
          </span>
        )}
        <span>{label}</span>
      </div>
      <Input
        className="h-7 text-[12px]"
        type="number"
        value={value}
        step={step ?? 0.1}
        min={min}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Number.isNaN(v)) v = 0;
          if (integer) v = Math.trunc(v);
          if (min !== undefined && v < min) v = min;
          onChange(v);
        }}
        onFocus={onHot}
      />
      <span className="text-[11px] text-muted-foreground">{unit}</span>
    </div>
  );
}

/** 示意图 */
function VentDiagram({ style, p, hot }: { style: VentStyle; p: Params; hot: DimKey | null }) {
  // 自适应 viewBox：以最大几何为基准 + 边距
  const Rshaft = p.shaftDia / 2;
  const Rmax = useMemo(() => {
    if (style === "circle") return Math.max(Rshaft, p.pitchDia / 2 + p.holeDia / 2);
    return Math.max(Rshaft, p.innerDia / 2 + p.archH);
  }, [style, Rshaft, p.pitchDia, p.holeDia, p.innerDia, p.archH]);

  const pad = Rmax * 0.35;
  const box = Rmax * 2 + pad * 2;
  const cx = box / 2;
  const cy = box / 2;

  const N = Math.max(1, Math.floor(p.count));
  const offset = (p.offsetDeg * Math.PI) / 180;

  return (
    <div className="mx-auto max-w-[720px]">
      <svg viewBox={`0 0 ${box} ${box}`} className="h-auto w-full">
        {/* 转轴外圆 */}
        <circle
          cx={cx}
          cy={cy}
          r={Rshaft}
          fill="hsl(var(--card))"
          stroke={hot === "shaftDia" ? "#dc2626" : "hsl(var(--foreground))"}
          strokeWidth={hot === "shaftDia" ? 1.6 : 0.9}
        />
        {/* 中心轴线 */}
        <line x1={pad / 2} y1={cy} x2={box - pad / 2} y2={cy} stroke="hsl(var(--muted-foreground))" strokeWidth={0.4} strokeDasharray="4 2 1 2" />
        <line x1={cx} y1={pad / 2} x2={cx} y2={box - pad / 2} stroke="hsl(var(--muted-foreground))" strokeWidth={0.4} strokeDasharray="4 2 1 2" />

        {/* 中心轴心 */}
        <circle cx={cx} cy={cy} r={Math.max(4, Rmax * 0.08)} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth={0.6} />

        {style === "circle" && (
          <CircleHoles cx={cx} cy={cy} Rp={p.pitchDia / 2} d={p.holeDia} N={N} offset={offset} hot={hot} />
        )}
        {style === "ring" && (
          <RingArcs cx={cx} cy={cy} Ri={p.innerDia / 2} h={p.archH} toothDeg={p.toothW} N={N} offset={offset} hot={hot} />
        )}

        {/* 标号 */}
        {style === "circle" ? (
          <CircleLabels cx={cx} cy={cy} Rp={p.pitchDia / 2} d={p.holeDia} offset={offset} Rmax={Rmax} pad={pad} box={box} hot={hot} />
        ) : (
          <RingLabels cx={cx} cy={cy} Ri={p.innerDia / 2} h={p.archH} toothDeg={p.toothW} offset={offset} Rmax={Rmax} pad={pad} box={box} hot={hot} />
        )}
      </svg>
    </div>
  );
}

function CircleHoles({ cx, cy, Rp, d, N, offset, hot }: { cx: number; cy: number; Rp: number; d: number; N: number; offset: number; hot: DimKey | null }) {
  const r = d / 2;
  const items = [];
  // pitch circle dashed
  items.push(
    <circle key="pc" cx={cx} cy={cy} r={Rp} fill="none" stroke={hot === "pitchDia" ? "#dc2626" : "hsl(var(--muted-foreground))"} strokeWidth={hot === "pitchDia" ? 1.2 : 0.5} strokeDasharray="4 2 1 2" />
  );
  for (let i = 0; i < N; i++) {
    const a = offset + (i * 2 * Math.PI) / N - Math.PI / 2;
    const x = cx + Rp * Math.cos(a);
    const y = cy + Rp * Math.sin(a);
    items.push(
      <circle key={i} cx={x} cy={y} r={r} fill="hsl(var(--background))" stroke={hot === "holeDia" || hot === "count" ? "#dc2626" : "hsl(var(--foreground))"} strokeWidth={hot === "holeDia" || hot === "count" ? 1.3 : 0.8} />
    );
  }
  return <>{items}</>;
}

function RingArcs({ cx, cy, Ri, h, toothDeg, N, offset, hot }: { cx: number; cy: number; Ri: number; h: number; toothDeg: number; N: number; offset: number; hot: DimKey | null }) {
  const Ro = Ri + h;
  const segDeg = 360 / N;
  const archDeg = Math.max(0.5, segDeg - toothDeg);
  const stroke = (k: DimKey[]) => (k.some((x) => x === hot) ? "#dc2626" : "hsl(var(--foreground))");
  const sw = (k: DimKey[]) => (k.some((x) => x === hot) ? 1.3 : 0.8);

  const polar = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const items = [];
  // inner circle dashed
  items.push(
    <circle key="ic" cx={cx} cy={cy} r={Ri} fill="none" stroke={hot === "innerDia" ? "#dc2626" : "hsl(var(--muted-foreground))"} strokeWidth={hot === "innerDia" ? 1.2 : 0.5} strokeDasharray="4 2 1 2" />
  );

  for (let i = 0; i < N; i++) {
    const startDeg = (offset * 180) / Math.PI + i * segDeg + toothDeg / 2;
    const endDeg = startDeg + archDeg;
    const [x1, y1] = polar(Ri, startDeg);
    const [x2, y2] = polar(Ri, endDeg);
    const [x3, y3] = polar(Ro, endDeg);
    const [x4, y4] = polar(Ro, startDeg);
    const large = archDeg > 180 ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${Ri} ${Ri} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${Ro} ${Ro} 0 ${large} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
    items.push(
      <path
        key={i}
        d={d}
        fill="hsl(var(--background))"
        stroke={stroke(["archH", "count", "toothW"])}
        strokeWidth={sw(["archH", "count", "toothW"])}
      />
    );
  }
  return <>{items}</>;
}

function DimLabel({ x, y, text, hot }: { x: number; y: number; text: string; hot: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-8} y={-7} width={16} height={14} rx={2} fill={hot ? "#facc15" : "hsl(var(--background))"} stroke="hsl(var(--foreground))" strokeWidth={0.4} />
      <text x={0} y={3.5} textAnchor="middle" fontSize={9} fontWeight={600}>{text}</text>
    </g>
  );
}

function CircleLabels({ cx, cy, Rp, d, offset, Rmax, pad, box, hot }: { cx: number; cy: number; Rp: number; d: number; offset: number; Rmax: number; pad: number; box: number; hot: DimKey | null }) {
  const r = d / 2;
  // top hole position for ①
  const topA = offset - Math.PI / 2;
  const tx = cx + Rp * Math.cos(topA);
  const ty = cy + Rp * Math.sin(topA);
  // ② pitch circle radius line
  const angle2 = Math.PI / 4;
  const px = cx + Rp * Math.cos(angle2);
  const py = cy + Rp * Math.sin(angle2);
  return (
    <>
      {/* ① diameter arrow on top hole */}
      <line x1={tx - r} y1={ty} x2={tx + r} y2={ty} stroke={hot === "holeDia" ? "#dc2626" : "hsl(var(--foreground))"} strokeWidth={0.7} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <DimLabel x={tx} y={ty - r - 10} text="①" hot={hot === "holeDia"} />
      {/* ② radius arc */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={hot === "pitchDia" ? "#dc2626" : "hsl(var(--muted-foreground))"} strokeWidth={0.5} strokeDasharray="3 2" />
      <DimLabel x={(cx + px) / 2 + 12} y={(cy + py) / 2 - 4} text="②" hot={hot === "pitchDia"} />
      {/* ③ offset angle arc near top */}
      <path d={describeArc(cx, cy, Rp * 0.5, -90, -90 + (offset * 180) / Math.PI || 30)} fill="none" stroke={hot === "offsetDeg" ? "#dc2626" : "hsl(var(--muted-foreground))"} strokeWidth={0.6} />
      <DimLabel x={cx + Rp * 0.6 * Math.cos(-Math.PI / 4)} y={cy + Rp * 0.6 * Math.sin(-Math.PI / 4)} text="③" hot={hot === "offsetDeg"} />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--foreground))" />
        </marker>
      </defs>
      {/* count indicator (highlight ring of holes already done; show "N=" label) */}
      {hot === "count" && (
        <text x={cx} y={box - pad / 2 - 6} textAnchor="middle" fontSize={10} fill="#dc2626" fontWeight={700}>
          通风孔数目 N = {/* purposely empty, count owned by parent */}
        </text>
      )}
    </>
  );
}

function RingLabels({ cx, cy, Ri, h, toothDeg, offset, Rmax, pad, box, hot }: { cx: number; cy: number; Ri: number; h: number; toothDeg: number; offset: number; Rmax: number; pad: number; box: number; hot: DimKey | null }) {
  const Ro = Ri + h;
  // ① inner circle diameter — horizontal across center bottom
  const yBot = cy + Ro + 16;
  return (
    <>
      <line x1={cx - Ri} y1={yBot} x2={cx + Ri} y2={yBot} stroke={hot === "innerDia" ? "#dc2626" : "hsl(var(--foreground))"} strokeWidth={0.7} markerStart="url(#arr2)" markerEnd="url(#arr2)" />
      <DimLabel x={cx} y={yBot + 10} text="①" hot={hot === "innerDia"} />
      {/* ② radial height */}
      <line x1={cx - Ri - 8} y1={cy} x2={cx - Ro - 8} y2={cy} stroke={hot === "archH" ? "#dc2626" : "hsl(var(--foreground))"} strokeWidth={0.7} markerStart="url(#arr2)" markerEnd="url(#arr2)" />
      <DimLabel x={cx - Ro - 16} y={cy} text="②" hot={hot === "archH"} />
      {/* ③ offset angle */}
      <path d={describeArc(cx, cy, Ri * 0.6, -90, -90 + ((offset * 180) / Math.PI || 30))} fill="none" stroke={hot === "offsetDeg" ? "#dc2626" : "hsl(var(--muted-foreground))"} strokeWidth={0.6} />
      <DimLabel x={cx + Ri * 0.7 * Math.cos(-Math.PI / 4)} y={cy + Ri * 0.7 * Math.sin(-Math.PI / 4)} text="③" hot={hot === "offsetDeg"} />
      {/* ④ tooth width arc near top */}
      <path d={describeArc(cx, cy, Ro + 10, -toothDeg / 2 - 90, toothDeg / 2 - 90)} fill="none" stroke={hot === "toothW" ? "#dc2626" : "hsl(var(--foreground))"} strokeWidth={0.8} />
      <DimLabel x={cx} y={cy - Ro - 18} text="④" hot={hot === "toothW"} />
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--foreground))" />
        </marker>
      </defs>
    </>
  );
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const polar = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [sx, sy] = polar(startDeg);
  const [ex, ey] = polar(endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`;
}

function Legend({ style, hot, onHover }: { style: VentStyle; hot: DimKey | null; onHover: (k: DimKey | null) => void }) {
  const items: { k: DimKey; mark: string; label: string }[] =
    style === "circle"
      ? [
          { k: "holeDia", mark: "①", label: "通风孔直径" },
          { k: "pitchDia", mark: "②", label: "通风孔位置直径" },
          { k: "offsetDeg", mark: "③", label: "偏移角度" },
        ]
      : [
          { k: "innerDia", mark: "①", label: "通风孔内圆直径" },
          { k: "archH", mark: "②", label: "通风孔高度" },
          { k: "offsetDeg", mark: "③", label: "偏移角度" },
          { k: "toothW", mark: "④", label: "齿宽" },
        ];
  return (
    <div className="mx-auto mt-4 flex max-w-[720px] flex-wrap justify-center gap-3 text-[11px]">
      {items.map((it) => (
        <button
          key={it.k}
          onMouseEnter={() => onHover(it.k)}
          onMouseLeave={() => onHover(null)}
          className={`flex items-center gap-1 rounded border px-2 py-1 transition-colors ${
            hot === it.k ? "border-red-500 bg-yellow-100" : "border-border bg-background"
          }`}
        >
          <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-bold ${hot === it.k ? "bg-yellow-300" : "bg-muted text-muted-foreground"}`}>
            {it.mark}
          </span>
          {it.label}
        </button>
      ))}
    </div>
  );
}
