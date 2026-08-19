import * as React from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* ---------------- shared tiny row primitives (match 属性 table) ---------------- */

function Row({
  label,
  unit,
  result,
  children,
  highlight,
}: {
  label: string;
  unit?: string;
  result?: string;
  children?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1.2fr_1fr_60px_50px] items-center border-b border-sidebar-border px-2 py-1.5 text-[12px] ${
        highlight ? "bg-emerald-100/50" : ""
      }`}
    >
      <div className="truncate" title={label.replace(/　/g, "")}>
        {label}
      </div>
      <div className="pr-1">{children}</div>
      <div className="text-[11px] text-muted-foreground">{unit ?? ""}</div>
      <div className="text-[11px] text-muted-foreground">{result ?? ""}</div>
    </div>
  );
}

function Num({
  v,
  onChange,
  integer,
}: {
  v: number;
  onChange: (n: number) => void;
  integer?: boolean;
}) {
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => {
        let n = Number(e.target.value);
        if (Number.isNaN(n)) n = 0;
        if (integer) n = Math.trunc(n);
        onChange(n);
      }}
      className="h-6 w-full rounded border border-sidebar-border bg-background px-1 text-[12px]"
    />
  );
}

function Text({ v }: { v: string }) {
  return <span className="text-[12px]">{v}</span>;
}

function GroupRow({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-1 border-b border-sidebar-border bg-[var(--table-header)] px-2 py-1.5 text-left text-[12px] font-medium"
    >
      {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {title}
    </button>
  );
}

function Head() {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_60px_50px] border-y border-sidebar-border bg-[var(--table-header)] px-2 py-1 text-[11px] text-muted-foreground">
      <div>名称</div>
      <div>值</div>
      <div>单位</div>
      <div>结果</div>
    </div>
  );
}

/* ---------------- 极槽配合推荐 ---------------- */

export interface SlotCombo {
  slots: number;
  q: string;
  windingType: string;
  note: string;
  recommended?: boolean;
}

export function recommendSlotCombos(
  poles: number,
  innerDia: number,
  branches: number,
): SlotCombo[] {
  const out: SlotCombo[] = [];
  // 齿距参考范围（mm）：按定子内径估算合理槽数区间
  const circumference = Math.PI * Math.max(innerDia, 1);
  for (let q2 = 2; q2 <= 20; q2++) {
    const slots = (poles * 3 * q2) / 2; // q = q2/2，支持分数槽（0.5 步长）
    if (!Number.isInteger(slots)) continue;
    if (slots % (3 * Math.max(branches, 1)) !== 0) continue; // 支路对称性
    const pitch = circumference / slots;
    if (pitch < 8 || pitch > 40) continue; // 齿距合理性
    const q = q2 / 2;
    out.push({
      slots,
      q: Number.isInteger(q) ? String(q) : q.toFixed(1),
      windingType: Number.isInteger(q) ? "整数槽双层叠绕" : "分数槽双层叠绕",
      note: `齿距约 ${pitch.toFixed(1)} mm，${
        Number.isInteger(q) ? "谐波少、工艺成熟" : "齿槽转矩小、绕组系数较高"
      }`,
    });
  }
  out.sort((a, b) => Math.abs(a.slots - 72) - Math.abs(b.slots - 72));
  const top = out.slice(0, 5).sort((a, b) => a.slots - b.slots);
  if (top[0]) top[0].recommended = true;
  return top;
}

function SlotRecommendDialog({
  open,
  onOpenChange,
  poles,
  innerDia,
  branches,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  poles: number;
  innerDia: number;
  branches: number;
  onConfirm: (c: SlotCombo) => void;
}) {
  const combos = React.useMemo(
    () => (open ? recommendSlotCombos(poles, innerDia, branches) : []),
    [open, poles, innerDia, branches],
  );
  const [picked, setPicked] = useState<number | null>(null);

  React.useEffect(() => {
    if (open) setPicked(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">推荐极槽配合</DialogTitle>
          <DialogDescription className="text-[12px]">
            已读取项目参数：极数 {poles} · 定子内径 {innerDia} mm · 并联支路数 {branches}
            。请选择需要的极槽配合，确认后代入项目。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[320px] overflow-auto rounded-md border border-border">
          <div className="grid grid-cols-[70px_60px_1fr] bg-[var(--table-header)] px-2 py-1 text-[11px] text-muted-foreground">
            <div>槽数</div>
            <div>每极每相槽数 q</div>
            <div>说明</div>
          </div>
          {combos.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              未找到合适的极槽配合，请检查极数与定子内径
            </div>
          )}
          {combos.map((c) => {
            const active = picked === c.slots;
            return (
              <button
                key={c.slots}
                type="button"
                onClick={() => setPicked(c.slots)}
                className={`grid w-full grid-cols-[70px_60px_1fr] items-center gap-1 border-t border-border px-2 py-2 text-left text-[12px] transition-colors ${
                  active ? "bg-primary/10" : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-1 font-medium">
                  {active ? <Check className="h-3 w-3 text-primary" /> : <span className="w-3" />}
                  {c.slots}
                </div>
                <div>{c.q}</div>
                <div className="text-muted-foreground">
                  {c.windingType}；{c.note}
                  {c.recommended && (
                    <span className="ml-1 rounded bg-primary/15 px-1 text-[10px] text-primary">
                      推荐
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-[4px] border border-input px-3 text-[12px]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              const c = combos.find((x) => x.slots === picked);
              if (!c) {
                toast.error("请先选择一个极槽配合");
                return;
              }
              onConfirm(c);
              onOpenChange(false);
              toast.success(`已代入项目：槽数 ${c.slots}`);
            }}
            className="h-8 rounded-[4px] bg-primary px-3 text-[12px] font-medium text-primary-foreground"
          >
            确认代入
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- 定子 - 绕组 ---------------- */

export function StatorWindingPanel({
  poles = 6,
  statorInnerDia = 520,
}: {
  poles?: number;
  statorInnerDia?: number;
}) {
  const [slots, setSlots] = useState(72);
  const [branches] = useState(1);
  const [maxFill, setMaxFill] = useState(0.75);
  const [skew, setSkew] = useState(0);
  const [parallelTooth, setParallelTooth] = useState(false);
  const [openRec, setOpenRec] = useState(false);

  const [insOpen, setInsOpen] = useState(true);
  const [wireOpen, setWireOpen] = useState(true);
  const [ins, setIns] = useState({
    slotIns: 0.5,
    wedge: 2.5,
    wedgeBottom: 0,
    layer: 0.3,
    slotBottom: 1,
    coil: 0,
    turnToTurn: 0.1,
    magneticWedge: false,
  });

  return (
    <>
      <Head />
      <Row label="绕组结构">
        <Text v="绕线式" />
      </Row>
      <Row label="槽数" result={String(slots)}>
        <Num v={slots} integer onChange={setSlots} />
      </Row>
      <div className="border-b border-sidebar-border px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpenRec(true)}
          className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-primary/40 bg-primary/10 px-2 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Sparkles className="h-3 w-3" />
          推荐极槽配合
        </button>
      </div>
      <Row label="平行齿">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={parallelTooth}
            onChange={(e) => setParallelTooth(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          {parallelTooth ? "是" : "否"}
        </label>
      </Row>
      <Row label="斜槽" result={String(skew)}>
        <Num v={skew} onChange={setSkew} />
      </Row>
      <Row label="最大槽满率">
        <Num v={maxFill} onChange={setMaxFill} />
      </Row>

      <GroupRow title="线规" open={wireOpen} onToggle={() => setWireOpen((v) => !v)} />
      {wireOpen && (
        <>
          <Row label="　绕组线型">
            <Text v="扁线" />
          </Row>
          <Row label="　绕组排布方式">
            <Text v="单根单排" />
          </Row>
          <Row label="　并联支路数" result={String(branches)}>
            <Text v={String(branches)} />
          </Row>
          <Row label="　包含第二线规">
            <Text v="否" />
          </Row>
        </>
      )}

      <GroupRow title="绝缘" open={insOpen} onToggle={() => setInsOpen((v) => !v)} />
      {insOpen && (
        <>
          <Row label="　槽绝缘厚度" unit="毫米" result={String(ins.slotIns)}>
            <Num v={ins.slotIns} onChange={(v) => setIns((p) => ({ ...p, slotIns: v }))} />
          </Row>
          <Row label="　槽楔厚度" unit="毫米" result={String(ins.wedge)}>
            <Num v={ins.wedge} onChange={(v) => setIns((p) => ({ ...p, wedge: v }))} />
          </Row>
          <Row label="　槽楔底绝缘" unit="毫米" result={String(ins.wedgeBottom)}>
            <Num v={ins.wedgeBottom} onChange={(v) => setIns((p) => ({ ...p, wedgeBottom: v }))} />
          </Row>
          <Row label="　层间绝缘厚度" unit="毫米" result={String(ins.layer)}>
            <Num v={ins.layer} onChange={(v) => setIns((p) => ({ ...p, layer: v }))} />
          </Row>
          <Row label="　槽底绝缘" unit="毫米" result={String(ins.slotBottom)}>
            <Num v={ins.slotBottom} onChange={(v) => setIns((p) => ({ ...p, slotBottom: v }))} />
          </Row>
          <Row label="　线圈绝缘" unit="毫米" result={String(ins.coil)}>
            <Num v={ins.coil} onChange={(v) => setIns((p) => ({ ...p, coil: v }))} />
          </Row>
          <Row label="　匝间绝缘厚度" unit="毫米" result={String(ins.turnToTurn)} highlight>
            <Num v={ins.turnToTurn} onChange={(v) => setIns((p) => ({ ...p, turnToTurn: v }))} />
          </Row>
          <Row label="　是否磁性槽楔">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={ins.magneticWedge}
                onChange={(e) => setIns((p) => ({ ...p, magneticWedge: e.target.checked }))}
                className="accent-[var(--primary)]"
              />
              {ins.magneticWedge ? "是" : "否"}
            </label>
          </Row>
        </>
      )}

      <SlotRecommendDialog
        open={openRec}
        onOpenChange={setOpenRec}
        poles={poles}
        innerDia={statorInnerDia}
        branches={branches}
        onConfirm={(c) => setSlots(c.slots)}
      />
    </>
  );
}

/* ---------------- 转子 - 励磁绕组 ---------------- */

const plateMaterials = ["不锈钢Q355B", "不锈钢304", "不锈钢316L", "铝合金6061", "环氧板"];

export function FieldWindingPanel() {
  const [s, setS] = useState({
    shoeIns: 2,
    bodyIns: 2,
    poleGap: 0,
    plateThickness: 0,
    plateMaterial: "不锈钢Q355B",
    coilIns: 0,
    turnIns: 0,
    branches: 1,
    turnsPerPole: 180,
    s1: 0,
    s2: 20,
    maxW: 45,
    maxH: 100,
    halfTurnLen: 0,
  });
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  return (
    <>
      <Head />
      <Row label="导线材料">
        <Text v="紫铜" />
      </Row>
      <Row label="极靴绝缘" unit="毫米" result={String(s.shoeIns)}>
        <Num v={s.shoeIns} onChange={(v) => set("shoeIns", v)} />
      </Row>
      <Row label="极身绝缘" unit="毫米" result={String(s.bodyIns)}>
        <Num v={s.bodyIns} onChange={(v) => set("bodyIns", v)} />
      </Row>
      <Row label="两磁极绕组之间的间隙" unit="毫米" result={String(s.poleGap)}>
        <Num v={s.poleGap} onChange={(v) => set("poleGap", v)} />
      </Row>
      <Row label="磁极压板厚度" unit="毫米" result={String(s.plateThickness)} highlight>
        <Num v={s.plateThickness} onChange={(v) => set("plateThickness", v)} />
      </Row>
      <Row label="磁极压板材料" highlight>
        <select
          value={s.plateMaterial}
          onChange={(e) => set("plateMaterial", e.target.value)}
          className="h-6 w-full rounded border border-sidebar-border bg-background px-1 text-[12px]"
        >
          {plateMaterials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Row>
      <Row label="绕组绝缘厚" unit="毫米" result={String(s.coilIns)}>
        <Num v={s.coilIns} onChange={(v) => set("coilIns", v)} />
      </Row>
      <Row label="绕组匝间绝缘" unit="毫米" result={String(s.turnIns)}>
        <Num v={s.turnIns} onChange={(v) => set("turnIns", v)} />
      </Row>
      <Row label="绕组端部类型">
        <Text v="圆头线圈" />
      </Row>
      <Row label="绕线模式">
        <Text v="矩形线平绕磁极绕组" />
      </Row>
      <Row label="并联支路数" result={String(s.branches)}>
        <Num v={s.branches} integer onChange={(v) => set("branches", v)} />
      </Row>
      <Row label="每极匝数" result={String(s.turnsPerPole)}>
        <Num v={s.turnsPerPole} integer onChange={(v) => set("turnsPerPole", v)} />
      </Row>
      <Row label="间隙s1" unit="毫米" result={String(s.s1)}>
        <Num v={s.s1} onChange={(v) => set("s1", v)} />
      </Row>
      <Row label="间隙s2" unit="毫米" result={String(s.s2)}>
        <Num v={s.s2} onChange={(v) => set("s2", v)} />
      </Row>
      <Row label="最大宽度" unit="毫米" result={String(s.maxW)}>
        <Num v={s.maxW} onChange={(v) => set("maxW", v)} />
      </Row>
      <Row label="最大高度" unit="毫米" result={String(s.maxH)}>
        <Num v={s.maxH} onChange={(v) => set("maxH", v)} />
      </Row>
      <Row label="平均半匝长度" unit="毫米" result={String(s.halfTurnLen)}>
        <Num v={s.halfTurnLen} onChange={(v) => set("halfTurnLen", v)} />
      </Row>
      <Row label="包含第二线规">
        <Text v="否" />
      </Row>
    </>
  );
}
