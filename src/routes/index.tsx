import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  Settings2,
  Sparkles,
  Pencil,
  Check,
  X,
  ChevronsRight,
  GripVertical,
} from "lucide-react";

import { magneticParamGroups } from "./magnetic-params";
import {
  femCurrentSourceParams,
  femVoltageSourceParams,
  type FemParam,
} from "./fem-params";

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
type FemSource = "current" | "voltage";

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

  const magnetic = workloads.filter((w) => w.type === "magnetic");
  const fem = workloads.filter((w) => w.type === "fem");

  return (
    <div className="flex h-screen flex-col bg-background text-foreground text-[13px]">
      <TopBar />
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftPane />
        <main className="flex flex-1 flex-col overflow-hidden border-l border-border">
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">优化设计</span>
          </div>
          <div className="flex-1 overflow-auto">
            {/* Section 1: 变量 */}
            <Section step="1" title="变量" subtitle="选择需要优化的参数" action={<IconBtn><Plus className="h-4 w-4" /></IconBtn>}>
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
                    ) : (
                      <Table head={["转速(rpm)", "电流(A)", "内功率因数角(degree)"]} widths={["1fr", "1fr", "1fr"]}>
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
                          <IconBtn><Plus className="h-4 w-4" /></IconBtn>
                        </div>
                        {active.targets.length === 0 ? (
                          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                            从左侧"可用目标参数"点击{" "}
                            <ChevronsRight className="inline h-3.5 w-3.5 align-text-bottom text-primary" />{" "}
                            添加到此处
                          </div>
                        ) : (
                          <Table
                            head={["变量名称", "参数名称", "目标表达式", "约束", "优化方向", ""]}
                            widths={["1.4fr", "1.2fr", "1.6fr", "0.8fr", "1fr", "40px"]}
                          >
                            {active.targets.map((t) => (
                              <Row key={t.p}>
                                <Cell>{t.v}</Cell>
                                <Cell mono>{t.p}</Cell>
                                {t.isPr ? (
                                  <PrExprCell
                                    order={t.prOrder ?? 2}
                                    freq={t.prFreq ?? 450}
                                    onChange={(o, f) => updatePrTarget(t.p, o, f)}
                                  />
                                ) : (
                                  <Cell mono>{t.expr}</Cell>
                                )}
                                <Cell mono>{t.c}</Cell>
                                <SelectCell value={t.dir} />
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

            {/* Section 4: 计算选项 */}
            <Section step="4" title="计算选项">
              <div className="flex items-center justify-end gap-2 py-1">
                <button className="rounded-md border border-primary bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  多目标遗传算法优化配置
                </button>
                <button className="rounded-md border border-primary bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  参数预览
                </button>
              </div>
            </Section>
          </div>
          <StatusBar />
        </main>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function TopBar() {
  const menus = ["项目", "案例", "编辑", "视图", "工具", "帮助", "冲片商店"];
  const right = ["购买", "产业链", "电机研习社", "消息", "黄燕", "中文"];
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-semibold text-primary">Easi</span>
            <span className="text-[15px] font-semibold text-foreground">Motor</span>
            <span className="ml-0.5 text-[9px] text-muted-foreground">Online</span>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-[13px]">
          {menus.map((m) => (
            <button key={m} className="text-foreground/80 transition-colors hover:text-primary">{m}</button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-[12px] text-foreground/80">
        <span className="rounded bg-destructive px-2 py-0.5 text-[11px] text-destructive-foreground">购买</span>
        {right.slice(1).map((r) => (
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
      <ToolButton label="多场耦合自动分析" />
      <ToolButton label="多场耦合自动分析产品库" />
    </div>
  );
}

function ToolButton({ label }: { label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded px-3 py-1 transition-colors hover:bg-accent">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
        <Settings2 className="h-4 w-4" />
      </div>
      <span className="text-[11px] text-foreground/80">{label}</span>
    </button>
  );
}

function LeftPane() {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-3 py-2 font-medium">项目</div>
      <div className="flex-1 overflow-auto py-1 text-[12px]">
        <Tree node={projectTree} />
      </div>
      <div className="border-t border-sidebar-border">
        <div className="px-3 py-2 font-medium">属性</div>
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
      </div>
    </aside>
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
                    { label: "新设计(优化分析)", active: true, badge: true, children: [{ label: "结果" }] },
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

function Tree({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  if (node.label === "root")
    return <>{node.children?.map((c, i) => <Tree key={i} node={c} depth={0} />)}</>;
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-1 py-[3px] pr-2 transition-colors hover:bg-sidebar-accent ${
          node.active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate">{node.label}</span>
        {node.badge && (
          <ChevronRight className="ml-1 h-3 w-3 shrink-0 rounded-full bg-primary text-primary-foreground" />
        )}
      </div>
      {hasChildren && open && node.children!.map((c, i) => <Tree key={i} node={c} depth={depth + 1} />)}
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
          <GripVertical
            className={`mr-1 h-3.5 w-3.5 shrink-0 cursor-grab active:cursor-grabbing ${active ? "text-current opacity-60 hover:opacity-100" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="拖动排序"
          />
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
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--fem)]" />
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
    <div className="rounded border border-[var(--fem)]/40 bg-[var(--fem-bg)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--fem)]/10"
        title="电磁力幅值 pr(空间阶次, 时间频率)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{desc}</span>
            <span className="rounded bg-[var(--fem)]/15 px-1 py-px text-[10px] font-normal text-[var(--fem)]">需配置</span>
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">pr(空间阶次, 时间频率)</div>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--fem)]" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--fem)]" />}
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
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
