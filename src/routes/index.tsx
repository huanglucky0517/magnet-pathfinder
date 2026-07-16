import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  MoreHorizontal,
  Search,
  MessageSquare,
  ListChecks,
  Copy,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Settings2,
  Sparkles,
  Pencil,
  Check,
  X,
  ChevronsRight,
  GripVertical,
  Bot,
  Brain,
  Globe,
  Loader2,
  Mic,
  ArrowUp,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { magneticParamGroups } from "./magnetic-params";
import {
  femCurrentSourceParams,
  femVoltageSourceParams,
  type FemParam,
} from "./fem-params";
import { type DimKey } from "./shaft-vent";
import ventCircleAsset from "@/assets/vent-circle.png.asset.json";
import ventRingAsset from "@/assets/vent-ring.png.asset.json";
import multifieldAnalysisAsset from "@/assets/multifield-analysis.png.asset.json";
import multifieldLibraryAsset from "@/assets/multifield-library.png.asset.json";
import easimotorLogoAsset from "@/assets/easimotor-logo.png.asset.json";

import aiChatBadgeAsset from "@/assets/aichat-widget-v3.png.asset.json";
import { MotorInput } from "@/components/motor/motor-input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasiMotor Online — 优化设计" },
      { name: "description", content: "多场耦合自动分析 · 新设计(优化分析)工况与优化目标配置" },
    ],
  }),
  component: Index,
});

type WorkType = "magnetic" | "fem";
type FemSource = "current" | "voltage" | "emforce";

interface TargetRow {
  v: string;
  p: string;
  expr: string;
  c: string;
  dir: string;
  /** 电磁力幅值 pr(order, freq) 的可编辑参数 */
  isPr?: boolean;
  prOrder?: number;
  prFreq?: number;
  /** 通过"添加"按钮新建的空白可编辑行 */
  editable?: boolean;
}

interface Workload {
  id: string;
  name: string;
  type: WorkType;
  femSource?: FemSource;
  power?: string;
  freq?: string;
  speed?: string;
  current?: string;
  powerAngle?: string;
  voltage?: string;
  freqV?: string;
  emForceAmp?: string;
  airgapRadius?: string;
  targets: TargetRow[];
}

const variables = [
  { name: "ls(铁芯长度)", def: 120, lo: 100, hi: 126, prec: 1 },
  { name: "b0(b0)", def: 5, lo: 3, hi: 5.5, prec: 0.01 },
  { name: "airgapT(气隙)", def: 0.7, lo: 0.6, hi: 1, prec: 0.01 },
  { name: "magH(磁钢厚度)", def: 4.5, lo: 4, hi: 5, prec: 0.01 },
  { name: "magW(磁钢宽度)", def: 13, lo: 12, hi: 15, prec: 0.01 },
  { name: "spanAngle(磁钢张角)", def: 100, lo: 80, hi: 110, prec: 1 },
];

const magneticDefaultTargets: TargetRow[] = [
  { v: "线电压", p: "o_UL_1", expr: "UL", c: ">=0", dir: "接近于45" },
  { v: "效率", p: "o_Kef_1", expr: "Kef", c: ">=0", dir: "最大" },
  { v: "电机线电流有效值", p: "o_I_line_1", expr: "I_line", c: ">=0", dir: "无" },
  { v: "电机热负荷", p: "o_TLs_1", expr: "TLs", c: "<90e9", dir: "无" },
];

const initialWorkloads: Workload[] = [
  {
    id: "w1",
    name: "磁路法-场路耦合优化",
    type: "magnetic",
    power: "4.5",
    freq: "200",
    targets: magneticDefaultTargets,
  },
  {
    id: "w2",
    name: "空载工况",
    type: "fem",
    femSource: "current",
    speed: "3000",
    current: "0",
    powerAngle: "0",
    targets: [
      { v: "转矩波动峰峰值", p: "o_TrqP2P_1", expr: "TrqP2P", c: ">=0", dir: "最小" },
    ],
  },
  {
    id: "w3",
    name: "负载工况",
    type: "fem",
    femSource: "current",
    speed: "3000",
    current: "10",
    powerAngle: "30",
    targets: [],
  },
];

function Index() {
  const [workloads, setWorkloads] = useState<Workload[]>(initialWorkloads);
  const [activeId, setActiveId] = useState("w2");
  const active = workloads.find((w) => w.id === activeId)!;
  const [search, setSearch] = useState("");
  const [magOpen, setMagOpen] = useState(true);
  const [femOpen, setFemOpen] = useState(true);

  const updateActive = (patch: Partial<Workload>) =>
    setWorkloads((ws) => ws.map((w) => (w.id === activeId ? { ...w, ...patch } : w)));

  const addWorkload = (type: WorkType) => {
    const id = `w${Date.now()}`;
    const baseName = type === "magnetic" ? "磁路法-新工况" : "有限元-新工况";
    const existing = new Set(workloads.map((w) => w.name));
    let name = baseName;
    let n = 1;
    while (existing.has(name)) name = `${baseName}${n++}`;
    const base: Workload =
      type === "magnetic"
        ? { id, name, type, power: "4.5", freq: "200", targets: [] }
        : {
            id,
            name,
            type,
            femSource: "current",
            speed: "3000",
            current: "0",
            powerAngle: "0",
            targets: [],
          };

    // prepend within its category by inserting before other items of that type
    setWorkloads((ws) => {
      const firstIdx = ws.findIndex((w) => w.type === type);
      if (firstIdx === -1) return [...ws, base];
      const next = [...ws];
      next.splice(firstIdx, 0, base);
      return next;
    });
    if (type === "magnetic") setMagOpen(true);
    else setFemOpen(true);
    setActiveId(id);
  };


  const renameWorkload = (id: string, name: string) =>
    setWorkloads((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)));

  const deleteWorkload = (id: string) => {
    setWorkloads((ws) => {
      const next = ws.filter((w) => w.id !== id);
      if (id === activeId && next.length) setActiveId(next[0].id);
      return next;
    });
  };

  const addTarget = (it: { desc: string; itemid: string; kind?: "pr" }) => {
    if (it.kind === "pr") {
      // pr 由专用配置器调用 addPrTarget，避免歧义
      return;
    }
    if (active.targets.some((t) => t.expr === it.itemid)) return;
    const row: TargetRow = {
      v: it.desc,
      p: `o_${it.itemid}_1`,
      expr: it.itemid,
      c: ">=0",
      dir: "无",
    };
    updateActive({ targets: [...active.targets, row] });
  };

  const addPrTarget = (order: number, freq: number) => {
    const expr = `pr(${order},${freq})`;
    // 同 (order,freq) 已存在则忽略
    if (active.targets.some((t) => t.isPr && t.prOrder === order && t.prFreq === freq)) return;
    // 生成唯一参数名
    let n = 1;
    const used = new Set(active.targets.map((t) => t.p));
    while (used.has(`o_pr_${n}`)) n++;
    const row: TargetRow = {
      v: "电磁力幅值",
      p: `o_pr_${n}`,
      expr,
      c: ">=0",
      dir: "无",
      isPr: true,
      prOrder: order,
      prFreq: freq,
    };
    updateActive({ targets: [...active.targets, row] });
  };

  const updatePrTarget = (p: string, order: number, freq: number) => {
    updateActive({
      targets: active.targets.map((t) =>
        t.p === p && t.isPr ? { ...t, prOrder: order, prFreq: freq, expr: `pr(${order},${freq})` } : t,
      ),
    });
  };

  const removeTarget = (rowKey: string) =>
    updateActive({ targets: active.targets.filter((t) => t.p !== rowKey) });

  const addBlankTarget = () => {
    let n = 1;
    const used = new Set(active.targets.map((t) => t.p));
    while (used.has(`o_new_${n}`)) n++;
    const row: TargetRow = {
      v: "",
      p: `o_new_${n}`,
      expr: "",
      c: "",
      dir: "最小",
      editable: true,
    };
    updateActive({ targets: [...active.targets, row] });
  };

  const updateTargetCell = (rowKey: string, field: keyof TargetRow, value: string) => {
    updateActive({
      targets: active.targets.map((t) =>
        t.p === rowKey ? { ...t, [field]: value } : t,
      ),
    });
  };

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"solver" | "surrogate">("solver");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelDialog, setModelDialog] = useState<null | "solver" | "surrogate">(null);
  const [solverConfig, setSolverConfig] = useState({
    algo: "NSGA-II",
    sampling: "随机采样",
    generations: "20",
    population: "20",
  });
  const [surrogateConfig, setSurrogateConfig] = useState({
    algo: "NSGA-II",
    sampling: "随机采样",
    generations: "20",
    population: "20",
    mode: "指定FEA间隔",
    interval: "5",
    modelAlgo: "随机森林算法",
  });
  const [overallTargets, setOverallTargets] = useState<
    { v: string; p: string; expr: string; c: string; dir: string }[]
  >([
    { v: "目标参数_1", p: "overall_target_1", expr: "", c: "", dir: "无" },
    { v: "目标参数_2", p: "overall_target_2", expr: "", c: "", dir: "无" },
    { v: "目标参数_3", p: "overall_target_3", expr: "", c: "", dir: "无" },
  ]);
  const addOverallTarget = () => {
    const n = overallTargets.length + 1;
    setOverallTargets((prev) => [
      ...prev,
      { v: `目标参数_${n}`, p: `overall_target_${n}`, expr: "", c: "", dir: "无" },
    ]);
  };
  const updateOverallCell = (p: string, key: "v" | "expr" | "c" | "dir", val: string) => {
    setOverallTargets((prev) => prev.map((t) => (t.p === p ? { ...t, [key]: val } : t)));
  };
  const removeOverallTarget = (p: string) => {
    setOverallTargets((prev) => prev.filter((t) => t.p !== p));
  };
  const runStartDesign = () => {
    const badR = workloads.find(
      (w) =>
        w.type === "fem" &&
        w.femSource === "emforce" &&
        !(parseFloat(w.airgapRadius ?? "0") > 0),
    );
    if (badR) {
      toast.error(`工况"${badR.name}"的气隙半径必须大于 0，请修改后再开始计算`);
      return;
    }
    setCalcStatus("running");
    toast.success("开始优化设计计算");
    setTimeout(() => setCalcStatus("done"), 4000);
  };

  const magnetic = workloads.filter((w) => w.type === "magnetic");
  const fem = workloads.filter((w) => w.type === "fem");

  const [selectedNode, setSelectedNode] = useState<string>("新设计(优化分析)");
  const [shaft, setShaft] = useState<ShaftState>(defaultShaftState);
  const [diagramHot, setDiagramHot] = useState<DimKey | null>(null);
  const showDiagram = diagramHot !== null;
  const [calcStatus, setCalcStatus] = useState<"idle" | "running" | "done">("idle");
  const [chatOpen, setChatOpen] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    didDrag: boolean;
    ox: number;
    oy: number;
  }>({ dragging: false, didDrag: false, ox: 0, oy: 0 });

  const ventAsset = shaft.ventShape === "circle" ? ventCircleAsset : ventRingAsset;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging || !btnRef.current) return;
      const parent = btnRef.current.offsetParent as HTMLElement | null;
      if (!parent) return;
      const pRect = parent.getBoundingClientRect();
      const btnW = btnRef.current.offsetWidth;
      const btnH = btnRef.current.offsetHeight;
      let nx = e.clientX - pRect.left - dragRef.current.ox;
      let ny = e.clientY - pRect.top - dragRef.current.oy;
      nx = Math.max(0, Math.min(nx, pRect.width - btnW));
      ny = Math.max(0, Math.min(ny, pRect.height - btnH));
      setBtnPos({ x: nx, y: ny });
      dragRef.current.didDrag = true;
    };
    const onUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground text-[13px]">
      <TopBar />
      <Toolbar />
      <div className="relative flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize="320px" minSize="260px" maxSize="600px">
            <LeftPane
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              shaft={shaft}
              setShaft={setShaft}
              onFocusVentParam={setDiagramHot}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize="400px">

            <main className="flex h-full flex-col overflow-hidden border-l border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {showDiagram ? "尺寸示意图" : selectedNode === "结果" ? "优化设计 » 结果" : "优化设计"}
                  </span>
                </div>
                {showDiagram && (
                  <button
                    onClick={() => setDiagramHot(null)}
                    className="rounded border border-border px-2 py-0.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    返回 优化设计
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {showDiagram ? (
                  <div className="flex h-full items-center justify-center bg-white p-6">
                    <img
                      src={ventAsset.url}
                      alt={shaft.ventShape === "circle" ? "圆孔通风尺寸示意图" : "环形通风尺寸示意图"}
                      className="max-h-full max-w-[720px] object-contain"
                    />
                  </div>
                ) : selectedNode === "结果" ? (
                  <OptimizationResults />
                ) : (
                <>
                {/* Section 1: 变量 */}
                <Section step="1" title="变量" subtitle="选择需要优化的参数" action={
                  <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" />
                    添加
                  </button>
                }>
                  <Table
                    head={["参数名称", "默认值", "下限", "上限", "精度", "同步", ""]}
                    widths={["minmax(220px,1.6fr)", "1fr", "1fr", "1fr", "1fr", "1fr", "40px"]}
                  >
                    {variables.map((v) => (
                      <Row key={v.name}>
                        <SelectCell value={v.name} />
                        <Cell>{v.def}</Cell>
                        <Cell>{v.lo}</Cell>
                        <Cell>{v.hi}</Cell>
                        <Cell>{v.prec}</Cell>
                        <SelectCell value="无" />
                        <DeleteCell />
                      </Row>
                    ))}
                  </Table>
                </Section>


            {/* Section 2: 工况与优化目标 */}
            <Section step="2" title="工况与优化目标">
              <div className="grid grid-cols-[260px_1fr] gap-4">
                {/* Workload list */}
                <div className="rounded-md border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="font-medium">工况（{workloads.length}）</span>
                  </div>
                  <div className="space-y-3 p-2">
                    <Category
                      label="磁路法工况"
                      color="primary"
                      count={magnetic.length}
                      open={magOpen}
                      onOpenChange={setMagOpen}
                      onAdd={() => addWorkload("magnetic")}
                    >
                      {magnetic.map((w) => (
                        <WorkloadItem
                          key={w.id}
                          w={w}
                          active={w.id === activeId}
                          onClick={() => setActiveId(w.id)}
                          onRename={(n) => renameWorkload(w.id, n)}
                          onDelete={() => deleteWorkload(w.id)}
                        />
                      ))}
                      {magnetic.length === 0 && <Empty>暂无磁路法工况</Empty>}
                    </Category>
                    <Category
                      label="有限元工况"
                      color="fem"
                      count={fem.length}
                      open={femOpen}
                      onOpenChange={setFemOpen}
                      onAdd={() => addWorkload("fem")}
                    >
                      {fem.map((w) => (
                        <WorkloadItem
                          key={w.id}
                          w={w}
                          active={w.id === activeId}
                          onClick={() => setActiveId(w.id)}
                          onRename={(n) => renameWorkload(w.id, n)}
                          onDelete={() => deleteWorkload(w.id)}
                        />
                      ))}
                      {fem.length === 0 && <Empty>暂无有限元工况</Empty>}
                    </Category>

                  </div>
                </div>

                {/* Right details */}
                <div className="space-y-4">
                  {/* 工况参数 */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13px] font-medium">工况参数</span>
                      {active.type === "fem" && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="text-muted-foreground">工况类型</span>
                          <select
                            value={active.femSource ?? "current"}
                            onChange={(e) =>
                              updateActive({ femSource: e.target.value as FemSource })
                            }
                            className="rounded border border-input bg-background px-2 py-1 text-[12px] focus:border-primary focus:outline-none"
                          >
                            <option value="current">电流源试验</option>
                            <option value="voltage">电压源试验</option>
                            <option value="emforce">电磁力</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {active.type === "magnetic" ? (
                      <Table head={["功率(kW)", "频率(Hz)"]} widths={["1fr", "1fr"]}>
                        <Row>
                          <Cell>{active.power}</Cell>
                          <Cell>{active.freq}</Cell>
                        </Row>
                      </Table>
                    ) : active.femSource === "voltage" ? (
                      <Table head={["转速(rpm)", "线电压(V)", "频率(Hz)"]} widths={["1fr", "1fr", "1fr"]}>
                        <Row>
                          <Cell>{active.speed ?? "3000"}</Cell>
                          <Cell>{active.voltage ?? "380"}</Cell>
                          <Cell>{active.freqV ?? "50"}</Cell>
                        </Row>
                      </Table>
                    ) : active.femSource === "emforce" ? (
                      <Table
                        head={["转速(rpm)", "电流(A)", "电流角(度)", "气隙半径(mm)"]}
                        widths={["1fr", "1fr", "1fr", "1fr"]}
                      >
                        <Row>
                          <Cell>{active.speed ?? "3000"}</Cell>
                          <Cell>{active.current ?? "0"}</Cell>
                          <Cell>{active.powerAngle ?? "0"}</Cell>
                          <div className="border-r border-border last:border-r-0">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={active.airgapRadius ?? "0"}
                              onChange={(e) => updateActive({ airgapRadius: e.target.value })}
                              className="w-full border-0 bg-transparent px-3 py-2 text-[12px] focus:outline-none"
                            />
                          </div>
                        </Row>
                      </Table>
                    ) : (
                      <Table head={["转速(rpm)", "电流(A)", "电流角(度)"]} widths={["1fr", "1fr", "1fr"]}>
                        <Row>
                          <Cell>{active.speed ?? "3000"}</Cell>
                          <Cell>{active.current ?? "0"}</Cell>
                          <Cell>{active.powerAngle ?? "0"}</Cell>
                        </Row>
                      </Table>
                    )}
                  </div>

                  {/* 工况优化目标 */}
                  <div>
                    <div className="mb-2 text-[13px] font-medium">工况优化目标</div>
                    <div className="grid grid-cols-[300px_1fr] gap-3">
                      <div className="rounded-md border border-border bg-card">
                        <div className="border-b border-border px-3 py-2 font-medium">可用目标参数</div>
                        <div className="p-2">
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="搜索..."
                              className="w-full rounded border border-input bg-background py-1.5 pl-7 pr-2 text-[12px] focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
                            {active.type === "magnetic" ? (
                              <GroupedParams
                                search={search}
                                selected={active.targets.map((t) => t.expr)}
                                onAdd={addTarget}
                              />
                            ) : (
                              <FemParamList
                                params={
                                  active.femSource === "voltage"
                                    ? femVoltageSourceParams
                                    : femCurrentSourceParams
                                }
                                search={search}
                                selected={active.targets.map((t) => t.expr)}
                                onAdd={addTarget}
                                onAddPr={addPrTarget}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="font-medium">目标参数列表（{active.targets.length}）</span>
                          <AddRowButton
                            menuOpen={addMenuOpen}
                            onToggleMenu={() => setAddMenuOpen((v) => !v)}
                            onCloseMenu={() => setAddMenuOpen(false)}
                            onAddRow={() => {
                              addBlankTarget();
                              setAddMenuOpen(false);
                            }}
                            onPickPr={() => {
                              setAddMenuOpen(false);
                              setPrDialogOpen(true);
                            }}
                          />
                        </div>
                        {active.targets.length === 0 ? (
                          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                            从左侧"可用目标参数"点击{" "}
                            <ChevronsRight className="inline h-3.5 w-3.5 align-text-bottom text-primary" />{" "}
                            添加到此处，或点击右上角"+ 添加"
                          </div>
                        ) : (
                          <Table
                            head={["变量名称", "参数名称", "目标表达式", "约束", "优化方向", ""]}
                            widths={["1.4fr", "1.2fr", "1.6fr", "0.8fr", "1fr", "40px"]}
                          >
                            {active.targets.map((t) => (
                              <Row key={t.p}>
                                {t.editable ? (
                                  <>
                                    <EditCell value={t.v} onChange={(v) => updateTargetCell(t.p, "v", v)} />
                                    <EditCell value="" onChange={() => {}} mono />
                                    <EditCell value={t.expr} onChange={(v) => updateTargetCell(t.p, "expr", v)} mono />
                                    <EditCell value={t.c} onChange={(v) => updateTargetCell(t.p, "c", v)} mono />
                                    <SelectEditCell
                                      value={t.dir || "最小"}
                                      options={["最小", "最大", "无", "接近于"]}
                                      onChange={(v) => updateTargetCell(t.p, "dir", v)}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Cell>{t.v}</Cell>
                                    <Cell mono>{t.p}</Cell>
                                    <Cell mono>{t.expr}</Cell>
                                    <Cell mono>{t.c}</Cell>
                                    <SelectCell value={t.dir} />
                                  </>
                                )}
                                <div className="flex items-center justify-center border-r border-border last:border-r-0">
                                  <button
                                    onClick={() => removeTarget(t.p)}
                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </Row>
                            ))}
                          </Table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* Section 3: 综合目标 */}
            <Section
              step="3"
              title="综合目标"
              action={
                <button
                  onClick={addOverallTarget}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </button>
              }
            >
              {overallTargets.length === 0 ? (
                <div className="rounded-md border border-border bg-card px-3 py-8 text-center text-[12px] text-muted-foreground">
                  暂无综合目标，点击右上角"+ 添加"新建
                </div>
              ) : (
                <Table
                  head={["变量名称", "参数名称", "目标表达式", "约束", "优化方向", ""]}
                  widths={["1.4fr", "1.2fr", "1.6fr", "0.8fr", "1fr", "40px"]}
                >
                  {overallTargets.map((t) => (
                    <Row key={t.p}>
                      <EditCell value={t.v} onChange={(v) => updateOverallCell(t.p, "v", v)} />
                      <Cell mono>{t.p}</Cell>
                      <EditCell value={t.expr} onChange={(v) => updateOverallCell(t.p, "expr", v)} mono />
                      <EditCell value={t.c} onChange={(v) => updateOverallCell(t.p, "c", v)} mono />
                      <SelectEditCell
                        value={t.dir || "无"}
                        options={["最小", "最大", "无", "接近于"]}
                        onChange={(v) => updateOverallCell(t.p, "dir", v)}
                      />
                      <div className="flex items-center justify-center border-r border-border last:border-r-0">
                        <button
                          onClick={() => removeOverallTarget(t.p)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Row>
                  ))}
                </Table>
              )}
            </Section>

            {/* Section 4: 计算选项 (sticky bottom, inline config) */}
            <InlineCalcOptions
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              solverConfig={solverConfig}
              setSolverConfig={setSolverConfig}
              surrogateConfig={surrogateConfig}
              setSurrogateConfig={setSurrogateConfig}
              onRun={runStartDesign}
            />
            </>
            )}
          </div>
          <StatusBar />
        </main>
          </ResizablePanel>
          {chatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="340px" minSize="280px" maxSize="900px">
                <AIChatPanel
                  calcStatus={calcStatus}
                  onClose={() => setChatOpen(false)}
                  onStartDesign={runStartDesign}
                  onViewResults={() => setSelectedNode("结果")}
                  onCreateProject={() => {
                    setSelectedNode("新设计(优化分析)");
                    toast.success("已创建新优化设计项目");
                  }}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        {!chatOpen && (
          <button
            ref={btnRef}
            onMouseDown={(e) => {
              if (!btnRef.current) return;
              const rect = btnRef.current.getBoundingClientRect();
              const parent = btnRef.current.offsetParent as HTMLElement | null;
              const pRect = parent?.getBoundingClientRect();
              if (!pRect) return;
              dragRef.current.dragging = true;
              dragRef.current.didDrag = false;
              dragRef.current.ox = e.clientX - rect.left;
              dragRef.current.oy = e.clientY - rect.top;
              if (!btnPos) {
                setBtnPos({ x: rect.left - pRect.left, y: rect.top - pRect.top });
              }
            }}
            onClick={() => {
              if (dragRef.current.didDrag) {
                dragRef.current.didDrag = false;
                return;
              }
              setChatOpen(true);
            }}
            className="absolute z-30 cursor-grab select-none p-0 transition hover:scale-105 active:cursor-grabbing"
            style={
              btnPos
                ? { left: btnPos.x, top: btnPos.y, right: "auto", bottom: "auto" }
                : { right: 12, bottom: 64 }
            }
            title="打开 AI 助手"
          >
            <MotorInput className="w-auto shadow-[0_8px_24px_-6px_rgba(0,0,0,0.22)]" />
          </button>
        )}
      </div>

      <PrEditDialog
        open={prDialogOpen}
        onClose={() => setPrDialogOpen(false)}
        onConfirm={(o, f) => {
          addPrTarget(o, f);
          setPrDialogOpen(false);
        }}
      />
      <ModelConfigDialog
        kind={modelDialog}
        onClose={() => setModelDialog(null)}
        solverConfig={solverConfig}
        surrogateConfig={surrogateConfig}
        onSaveSolver={(c) => {
          setSolverConfig(c);
          setModelDialog(null);
          toast.success("求解器配置已保存");
        }}
        onSaveSurrogate={(c) => {
          setSurrogateConfig(c);
          setModelDialog(null);
          toast.success("代理模型配置已保存");
        }}
      />
    </div>
  );
}

/* ---------- pieces ---------- */

const projectMenuItems = [
  { label: "新建", hasArrow: true },
  { label: "项目列表" },
  { label: "我分享的项目" },
  { label: "分享给我的项目" },
  { label: "导入", hasArrow: true },
  { label: "导出", hasArrow: true },
  { label: "创建项目副本", disabled: true },
  { label: "保存", disabled: true },
  { label: "关闭", disabled: true },
  { label: "新建文件夹", disabled: true },
  { label: "6极2.2kW双馈式三相...", divider: true },
  { label: "6极2.2kW双馈式三相感..." },
  { label: "6极2.2kW双馈式三相..." },
  { label: "4极7.5kW三相感应电动..." },
  { label: "8极4.5kW内嵌式三相..." },
  { label: "8极4.5kW内嵌式三相..." },
];

const caseMenuGroups: { title: string; items: string[] }[] = [
  { title: "感应电机", items: ["鼠笼式三相感应电机", "变频鼠笼感应电动机", "单相感应电机", "绕线式三相感应电机", "绕线式变频感应电机", "双馈异步电动机", "双馈异步发电机"] },
  { title: "同步电机", items: ["交流永磁同步电动机", "无刷永磁直流电机", "交流永磁同步发电机", "电励磁同步发电机", "电励磁同步电动机", "隐极同步电动机", "隐极同步发电机", "自起动永磁同步电动机"] },
  { title: "直流电机", items: ["电励磁直流电动机", "电励磁直流发电机", "永磁直流电动机"] },
  { title: "空心杯电机", items: ["空心杯永磁同步电动机"] },
  { title: "直线电机", items: ["动圈式永磁同步直线电机"] },
  { title: "轴向磁通电机", items: [] },
  { title: "其他类型", items: [] },
];

function ProjectMenu() {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded border border-border bg-popover py-1 text-[13px] shadow-lg">
      {projectMenuItems.map((it, i) => (
        <div key={i}>
          {it.divider && <div className="my-1 border-t border-border" />}
          <button
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-accent ${it.disabled ? "text-muted-foreground/50 cursor-not-allowed hover:bg-transparent" : "text-foreground"}`}
            disabled={it.disabled}
          >
            <span>{it.label}</span>
            {it.hasArrow && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>
      ))}
    </div>
  );
}

function CaseMenu() {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded border border-border bg-popover py-1 text-[13px] shadow-lg">
      {caseMenuGroups.map((g) => (
        <div key={g.title}>
          <div className="px-3 py-1.5 text-[12px] font-medium text-primary">{g.title}</div>
          {g.items.map((it) => (
            <button key={it} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-foreground hover:bg-accent">
              <span>{it}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function TopBar() {
  const menus = ["编辑", "视图", "工具", "帮助"];
  const right = ["产业链", "电机研习社", "消息", "黄燕"];
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
          <img src={easimotorLogoAsset.url} alt="EasiMotor Online" className="h-7 w-auto object-contain" />
        </div>
        <nav className="flex items-center gap-4 text-[13px]">
          <div className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1 py-0.5">
            <div className="group relative">
              <button className="rounded px-2 py-1 text-[13px] font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                项目
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100">
                <ProjectMenu />
              </div>
            </div>
            <div className="group relative">
              <button className="rounded px-2 py-1 text-[13px] font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                案例
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100">
                <CaseMenu />
              </div>
            </div>
            <Link
              to="/motor-library"
              className="rounded px-2 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              标准电机库
            </Link>
          </div>
          <div className="mx-1 h-4 w-px bg-border" />
          {menus.map((m) => (
            <button key={m} className="text-foreground/80 transition-colors hover:text-primary">{m}</button>
          ))}
          <Link to="/punch-library" className="text-foreground/80 transition-colors hover:text-primary">冲片商店</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4 text-[12px] text-foreground/80">
        <span className="rounded bg-destructive px-2 py-0.5 text-[11px] text-destructive-foreground">购买</span>
        {right.map((r) => (
          <button key={r} className="flex items-center gap-1 transition-colors hover:text-primary">
            {r}<ChevronDown className="h-3 w-3" />
          </button>
        ))}
      </div>
    </header>
  );
}


function Toolbar() {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-3 py-2">
      <ToolButton label="多场耦合自动分析" icon={multifieldAnalysisAsset.url} />
      <ToolButton label="多场耦合自动分析产品库" icon={multifieldLibraryAsset.url} />
    </div>
  );
}

function ToolButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded px-3 py-1 transition-colors hover:bg-accent">
      <img src={icon} alt={label} className="h-8 w-8 rounded" />
      <span className="text-[11px] text-foreground/80">{label}</span>
    </button>
  );
}


function LeftPane({
  selectedNode,
  onSelectNode,
  shaft,
  setShaft,
  onFocusVentParam,
}: {
  selectedNode: string;
  onSelectNode: (n: string) => void;
  shaft: ShaftState;
  setShaft: React.Dispatch<React.SetStateAction<ShaftState>>;
  onFocusVentParam: (k: DimKey) => void;
}) {
  return (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={15}>
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-3 py-2 font-medium">项目</div>
            <div className="flex-1 overflow-auto py-1 text-[12px]">
              <Tree
                node={projectTree}
                selectedNode={selectedNode}
                onSelectNode={onSelectNode}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={20}>
          <div className="flex h-full flex-col border-t border-sidebar-border">
            <div className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar px-3 py-2 font-medium">属性</div>
            <div className="flex-1 overflow-auto">
              {selectedNode === "转轴" ? (
                <ShaftPropertiesPanel s={shaft} setS={setShaft} onFocusVentParam={onFocusVentParam} />
              ) : (
                <DefaultPropertiesPanel />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </aside>
  );

}

function dimLabel(k: DimKey | null, shape: VentShape): string {
  if (!k) return "—";
  const m: Record<string, string> =
    shape === "circle"
      ? { holeCount: "通风孔数目", holeDia: "通风孔直径", pitchDia: "通风孔位置直径", offsetDeg: "偏移角度", shaftDia: "转轴外径", count: "通风孔数目" }
      : { holeCount: "通风孔数目", innerDia: "通风孔内圆直径", archH: "通风孔高度", toothW: "齿宽", offsetDeg: "偏移角度", count: "通风孔数目" };
  return m[k] ?? k;
}


function DefaultPropertiesPanel() {
  return (
    <>
      <div className="grid grid-cols-[1fr_1fr_60px_60px] border-y border-sidebar-border bg-[var(--table-header)] px-2 py-1 text-[11px] text-muted-foreground">
        <div>名称</div><div>值</div><div>单位</div><div>结果</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_60px_60px] border-b border-sidebar-border px-2 py-1.5">
        <div>名称</div><div>新设计</div><div></div><div></div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_60px_60px] border-b border-sidebar-border px-2 py-1.5">
        <div>相关工况</div><div>工况</div><div></div><div></div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_60px_60px] border-b border-sidebar-border px-2 py-1.5">
        <div>保存算例详细结果</div>
        <div><input type="checkbox" defaultChecked className="accent-[var(--primary)]" /> 是</div>
        <div></div><div></div>
      </div>
    </>
  );
}

type VentShape = "circle" | "ring";
interface VentRow {
  holeCount: number;
  shape: VentShape;
  holeDia: number;
  holePitchDia: number;
  holeOffset: number;
  ringInnerDia: number;
  ringHeight: number;
  ringToothW: number;
}
interface ShaftState {
  material: string;
  neckDia: number;
  length: number;
  neckLen: number;
  fanInertia: number;
  coreOnShaft: boolean;
  axialVent: boolean;
  ventRowCount: number;
  ventRows: VentRow[];
  ventShape: VentShape; // used by diagram preview
}

const defaultVentRow: VentRow = {
  holeCount: 4,
  shape: "circle",
  holeDia: 0,
  holePitchDia: 0,
  holeOffset: 0,
  ringInnerDia: 60,
  ringHeight: 14,
  ringToothW: 8,
};

const defaultShaftState: ShaftState = {
  material: "圆钢45",
  neckDia: 0,
  length: 0,
  neckLen: 0,
  fanInertia: 0,
  coreOnShaft: true,
  axialVent: false,
  ventRowCount: 3,
  ventRows: [{ ...defaultVentRow }, { ...defaultVentRow }, { ...defaultVentRow }],
  ventShape: "circle",
};

function ShaftPropertiesPanel({
  s,
  setS,
  onFocusVentParam,
}: {
  s: ShaftState;
  setS: React.Dispatch<React.SetStateAction<ShaftState>>;
  onFocusVentParam: (k: DimKey) => void;
}) {
  const set = <K extends keyof ShaftState>(k: K, v: ShaftState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div className="grid grid-cols-[1.2fr_1fr_60px_50px] border-y border-sidebar-border bg-[var(--table-header)] px-2 py-1 text-[11px] text-muted-foreground">
        <div>名称</div><div>值</div><div>单位</div><div>结果</div>
      </div>
      <PRow2 label="材料">
        <input value={s.material} onChange={(e) => set("material", e.target.value)} className="w-full bg-transparent outline-none" />
      </PRow2>
      <PRow2 label="轴颈直径" unit="毫米" result="0">
        <NumIn v={s.neckDia} onChange={(v) => set("neckDia", v)} />
      </PRow2>
      <PRow2 label="转轴长度" unit="毫米" result="0">
        <NumIn v={s.length} onChange={(v) => set("length", v)} />
      </PRow2>
      <PRow2 label="轴颈长度" unit="毫米" result="0">
        <NumIn v={s.neckLen} onChange={(v) => set("neckLen", v)} />
      </PRow2>
      <PRow2 label="外风扇的转动惯量" unit="千克*米^2" result="0">
        <NumIn v={s.fanInertia} onChange={(v) => set("fanInertia", v)} />
      </PRow2>
      <PRow2 label="铁芯直接套在轴上">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={s.coreOnShaft} onChange={(e) => set("coreOnShaft", e.target.checked)} className="accent-[var(--primary)]" />
          是
        </label>
      </PRow2>

      <PRow2 label="轴向通风孔">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={s.axialVent}
            onChange={(e) => set("axialVent", e.target.checked)}
            className="accent-[var(--primary)]"
          />
          {s.axialVent ? "是" : "否"}
        </label>
      </PRow2>

      {s.axialVent && (
        <div className="border-b border-emerald-300/60 bg-emerald-100/50">
          <PRow2 label="　通风孔排数" unit="排" result="0">
            <NumIn
              v={s.ventRowCount}
              integer
              onChange={(v) => {
                const n = Math.max(1, Math.min(20, Math.trunc(v) || 0));
                const rows = [...s.ventRows];
                if (n > rows.length) {
                  while (rows.length < n) rows.push({ ...defaultVentRow });
                } else if (n < rows.length) {
                  rows.length = n;
                }
                setS((p) => ({ ...p, ventRowCount: n, ventRows: rows }));
              }}
            />
          </PRow2>

          {s.ventRows.slice(0, s.ventRowCount).map((row, idx) => (
            <VentRowBlock
              key={idx}
              idx={idx}
              row={row}
              onChange={(patch) => {
                const rows = s.ventRows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
                const next: Partial<ShaftState> = { ventRows: rows };
                if (patch.shape) next.ventShape = patch.shape;
                setS((p) => ({ ...p, ...next }));
              }}
              onFocusVentParam={(k) => {
                setS((p) => ({ ...p, ventShape: row.shape }));
                onFocusVentParam(k);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PRow2({
  label,
  unit,
  result,
  children,
}: {
  label: string;
  unit?: string;
  result?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_60px_50px] items-center border-b border-sidebar-border px-2 py-1.5 text-[12px]">
      <div className="truncate" title={label.replace(/　/g, "")}>{label}</div>
      <div className="pr-1">{children}</div>
      <div className="text-[11px] text-muted-foreground">{unit ?? ""}</div>
      <div className="text-[11px] text-muted-foreground">{result ?? ""}</div>
    </div>
  );
}

function NumIn({ v, onChange, integer, onFocus }: { v: number; onChange: (n: number) => void; integer?: boolean; onFocus?: () => void }) {
  return (
    <input
      type="number"
      value={v}
      onFocus={onFocus}
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


function VentRowBlock({
  idx,
  row,
  onChange,
  onFocusVentParam,
}: {
  idx: number;
  row: VentRow;
  onChange: (patch: Partial<VentRow>) => void;
  onFocusVentParam: (k: DimKey) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="grid grid-cols-[1.2fr_1fr_60px_50px] items-center border-b border-emerald-300/60 bg-emerald-200/40 px-2 py-1.5 text-[12px] font-medium">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-left text-emerald-900"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          第{idx + 1}行
        </button>
        <div /><div /><div />
      </div>
      {open && (
        <>
          <PRow2 label="　　通风孔数目" unit="个" result="0">
            <NumIn
              v={row.holeCount}
              integer
              onChange={(v) => onChange({ holeCount: v })}
              onFocus={() => onFocusVentParam("count")}
            />
          </PRow2>
          <PRow2 label="　　通风孔形状">
            <select
              value={row.shape}
              onChange={(e) => onChange({ shape: e.target.value as VentShape })}
              className="w-full rounded border border-sidebar-border bg-background px-1 py-0.5 text-[12px]"
            >
              <option value="circle">圆形轴向通风孔</option>
              <option value="ring">环形轴向通风孔</option>
            </select>
          </PRow2>
          {row.shape === "circle" ? (
            <>
              <PRow2 label="　　通风孔直径" unit="毫米" result="0">
                <NumIn v={row.holeDia} onChange={(v) => onChange({ holeDia: v })} onFocus={() => onFocusVentParam("holeDia")} />
              </PRow2>
              <PRow2 label="　　通风孔位置直径" unit="毫米" result="0">
                <NumIn v={row.holePitchDia} onChange={(v) => onChange({ holePitchDia: v })} onFocus={() => onFocusVentParam("pitchDia")} />
              </PRow2>
              <PRow2 label="　　偏移角度" unit="度" result="0">
                <NumIn v={row.holeOffset} onChange={(v) => onChange({ holeOffset: v })} onFocus={() => onFocusVentParam("offsetDeg")} />
              </PRow2>
            </>
          ) : (
            <>
              <PRow2 label="　　通风孔内圆直径" unit="毫米" result="0">
                <NumIn v={row.ringInnerDia} onChange={(v) => onChange({ ringInnerDia: v })} onFocus={() => onFocusVentParam("innerDia")} />
              </PRow2>
              <PRow2 label="　　通风孔高度" unit="毫米" result="0">
                <NumIn v={row.ringHeight} onChange={(v) => onChange({ ringHeight: v })} onFocus={() => onFocusVentParam("archH")} />
              </PRow2>
              <PRow2 label="　　齿宽" unit="度" result="0">
                <NumIn v={row.ringToothW} onChange={(v) => onChange({ ringToothW: v })} onFocus={() => onFocusVentParam("toothW")} />
              </PRow2>
              <PRow2 label="　　偏移角度" unit="度" result="0">
                <NumIn v={row.holeOffset} onChange={(v) => onChange({ holeOffset: v })} onFocus={() => onFocusVentParam("offsetDeg")} />
              </PRow2>
            </>
          )}
        </>
      )}
    </>
  );
}


type TreeNode = { label: string; children?: TreeNode[]; active?: boolean; badge?: boolean };
const projectTree: TreeNode = {
  label: "root",
  children: [
    {
      label: "8极4.5kW内嵌式三相永磁同步电动机_优化设计(案例_不可编辑)",
      children: [
        {
          label: "新建电机(交流永磁同步电机)",
          children: [
            { label: "定子" },
            { label: "转子" },
            { label: "转轴" },
            {
              label: "工况",
              children: [
                { label: "参数化设计" },
                {
                  label: "优化设计",
                  children: [
                    { label: "新设计(优化分析)", badge: true, children: [{ label: "结果" }] },
                    { label: "蒙特卡罗分析" },
                    { label: "附件" },
                  ],
                },
              ],
            },
          ],
        },
        { label: "电流源激励试验" },
        { label: "电流源激励试验(最优设计-负载)" },
        { label: "电流源激励试验(原模型-负载)" },
        { label: "电流源激励试验(最优设计-空载)" },
        { label: "电流源激励试验(原模型-空载)" },
        { label: "材料" },
      ],
    },
  ],
};

function Tree({
  node,
  depth = 0,
  selectedNode,
  onSelectNode,
}: {
  node: TreeNode;
  depth?: number;
  selectedNode?: string;
  onSelectNode?: (n: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  if (node.label === "root")
    return <>{node.children?.map((c, i) => <Tree key={i} node={c} depth={0} selectedNode={selectedNode} onSelectNode={onSelectNode} />)}</>;
  const hasChildren = !!node.children?.length;
  const isShaft = node.label === "转轴";
  const isSelected = selectedNode === node.label;
  const isStator = node.label === "定子";
  const isRotor = node.label === "转子";
  const menuItems: { label: string; onClick: () => void }[] = [
    { label: "保存冲片到我的冲片库", onClick: () => toast.success("已保存冲片到我的冲片库") },
  ];
  if (isStator) menuItems.push({ label: "仅保存定子到我的冲片库", onClick: () => toast.success("已保存定子到我的冲片库") });
  if (isRotor) menuItems.push({ label: "仅保存转子到我的冲片库", onClick: () => toast.success("已保存转子到我的冲片库") });
  return (
    <div>
      <div
        className={`group relative flex cursor-pointer items-center gap-1 py-[3px] pr-2 transition-colors ${
          !isSelected && !node.active ? "hover:text-primary" : ""
        } ${isShaft && !isSelected ? "hover:text-[var(--fem)]" : ""}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => {
          if (hasChildren) setOpen(!open);
          onSelectNode?.(node.label);
        }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        <span
          className={`truncate px-1 ${
            node.active || isSelected
              ? "bg-primary text-primary-foreground font-medium border-b-2 border-primary rounded-sm"
              : ""
          }`}
        >
          {node.label}
        </span>


        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className={`ml-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity ${
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              aria-label="更多操作"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-auto min-w-[12rem] p-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(e) => { e.stopPropagation(); item.onClick(); setMenuOpen(false); }}
                className="block w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      {hasChildren && open && node.children!.map((c, i) => <Tree key={i} node={c} depth={depth + 1} selectedNode={selectedNode} onSelectNode={onSelectNode} />)}
    </div>
  );
}

function Section({
  step, title, subtitle, action, children,
}: { step: string; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {step}
          </span>
          <h2 className="text-[14px] font-semibold">{title}</h2>
          {subtitle && <span className="ml-2 text-[12px] text-muted-foreground">{subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({ head, widths, children }: { head: string[]; widths: string[]; children: React.ReactNode }) {
  const tmpl = widths.join(" ");
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div
        className="grid bg-[var(--table-header)] text-[12px] font-medium text-muted-foreground"
        style={{ gridTemplateColumns: tmpl }}
      >
        {head.map((h, i) => (
          <div key={i} className="border-r border-border px-3 py-2 last:border-r-0">{h}</div>
        ))}
      </div>
      <div style={{ "--cols": tmpl } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid border-t border-border transition-colors hover:bg-accent/40"
      style={{ gridTemplateColumns: "var(--cols)" }}
    >
      {children}
    </div>
  );
}

function Cell({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <div className={`border-r border-border px-3 py-2 last:border-r-0 ${mono ? "font-mono text-[12px]" : ""}`}>
      {children}
    </div>
  );
}

function SelectCell({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between border-r border-border px-3 py-2 last:border-r-0">
      <span>{value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

function DeleteCell() {
  return (
    <div className="flex items-center justify-center border-r border-border last:border-r-0">
      <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded p-1 text-primary transition-colors hover:bg-accent">
      {children}
    </button>
  );
}

function Category({
  label, color, count, open, onOpenChange, onAdd, children,
}: {
  label: string;
  color: "primary" | "fem";
  count: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const dot = color === "primary" ? "bg-primary" : "bg-[var(--fem)]";
  const countTone =
    color === "primary"
      ? "bg-accent text-accent-foreground"
      : "bg-[var(--fem-bg)] text-[var(--fem)]";
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-1">
        <button onClick={() => onOpenChange(!open)} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span>{label}</span>
          <span className={`ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${countTone}`}>
            {count}
          </span>
        </button>
        <button onClick={onAdd} className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="新增工况">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}


function WorkloadItem({
  w, active, onClick, onRename, onDelete,
}: {
  w: Workload;
  active: boolean;
  onClick: () => void;
  onRename: (n: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(w.name);
  const [confirmDel, setConfirmDel] = useState(false);

  const tone =
    w.type === "magnetic"
      ? active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-border hover:border-primary/40 hover:bg-accent"
      : active
        ? "bg-[var(--fem)] text-white border-[var(--fem)]"
        : "border-border hover:border-[var(--fem)]/40 hover:bg-[var(--fem-bg)]";

  const commitRename = () => {
    const v = draft.trim();
    if (v) onRename(v);
    else setDraft(w.name);
    setEditing(false);
  };

  return (
    <div className={`group relative flex items-center justify-between rounded border px-3 py-2 text-[12px] transition-all ${tone}`}>
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraft(w.name); setEditing(false); }
            }}
            className="mr-1 min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-[12px] text-foreground focus:border-primary focus:outline-none"
          />
          <button onMouseDown={(e) => e.preventDefault()} onClick={commitRename} className="rounded p-0.5 hover:bg-black/10">
            <Check className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <button onClick={onClick} className="min-w-0 flex-1 truncate text-left">
            {w.name}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className={`ml-1 rounded p-0.5 ${active ? "text-current opacity-60 hover:opacity-100 hover:bg-black/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            title="更多"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </>

      )}

      {menuOpen && !editing && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDel(false); }} />
          <div className="absolute right-1 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
            {confirmDel ? (
              <div className="p-2">
                <div className="mb-2 text-[11px] text-muted-foreground">确认删除该工况？</div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => { setConfirmDel(false); setMenuOpen(false); }}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[11px] hover:bg-accent"
                  >
                    <X className="h-3 w-3" /> 取消
                  </button>
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); setConfirmDel(false); }}
                    className="rounded bg-destructive px-2 py-1 text-[11px] text-destructive-foreground hover:opacity-90"
                  >
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setEditing(true); setDraft(w.name); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" /> 重命名
                </button>
                <button
                  onClick={() => setConfirmDel(true)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 删除
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-border px-3 py-3 text-center text-[11px] text-muted-foreground">{children}</div>;
}

function StatusBar() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 消息窗口</span>
        <span className="flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-accent-foreground"><ListChecks className="h-3 w-3" /> 任务队列</span>
        <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> 创建副本任务队列</span>
      </div>
      <div className="flex items-center gap-2">
        <span>状态栏</span>
        <span>选择上面部分操作项时，此处会显示该操作的说明</span>
        <ChevronUp className="h-3 w-3" />
      </div>
    </footer>
  );
}

/* ---------- available-params ---------- */

function ParamRow({
  desc, itemid, selected, onAdd, tone = "primary",
}: { desc: string; itemid: string; selected: boolean; onAdd: () => void; tone?: "primary" | "fem" }) {
  const selectedCls =
    tone === "fem"
      ? "border-[var(--fem)]/60 bg-[var(--fem-bg)] text-[var(--fem)]"
      : "border-primary/60 bg-accent text-accent-foreground";
  const hoverCls =
    tone === "fem"
      ? "border-border bg-background hover:border-[var(--fem)] hover:bg-[var(--fem-bg)]"
      : "border-border bg-background hover:border-primary hover:bg-accent";
  const iconCls = tone === "fem" ? "text-[var(--fem)]" : "text-primary";
  return (
    <div
      className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-[12px] transition-colors ${
        selected ? selectedCls : hoverCls
      }`}
      title={itemid}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate">{desc}</div>
        <div className={`truncate font-mono text-[10px] ${selected ? "opacity-70" : "text-muted-foreground"}`}>{itemid}</div>
      </div>
      <button
        disabled={selected}
        onClick={onAdd}
        className={`ml-2 shrink-0 rounded p-1 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${iconCls}`}
        title={selected ? "已添加" : "添加到目标参数列表"}
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FemParamList({
  params, search, selected, onAdd, onAddPr,
}: {
  params: FemParam[];
  search: string;
  selected: string[];
  onAdd: (it: FemParam) => void;
  onAddPr: (order: number, freq: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [prOpen, setPrOpen] = useState(false);
  const q = search.trim().toLowerCase();
  const filtered = params.filter(
    (it) => !q || it.desc.toLowerCase().includes(q) || it.itemid.toLowerCase().includes(q),
  );
  const isOpen = open || !!q;

  return (
    <div className="rounded border border-border bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-1.5">
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          
          计算参数
        </span>
        <span className="text-[11px] font-normal text-muted-foreground">{filtered.length}</span>
      </button>
      {isOpen && (
        <div className="space-y-1 border-t border-border p-1.5">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">未找到匹配的参数</div>
          ) : (
            filtered.map((it) =>
              it.kind === "pr" ? (
                <PrParamRow
                  key={it.itemid}
                  desc={it.desc}
                  open={prOpen}
                  onToggle={() => setPrOpen((v) => !v)}
                  onConfirm={(o, f) => { onAddPr(o, f); setPrOpen(false); }}
                />
              ) : (
                <ParamRow
                  key={it.itemid}
                  desc={it.desc}
                  itemid={it.itemid}
                  selected={selected.includes(it.itemid)}
                  onAdd={() => onAdd(it)}
                  tone="fem"
                />
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 电磁力幅值 pr(order, freq) ---------- */

function PrParamRow({
  desc, open, onToggle, onConfirm,
}: {
  desc: string;
  open: boolean;
  onToggle: () => void;
  onConfirm: (order: number, freq: number) => void;
}) {
  const [order, setOrder] = useState<string>("2");
  const [freq, setFreq] = useState<string>("450");

  const orderNum = Number(order);
  const freqNum = Number(freq);
  const orderValid = order.trim() !== "" && Number.isInteger(orderNum);
  const freqValid = freq.trim() !== "" && Number.isFinite(freqNum) && freqNum >= 0;
  const valid = orderValid && freqValid;
  const preview = `pr(${order || "?"},${freq || "?"})`;

  return (
    <div
      className={`rounded border transition-colors ${
        open
          ? "border-[var(--fem)]/60 bg-[var(--fem-bg)]"
          : "border-border bg-background hover:border-[var(--fem)] hover:bg-[var(--fem-bg)]"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12px]"
        title="电磁力幅值 pr(空间阶次, 时间频率)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`truncate font-medium ${open ? "text-[var(--fem)]" : ""}`}>{desc}</span>
            {open && (
              <span className="rounded bg-[var(--fem)]/15 px-1 py-px text-[10px] font-normal text-[var(--fem)]">需配置</span>
            )}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">pr(空间阶次, 时间频率)</div>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--fem)]" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--fem)]/30 p-2">
          <div>
            <label className="mb-0.5 block text-[11px] font-medium">空间阶次</label>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              inputMode="numeric"
              placeholder="如 2 / -1 / 0"
              className={`w-full rounded border bg-background px-2 py-1 font-mono text-[12px] focus:outline-none ${orderValid ? "border-input focus:border-[var(--fem)]" : "border-destructive focus:border-destructive"}`}
            />
            <div className={`mt-0.5 text-[10px] ${orderValid ? "text-muted-foreground" : "text-destructive"}`}>
              整数，可为正、负或 0
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-medium">时间频率 (Hz)</label>
            <input
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              inputMode="decimal"
              placeholder="如 450"
              className={`w-full rounded border bg-background px-2 py-1 font-mono text-[12px] focus:outline-none ${freqValid ? "border-input focus:border-[var(--fem)]" : "border-destructive focus:border-destructive"}`}
            />
            <div className={`mt-0.5 text-[10px] ${freqValid ? "text-muted-foreground" : "text-destructive"}`}>
              数值，必须 ≥ 0
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="truncate font-mono text-[11px] text-muted-foreground">预览：{preview}</span>
            <button
              disabled={!valid}
              onClick={() => valid && onConfirm(Math.trunc(orderNum), freqNum)}
              className="shrink-0 rounded bg-[var(--fem)] px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrExprCell({
  order, freq, onChange,
}: {
  order: number;
  freq: number;
  onChange: (order: number, freq: number) => void;
}) {
  const [o, setO] = useState(String(order));
  const [f, setF] = useState(String(freq));
  // sync when parent changes
  // (kept simple — local mirror for inputs)
  const orderNum = Number(o);
  const freqNum = Number(f);
  const orderValid = o.trim() !== "" && Number.isInteger(orderNum);
  const freqValid = f.trim() !== "" && Number.isFinite(freqNum) && freqNum >= 0;

  const commit = () => {
    if (orderValid && freqValid) onChange(Math.trunc(orderNum), freqNum);
    else { setO(String(order)); setF(String(freq)); }
  };

  return (
    <div className="flex items-center gap-1 border-r border-border px-2 py-1.5 last:border-r-0 font-mono text-[12px]">
      <span>pr(</span>
      <input
        value={o}
        onChange={(e) => setO(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        title="空间阶次：整数，可正可负可0"
        className={`w-12 rounded border bg-background px-1 py-0.5 text-center focus:outline-none ${orderValid ? "border-input focus:border-[var(--fem)]" : "border-destructive"}`}
      />
      <span>,</span>
      <input
        value={f}
        onChange={(e) => setF(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        title="时间频率 (Hz)：数值，必须 ≥ 0"
        className={`w-16 rounded border bg-background px-1 py-0.5 text-center focus:outline-none ${freqValid ? "border-input focus:border-[var(--fem)]" : "border-destructive"}`}
      />
      <span>)</span>
    </div>
  );
}

function GroupedParams({
  search, selected, onAdd,
}: {
  search: string;
  selected: string[];
  onAdd: (it: { desc: string; itemid: string }) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = magneticParamGroups
    .map((g) => ({
      ...g,
      itemlist: g.itemlist.filter(
        (it) => !q || it.desc.toLowerCase().includes(q) || it.itemid.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.itemlist.length > 0);

  if (filtered.length === 0) {
    return <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">未找到匹配的参数</div>;
  }

  return (
    <>
      {filtered.map((g) => (
        <ParamGroupBlock
          key={g.groupdesc}
          group={g}
          forceOpen={!!q}
          selected={selected}
          onAdd={onAdd}
        />
      ))}
    </>
  );
}

function ParamGroupBlock({
  group, forceOpen, selected, onAdd,
}: {
  group: { groupdesc: string; itemlist: { desc: string; itemid: string }[] };
  forceOpen: boolean;
  selected: string[];
  onAdd: (it: { desc: string; itemid: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  return (
    <div className="rounded border border-border bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-1.5">
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          
          {group.groupdesc}
        </span>
        <span className="text-[11px] font-normal text-muted-foreground">{group.itemlist.length}</span>
      </button>
      {isOpen && (
        <div className="space-y-1 border-t border-border p-1.5">
          {group.itemlist.map((it) => (
            <ParamRow
              key={it.itemid}
              desc={it.desc}
              itemid={it.itemid}
              selected={selected.includes(it.itemid)}
              onAdd={() => onAdd(it)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 目标参数列表 — 添加 按钮 ---------- */

function AddRowButton({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onAddRow,
  onPickPr,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onAddRow: () => void;
  onPickPr: () => void;
}) {
  return (
    <div className="relative">
      <div className="inline-flex overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm">
        <button
          onClick={onAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
        {false && (
          <>
            <div className="w-px bg-white/30" />
            <CursorTooltip label="添加特殊目标参数">
              <button
                onClick={onToggleMenu}
                className="flex items-center px-2 transition-opacity hover:opacity-90"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </CursorTooltip>
          </>
        )}
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <button
              onClick={onPickPr}
              className="block w-full px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
            >
              电磁力幅值
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EditCell({
  value,
  onChange,
  mono,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="border-r border-border last:border-r-0">
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`block h-full w-full border-0 bg-transparent px-3 py-2 text-[12px] focus:bg-background focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

function SelectEditCell({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative border-r border-border last:border-r-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block h-full w-full appearance-none border-0 bg-transparent px-3 py-2 pr-7 text-[12px] focus:bg-background focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/* ---------- 电磁力幅值 编辑窗口 (与左侧 PrParamRow 内容相同) ---------- */

function PrEditDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (order: number, freq: number) => void;
}) {
  const [order, setOrder] = useState("2");
  const [freq, setFreq] = useState("450");

  if (!open) return null;

  const orderNum = Number(order);
  const freqNum = Number(freq);
  const orderValid = order.trim() !== "" && Number.isInteger(orderNum);
  const freqValid = freq.trim() !== "" && Number.isFinite(freqNum) && freqNum >= 0;
  const valid = orderValid && freqValid;
  const preview = `pr(${order || "?"},${freq || "?"})`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-[360px] rounded-md border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-medium">电磁力幅值</span>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="font-mono text-[11px] text-muted-foreground">pr(空间阶次, 时间频率)</div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">空间阶次</label>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              inputMode="numeric"
              placeholder="如 2 / -1 / 0"
              className={`w-full rounded border bg-background px-2 py-1.5 font-mono text-[12px] focus:outline-none ${orderValid ? "border-input focus:border-[var(--fem)]" : "border-destructive focus:border-destructive"}`}
            />
            <div className={`mt-0.5 text-[10px] ${orderValid ? "text-muted-foreground" : "text-destructive"}`}>
              整数，可为正、负或 0
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">时间频率 (Hz)</label>
            <input
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              inputMode="decimal"
              placeholder="如 450"
              className={`w-full rounded border bg-background px-2 py-1.5 font-mono text-[12px] focus:outline-none ${freqValid ? "border-input focus:border-[var(--fem)]" : "border-destructive focus:border-destructive"}`}
            />
            <div className={`mt-0.5 text-[10px] ${freqValid ? "text-muted-foreground" : "text-destructive"}`}>
              数值，必须 ≥ 0
            </div>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">预览：{preview}</div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
          <button onClick={onClose} className="rounded border border-input bg-background px-3 py-1.5 text-[12px] hover:bg-accent">
            取消
          </button>
          <button
            disabled={!valid}
            onClick={() => valid && onConfirm(Math.trunc(orderNum), freqNum)}
            className="rounded bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

type SolverConfig = { algo: string; sampling: string; generations: string; population: string };
type SurrogateConfig = {
  algo: string;
  sampling: string;
  generations: string;
  population: string;
  mode: string;
  interval: string;
  modelAlgo: string;
};

function InlineCalcOptions({
  selectedModel,
  setSelectedModel,
  solverConfig,
  setSolverConfig,
  surrogateConfig,
  setSurrogateConfig,
  onRun,
}: {
  selectedModel: "solver" | "surrogate";
  setSelectedModel: (m: "solver" | "surrogate") => void;
  solverConfig: SolverConfig;
  setSolverConfig: (c: SolverConfig) => void;
  surrogateConfig: SurrogateConfig;
  setSurrogateConfig: (c: SurrogateConfig) => void;
  onRun: () => void;
}) {
  const [configOpen, setConfigOpen] = useState(true);
  const selectCls =
    "h-7 rounded-[4px] border border-input bg-background px-2 text-[12px] focus:border-primary focus:outline-none";
  const inputCls =
    "h-7 w-16 rounded-[4px] border border-input bg-background px-2 text-[12px] focus:border-primary focus:outline-none";
  const chipLabelCls = "inline-flex items-center gap-1 text-[11px] text-muted-foreground";

  const workModeHelp =
    "指定FEA间隔：每隔N代采用非代理模型求解，其余使用代理模型求解。第1代与最后1代不可使用代理模型。例如：遗传代数为20，指定FEA间隔为5，则第1、7、13、19、20代使用非代理模型，其余代数使用代理模型。\n\n指定跳过FEA的代数：例如：输入“5-8,12”，表示第5代到第8代，第12代采用代理模型求解，其余采用有非代理模型求解。第1代与最后1代不可使用代理模型求解。\n\n智能工作模式：系统根据代理模型置信度自动决策何时调用 FEA。";

  const generationsPresets = ["10", "20", "50", "100", "200"];
  const populationPresets = ["20", "50", "100", "200"];
  const genHelp = "代数代表算法迭代的次数，它决定了算法搜索最优解的时间长度。";
  const popHelp = "种群数是指每一代中个体的数量，它影响算法的多样性和搜索空间的覆盖度。";

  const AlgoSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="NSGA-II">NSGA-II（目标数≤3时，建议选择）</option>
      <option value="NSGA-III">NSGA-III（目标数≥4时，建议选择）</option>
      <option value="MOEA/D">MOEA/D</option>
    </select>
  );

  const PresetSelect = ({
    value,
    onChange,
    presets,
  }: {
    value: string;
    onChange: (v: string) => void;
    presets: string[];
  }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectCls} w-20`}>
      {(presets.includes(value) ? presets : [value, ...presets]).map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );


  const SolverFields = (
    <>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>遗传算法</span>
        <AlgoSelect value={solverConfig.algo} onChange={(v) => setSolverConfig({ ...solverConfig, algo: v })} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>采样方法</span>
        <select value={solverConfig.sampling} onChange={(e) => setSolverConfig({ ...solverConfig, sampling: e.target.value })} className={selectCls}>
          <option>随机采样</option>
          <option>拉丁超立方采样</option>
          <option>正交采样</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>遗传代数<InfoTip label={genHelp} /></span>
        <PresetSelect value={solverConfig.generations} onChange={(v) => setSolverConfig({ ...solverConfig, generations: v })} presets={generationsPresets} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>每代种群<InfoTip label={popHelp} /></span>
        <ComboInput value={solverConfig.population} onChange={(v) => setSolverConfig({ ...solverConfig, population: v })} listId="solver-population" presets={populationPresets} />
      </div>
    </>
  );

  const SurrogateFields = (
    <>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>遗传算法</span>
        <AlgoSelect value={surrogateConfig.algo} onChange={(v) => setSurrogateConfig({ ...surrogateConfig, algo: v })} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>采样方法</span>
        <select value={surrogateConfig.sampling} onChange={(e) => setSurrogateConfig({ ...surrogateConfig, sampling: e.target.value })} className={selectCls}>
          <option>随机采样</option>
          <option>拉丁超立方采样</option>
          <option>正交采样</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>遗传代数<InfoTip label={genHelp} /></span>
        <ComboInput value={surrogateConfig.generations} onChange={(v) => setSurrogateConfig({ ...surrogateConfig, generations: v })} listId="surrogate-generations" presets={generationsPresets} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>每代种群<InfoTip label={popHelp} /></span>
        <ComboInput value={surrogateConfig.population} onChange={(v) => setSurrogateConfig({ ...surrogateConfig, population: v })} listId="surrogate-population" presets={populationPresets} />
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <span className={chipLabelCls}>工作模式<InfoTip label={workModeHelp} /></span>
        <select value={surrogateConfig.mode} onChange={(e) => setSurrogateConfig({ ...surrogateConfig, mode: e.target.value })} className={selectCls}>
          <option>指定FEA间隔</option>
          <option>指定跳过FEA的代数</option>
          <option>智能工作模式</option>
        </select>
      </div>
      {surrogateConfig.mode !== "智能工作模式" && (
        <div className="flex items-center gap-1.5">
          <span className={chipLabelCls}>{surrogateConfig.mode === "指定跳过FEA的代数" ? "跳过代数" : "FEA间隔"}</span>
          <input
            value={surrogateConfig.interval}
            onChange={(e) => setSurrogateConfig({ ...surrogateConfig, interval: e.target.value })}
            placeholder={surrogateConfig.mode === "指定跳过FEA的代数" ? "5-8,12" : "5"}
            className={`${inputCls} w-24`}
          />
        </div>
      )}
      {surrogateConfig.mode !== "智能工作模式" && (
        <div className="flex items-center gap-1.5">
          <span className={chipLabelCls}>模型算法</span>
          <select value={surrogateConfig.modelAlgo} onChange={(e) => setSurrogateConfig({ ...surrogateConfig, modelAlgo: e.target.value })} className={selectCls}>
            <option>随机森林算法</option>
            <option>高斯过程回归</option>
            <option>神经网络</option>
          </select>
        </div>
      )}
    </>
  );

  return (
    <section className="sticky bottom-0 z-10 border-t border-border bg-background/95 shadow-[0_-6px_18px_-8px_rgba(0,0,0,0.12)] backdrop-blur relative">
      {/* Top-center collapse toggle tab */}
      <button
        onClick={() => setConfigOpen((v) => !v)}
        className="absolute left-1/2 top-0 z-20 inline-flex h-5 w-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-t-md border border-b-0 border-border bg-background shadow-sm transition-colors hover:bg-accent"
        title={configOpen ? "收起求解配置" : "展开求解配置"}
        aria-label={configOpen ? "收起求解配置" : "展开求解配置"}
      >
        {configOpen ? <ChevronsDown className="h-4 w-4 text-primary" /> : <ChevronsUp className="h-4 w-4 text-primary" />}
      </button>
      {/* Collapsible config panel — expands upward */}
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          configOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 bg-muted/20 px-5 py-2.5">
            {selectedModel === "solver" ? SolverFields : SurrogateFields}
          </div>

        </div>
      </div>


      {/* Action bar: title · segmented mode · collapse toggle · actions */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              4
            </span>
            <h2 className="text-[14px] font-semibold">计算选项</h2>
          </div>
          {/* Dribbble-style segmented pill */}
          <div className="relative flex items-center gap-1 rounded-full border border-border bg-muted/60 p-0.5">
            <button
              onClick={() => setSelectedModel("solver")}
              className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                selectedModel === "solver"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              求解器
            </button>
            <button
              onClick={() => setSelectedModel("surrogate")}
              className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                selectedModel === "surrogate"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              代理模型
            </button>
          </div>





          <span className="text-[11px] text-muted-foreground">
            {selectedModel === "solver" ? "遗传算法直接求解，精度高" : "代理模型加速寻优，效率提升 5-10x"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-[4px] border border-input bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-accent">
            参数预览
          </button>
          <button
            onClick={() => toast.success("已保存")}
            className="rounded-[4px] border border-input bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-accent"
          >
            保存
          </button>
          <button
            onClick={onRun}
            className="rounded-[4px] bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md"
          >
            分析计算
          </button>
        </div>
      </div>
    </section>
  );
}

function InfoTip({ label }: { label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const handleMove = (e: React.MouseEvent) => {
    const tipW = 360;
    const tipH = 180;
    const pad = 8;
    let x = e.clientX + 12;
    let y = e.clientY - tipH - 10;
    if (x + tipW + pad > window.innerWidth) x = window.innerWidth - tipW - pad;
    if (y < pad) y = e.clientY + 18;
    if (x < pad) x = pad;
    setPos({ x, y });
  };
  return (
    <>
      <span
        onMouseEnter={handleMove}
        onMouseMove={handleMove}
        onMouseLeave={() => setPos(null)}
        className="inline-flex cursor-help items-center text-muted-foreground/70 hover:text-primary"
      >
        <Info className="h-3 w-3" />
      </span>
      {pos && (
        <div
          className="pointer-events-none fixed z-[200] max-w-[360px] whitespace-pre-line rounded-md bg-black/80 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg"
          style={{ left: pos.x, top: pos.y }}
        >
          {label}
        </div>
      )}
    </>
  );
}
function ModelConfigDialog({
  kind,
  onClose,
  solverConfig,
  surrogateConfig,
  onSaveSolver,
  onSaveSurrogate,
}: {
  kind: null | "solver" | "surrogate";
  onClose: () => void;
  solverConfig: SolverConfig;
  surrogateConfig: SurrogateConfig;
  onSaveSolver: (c: SolverConfig) => void;
  onSaveSurrogate: (c: SurrogateConfig) => void;
}) {
  const solverDefault: SolverConfig = { algo: "NSGA-II", sampling: "随机采样", generations: "20", population: "20" };
  const surrogateDefault: SurrogateConfig = {
    algo: "NSGA-II",
    sampling: "随机采样",
    generations: "20",
    population: "20",
    mode: "指定FEA间隔",
    interval: "5",
    modelAlgo: "随机森林算法",
  };
  const [solver, setSolver] = useState<SolverConfig>(solverConfig);
  const [surrogate, setSurrogate] = useState<SurrogateConfig>(surrogateConfig);
  useEffect(() => {
    if (kind === "solver") setSolver(solverConfig);
    if (kind === "surrogate") setSurrogate(surrogateConfig);
  }, [kind, solverConfig, surrogateConfig]);

  if (!kind) return null;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1 block text-[12px] font-medium">{label}</label>
      {children}
    </div>
  );
  const inputCls =
    "w-full rounded border border-input bg-background px-2 py-1.5 text-[12px] focus:border-primary focus:outline-none";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-[420px] max-h-[90vh] overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-medium">{kind === "solver" ? "求解器配置" : "代理模型配置"}</span>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          {kind === "solver" ? (
            <>
              <Field label="遗传算法">
                <select value={solver.algo} onChange={(e) => setSolver({ ...solver, algo: e.target.value })} className={inputCls}>
                  <option>NSGA-II</option>
                  <option>NSGA-III</option>
                  <option>MOEA/D</option>
                </select>
              </Field>
              <Field label="采样方法">
                <select value={solver.sampling} onChange={(e) => setSolver({ ...solver, sampling: e.target.value })} className={inputCls}>
                  <option>随机采样</option>
                  <option>拉丁超立方采样</option>
                  <option>正交采样</option>
                </select>
              </Field>
              <Field label="遗传代数">
                <input value={solver.generations} onChange={(e) => setSolver({ ...solver, generations: e.target.value })} className={inputCls} />
              </Field>
              <Field label="每代种群数量">
                <input value={solver.population} onChange={(e) => setSolver({ ...solver, population: e.target.value })} className={inputCls} />
              </Field>
            </>
          ) : (
            <>
              <Field label="遗传算法">
                <select value={surrogate.algo} onChange={(e) => setSurrogate({ ...surrogate, algo: e.target.value })} className={inputCls}>
                  <option>NSGA-II</option>
                  <option>NSGA-III</option>
                  <option>MOEA/D</option>
                </select>
              </Field>
              <Field label="采样方法">
                <select value={surrogate.sampling} onChange={(e) => setSurrogate({ ...surrogate, sampling: e.target.value })} className={inputCls}>
                  <option>随机采样</option>
                  <option>拉丁超立方采样</option>
                  <option>正交采样</option>
                </select>
              </Field>
              <Field label="遗传代数">
                <input value={surrogate.generations} onChange={(e) => setSurrogate({ ...surrogate, generations: e.target.value })} className={inputCls} />
              </Field>
              <Field label="每代种群数量">
                <input value={surrogate.population} onChange={(e) => setSurrogate({ ...surrogate, population: e.target.value })} className={inputCls} />
              </Field>
              <Field label="工作模式">
                <select value={surrogate.mode} onChange={(e) => setSurrogate({ ...surrogate, mode: e.target.value })} className={inputCls}>
                  <option>指定FEA间隔</option>
                  <option>指定跳过FEA的代数</option>
                  <option>智能工作模式</option>
                </select>
                {surrogate.mode !== "智能工作模式" && (
                  <>
                    <input
                      value={surrogate.interval}
                      onChange={(e) => setSurrogate({ ...surrogate, interval: e.target.value })}
                      placeholder={surrogate.mode === "指定跳过FEA的代数" ? "例如：5-8,12" : "例如：5"}
                      className={`${inputCls} mt-2`}
                    />
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                      {surrogate.mode === "指定跳过FEA的代数"
                        ? "例如：输入\"5-8,12\"，表示第5代到第8代、第12代采用代理模型求解，其余采用非代理模型求解。第1代与最后1代不可使用代理模型求解。"
                        : "每隔N代采用非代理模型求解，其余使用代理模型求解。第1代与最后1代不可使用代理模型。例如：遗传代数为20，指定FEA间隔为5，则第1、7、13、19、20代使用非代理模型，其余代数使用代理模型。"}
                    </p>
                  </>
                )}
              </Field>
              {surrogate.mode !== "智能工作模式" && (
                <Field label="模型算法">
                  <select value={surrogate.modelAlgo} onChange={(e) => setSurrogate({ ...surrogate, modelAlgo: e.target.value })} className={inputCls}>
                    <option>随机森林算法</option>
                    <option>高斯过程回归</option>
                    <option>神经网络</option>
                  </select>
                </Field>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
          <button onClick={onClose} className="rounded border border-input bg-background px-3 py-1.5 text-[12px] hover:bg-accent">
            取消
          </button>
          <button
            onClick={() => {
              if (kind === "solver") setSolver(solverDefault);
              else setSurrogate(surrogateDefault);
            }}
            className="rounded border border-input bg-background px-3 py-1.5 text-[12px] hover:bg-accent"
          >
            重置
          </button>
          <button
            onClick={() => (kind === "solver" ? onSaveSolver(solver) : onSaveSurrogate(surrogate))}
            className="rounded bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CursorTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const handleMove = (e: React.MouseEvent) => {
    const tipW = 180;
    const tipH = 32;
    const pad = 8;
    let x = e.clientX + 12;
    let y = e.clientY + 18;
    if (x + tipW + pad > window.innerWidth) x = window.innerWidth - tipW - pad;
    if (y + tipH + pad > window.innerHeight) y = e.clientY - tipH - 10;
    if (x < pad) x = pad;
    setPos({ x, y });
  };
  return (
    <>
      <div
        className="flex"
        onMouseEnter={handleMove}
        onMouseMove={handleMove}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </div>
      {pos && (
        <div
          className="pointer-events-none fixed z-[200] whitespace-nowrap rounded-md bg-black/80 px-3 py-1.5 text-[12px] font-normal text-white shadow-lg"
          style={{ left: pos.x, top: pos.y }}
        >
          {label}
        </div>
      )}
    </>
  );
}

// ============================= 优化设计结果 =============================
const RESULT_COLS = [
  { key: "p", label: "P(输出功率)" },
  { key: "pout", label: "输出功率" },
  { key: "emf", label: "工况1_线反电势" },
  { key: "irms", label: "工况1: 电机线电流有效值" },
] as const;

type ResultRow = { p: number; pout: number; emf: number; irms: number; selected?: boolean };

function genResultRows(): ResultRow[] {
  const rows: ResultRow[] = [];
  const seed = [
    [12.9, 96, 24.4606778871768, 170.66697310675926, false],
    [12.8, 91, 59.1706687046532, 64.8, false],
    [11.6, 99, 16.88190754725628, 257.0123517904685, true],
    [11.6, 93, 19.8748985615028, 251.35476763345338, false],
    [11.6, 98, 19.8748985615028, 251.35476763345338, false],
    [11.4, 95, 26.8033159040496, 128.684186046626, true],
    [11.6, 91, 39.7190291544936, 251.35476763345338, false],
    [12.3, 90, 39.7190291544936, 251.35476763345338, false],
    [12.2, 98, 39.7190291544936, 57.882372980437616, true],
  ];
  seed.forEach((r) => rows.push({ p: r[0] as number, pout: r[1] as number, emf: r[2] as number, irms: r[3] as number, selected: r[4] as boolean }));
  for (let i = 0; i < 30; i++) {
    rows.push({ p: 12.2, pout: 90, emf: 39.7190291544936, irms: 251.35476763345338 });
  }
  return rows;
}

function genScatterPoints() {
  const pts: { x: number; y: number; hi?: boolean }[] = [];
  for (let i = 0; i < 90; i++) {
    const x = 22.5 + Math.random() * 18.5;
    const base = 220 * Math.exp(-(x - 22.5) * 0.13) + 40 + (Math.random() - 0.5) * 18;
    pts.push({ x: +x.toFixed(2), y: +base.toFixed(2) });
  }
  [
    { x: 29.5, y: 113 },
    { x: 33.2, y: 80 },
    { x: 36, y: 60 },
  ].forEach((p) => pts.push({ ...p, hi: true }));
  return pts;
}

type ResultView = "both" | "table" | "chart";

function OptimizationResults() {
  const [view, setView] = useState<ResultView>("both");
  const [rows] = useState<ResultRow[]>(() => genResultRows());
  const points = genScatterPoints();
  const normal = points.filter((p) => !p.hi);
  const highlighted = points.filter((p) => p.hi);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 text-[12px]">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            共计 <span className="font-semibold text-foreground">3,276</span> 条数据
          </span>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">刷新</button>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">显示形式</span>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ResultView)}
              className="rounded border border-border bg-background px-2 py-1 text-[12px] focus:border-primary focus:outline-none"
            >
              <option value="both">图表展示</option>
              <option value="table">仅表</option>
              <option value="chart">仅图</option>
            </select>
          </div>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">全部数据集 ▾</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">仅显示选中数据</button>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">仅显示目标距离数据</button>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">结果对比</button>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">筛选</button>
          <button className="rounded border border-border bg-background px-2 py-1 hover:bg-accent">排序</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {(view === "both" || view === "table") && (
          <div className={`overflow-auto ${view === "table" ? "flex-1" : "w-1/2 border-r border-border"}`}>
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-[var(--table-header)] text-muted-foreground">
                <tr>
                  <th className="w-8 border-b border-border px-2 py-2">
                    <input type="checkbox" className="accent-[var(--primary)]" />
                  </th>
                  {RESULT_COLS.map((c) => (
                    <th key={c.key} className="border-b border-border px-2 py-2 text-left font-medium">
                      {c.label} ⇅
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-b border-border ${r.selected ? "bg-primary/10" : "hover:bg-accent/50"}`}>
                    <td className="px-2 py-1.5">
                      <input type="checkbox" defaultChecked={r.selected} className="accent-[var(--primary)]" />
                    </td>
                    <td className="px-2 py-1.5">{r.p}</td>
                    <td className="px-2 py-1.5">{r.pout}</td>
                    <td className="px-2 py-1.5">{r.emf}</td>
                    <td className="px-2 py-1.5">{r.irms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(view === "both" || view === "chart") && (
          <div className={`flex flex-col ${view === "chart" ? "flex-1" : "w-1/2"}`}>
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">显示</span>
                <select className="rounded border border-border bg-background px-2 py-1">
                  <option>二维显示</option>
                  <option>三维显示</option>
                </select>
              </div>
              <span className="text-muted-foreground">坐标轴设置</span>
            </div>
            <div className="flex-1 p-4">
              <ScatterPlot normal={normal} highlighted={highlighted} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScatterPlot({
  normal,
  highlighted,
}: {
  normal: { x: number; y: number }[];
  highlighted: { x: number; y: number }[];
}) {
  const W = 560;
  const H = 380;
  const padL = 50;
  const padR = 30;
  const padT = 30;
  const padB = 40;
  const xMin = 22.53;
  const xMax = 41.04;
  const yMin = 46.9;
  const yMax = 210;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (y: number) => H - padB - ((y - yMin) / (yMax - yMin)) * (H - padT - padB);
  const yTicks = [46.9, 60, 90, 120, 150, 180, 210];
  const xTicks = [22.53, 24, 27, 30, 33, 36, 39, 41.04];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <text x={padL} y={padT - 10} className="fill-foreground" fontSize="12">
        电机线电流有效值
      </text>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} stroke="hsl(var(--border))" strokeDasharray="2 2" />
          <text x={padL - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" className="fill-muted-foreground">
            {t}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t} x={sx(t)} y={H - padB + 14} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          {t}
        </text>
      ))}
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="hsl(var(--border))" />
      <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="hsl(var(--border))" />
      <text x={W - padR} y={H - padB - 6} textAnchor="end" fontSize="11" className="fill-foreground">
        线反电势
      </text>
      {normal.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill="#60a5fa" opacity="0.85" />
      ))}
      {highlighted.map((p, i) => (
        <circle key={`h${i}`} cx={sx(p.x)} cy={sy(p.y)} r="5" fill="#ef4444" />
      ))}
    </svg>
  );
}

// ============================= AI Chat Panel =============================
type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  action?: { label: string; onClick: () => void };
};

function AIChatPanel({
  calcStatus,
  onStartDesign,
  onViewResults,
  onCreateProject,
  onClose,
}: {
  calcStatus: "idle" | "running" | "done";
  onStartDesign: () => void;
  onViewResults: () => void;
  onCreateProject: () => void;
  onClose?: () => void;
}) {
  const [input, setInput] = useState("");
  const [deepThink, setDeepThink] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recogRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text:
        "你好，我是 EasiMotor AI 设计助手 👋\n我可以帮你：\n• 创建新的优化设计项目\n• 配置变量/约束/目标\n• 开始优化计算\n• 查看计算结果\n\n试着对我说：\"开始设计\" 或 \"查看结果\"。",
    },
  ]);

  // auto-grow textarea up to 10 rows
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const cs = window.getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 20;
    const pY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const maxH = lh * 10 + pY;
    ta.style.height = "auto";
    const next = Math.min(ta.scrollHeight, maxH);
    ta.style.height = next + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }, [input]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", text };
    const reply = buildReply(text);
    setMessages((m) => [...m, userMsg, ...reply]);
  };

  const buildReply = (text: string): ChatMsg[] => {
    const t = text.toLowerCase();
    if (/(创建|新建|new).*?(项目|设计)|创建项目|新建项目/.test(text)) {
      onCreateProject();
      return [
        {
          role: "assistant",
          text:
            "已为你创建新的「优化设计」项目，左侧节点已切换到 新设计(优化分析)。\n下一步建议：检查变量/约束/目标后点击 开始设计。",
          action: { label: "开始设计", onClick: () => send("开始设计") },
        },
      ];
    }
    if (/开始|run|start|计算|优化/.test(text)) {
      onStartDesign();
      return [
        {
          role: "assistant",
          text: "正在提交优化任务到求解器，预计耗时约 4 秒…\n你可以稍后说 \"查看结果\" 打开结果面板。",
        },
      ];
    }
    if (/结果|result|查看/.test(text)) {
      onViewResults();
      return [
        {
          role: "assistant",
          text: "已为你打开结果面板，可在右侧切换 图/表/图表 视图查看 3276 组设计点。",
        },
      ];
    }
    if (/变量|约束|目标|参数/.test(text)) {
      return [
        {
          role: "assistant",
          text:
            "你可以在左侧节点选择 变量 / 约束 / 目标 进行编辑：\n• 变量：设置优化参数的上下限与精度\n• 约束：限制工况指标范围\n• 目标：定义需要最大化/最小化的输出",
        },
      ];
    }
    return [
      {
        role: "assistant",
        text:
          "我可以执行以下操作，点击下面的快捷指令试试：",
      },
    ];
  };

  const quick = [
    { label: "创建项目", q: "创建新的优化设计项目" },
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-cyan-100/30 via-sky-100/20 to-indigo-100/30 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/60">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-20 h-48 w-48 rounded-full bg-indigo-300/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-teal-300/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 px-4 pt-4">
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold tracking-tight text-foreground">AI 设计助手</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-medium text-emerald-700">Beta</span>
            </div>
            <div className="text-[11px] text-muted-foreground">对话驱动 · 优化设计</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <CalcStatusBadge status={calcStatus} />
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur hover:text-foreground"
              title="收起"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 space-y-4 overflow-auto px-4 py-3">
        {messages.map((m, i) => (
          <ChatBubble key={i} msg={m} />
        ))}
        {calcStatus === "running" && (
          <div className="ml-9 flex items-center gap-2 rounded-2xl bg-white/80 px-3.5 py-2 text-[12px] text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            正在执行优化计算…
          </div>
        )}
        {calcStatus === "done" && (
          <div className="ml-9 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-primary/10 to-emerald-100/60 px-3.5 py-2 text-[12px] shadow-sm ring-1 ring-primary/20">
            <span className="flex items-center gap-2 text-primary">
              <Check className="h-3.5 w-3.5" />
              计算完成
            </span>
            <button
              onClick={() => onViewResults()}
              className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow hover:opacity-90"
            >
              查看结果
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-10 px-4 pb-4 pt-2">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => send(q.q)}
              className="group flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-px hover:text-primary hover:ring-primary/30"
            >
              <Sparkles className="h-3 w-3 text-primary/70 transition group-hover:text-primary" />
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 focus-within:ring-primary/40 dark:bg-zinc-900">
          {recording ? (
            <VoiceRecorder
              transcript={liveTranscript}
              onCancel={() => {
                recogRef.current?.abort?.();
                recogRef.current?.stop?.();
                setLiveTranscript("");
                setRecording(false);
              }}
              onConfirm={() => {
                recogRef.current?.stop?.();
                const finalText = liveTranscript.trim();
                if (finalText) {
                  setInput((prev) => (prev ? prev + " " : "") + finalText);
                }
                setLiveTranscript("");
                setRecording(false);
                requestAnimationFrame(() => taRef.current?.focus());
              }}
            />
          ) : (
            <>
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="请提出您的问题"
                rows={1}
                className="w-full resize-none bg-transparent text-[13px] leading-[20px] outline-none placeholder:text-muted-foreground/70"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ModeChip
                    active={deepThink}
                    onClick={() => setDeepThink((v) => !v)}
                    icon={<Brain className="h-3 w-3" />}
                    label="深度思考"
                  />
                  <ModeChip
                    active={webSearch}
                    onClick={() => setWebSearch((v) => !v)}
                    icon={<Globe className="h-3 w-3" />}
                    label="联网搜索"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const SR: any =
                        (window as any).SpeechRecognition ||
                        (window as any).webkitSpeechRecognition;
                      if (!SR) {
                        toast.error("当前浏览器不支持语音输入");
                        return;
                      }
                      const r = new SR();
                      r.lang = "zh-CN";
                      r.continuous = true;
                      r.interimResults = true;
                      setLiveTranscript("");
                      r.onresult = (e: any) => {
                        let txt = "";
                        for (let i = 0; i < e.results.length; i++) {
                          txt += e.results[i][0].transcript;
                        }
                        setLiveTranscript(txt);
                      };
                      r.onend = () => setRecording(false);
                      r.onerror = () => setRecording(false);
                      recogRef.current = r;
                      try {
                        r.start();
                        setRecording(true);
                      } catch {
                        toast.error("无法启动语音识别");
                      }
                    }}
                    title="语音输入"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted/70 text-foreground transition hover:bg-primary/10 hover:text-primary"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => send()}
                    disabled={!input.trim()}
                    title="发送"
                    className={
                      "flex h-8 w-8 flex-none items-center justify-center rounded-full transition " +
                      (input.trim()
                        ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                        : "bg-muted text-muted-foreground/60 cursor-not-allowed")
                    }
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-2 text-center text-[10px] text-muted-foreground/70">
          按 Enter 发送 · Shift + Enter 换行
        </div>
      </div>
    </div>
  );
}

function VoiceRecorder({
  transcript,
  onCancel,
  onConfirm,
}: {
  transcript: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    const a = setInterval(() => setSeed((s) => s + 1), 120);
    return () => {
      clearInterval(t);
      clearInterval(a);
    };
  }, []);
  // pseudo-random bar heights animated by seed
  const bars = Array.from({ length: 36 }).map((_, i) => {
    const v = Math.abs(Math.sin((i + seed) * 0.7) * Math.cos((i - seed) * 0.31));
    return 6 + v * 22;
  });
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          正在录音
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{mm}:{ss}</span>
        <div className="ml-1 flex h-8 flex-1 items-center gap-[2px] overflow-hidden">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] flex-none rounded-full bg-primary/70 transition-all duration-100"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
      {transcript && (
        <div className="max-h-24 overflow-auto rounded-lg bg-primary/5 px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground/80 ring-1 ring-primary/15">
          {transcript}
        </div>
      )}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={onCancel}
          title="取消"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={onConfirm}
          title="确认"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition " +
        (active
          ? "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/20"
          : "bg-muted/60 text-muted-foreground ring-1 ring-transparent hover:bg-muted")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="flex flex-row-reverse items-end gap-2">
        <div className="flex max-w-[82%] flex-col items-end gap-1.5">
          <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-cyan-400/70 via-sky-400/60 to-indigo-400/70 px-3.5 py-2 text-[12.5px] leading-relaxed text-white shadow-md ring-1 ring-white/30 backdrop-blur-md">
            {msg.text}
          </div>
          {msg.action && (
            <button
              onClick={msg.action.onClick}
              className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-indigo-600 shadow-sm ring-1 ring-indigo-200/60 backdrop-blur hover:bg-white"
            >
              {msg.action.label} →
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <div className="flex max-w-[82%] flex-col gap-1.5">
        <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[12.5px] leading-relaxed text-foreground shadow-sm ring-1 ring-black/5 dark:bg-zinc-900">
          {msg.text}
        </div>
        {msg.action && (
          <button
            onClick={msg.action.onClick}
            className="self-start rounded-full bg-gradient-to-r from-primary to-emerald-500 px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:opacity-90"
          >
            {msg.action.label} →
          </button>
        )}
      </div>
    </div>
  );
}


function CalcStatusBadge({ status }: { status: "idle" | "running" | "done" }) {
  if (status === "idle")
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        待命
      </span>
    );
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" /> 计算中
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
      <Check className="h-3 w-3" /> 已完成
    </span>
  );
}
