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
} from "lucide-react";
import { magneticParamGroups } from "./magnetic-params";

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
interface Workload {
  id: string;
  name: string;
  type: WorkType;
  power: string;
  freq: string;
}

const variables = [
  { name: "ls(铁芯长度)", def: 120, lo: 100, hi: 126, prec: 1 },
  { name: "b0(b0)", def: 5, lo: 3, hi: 5.5, prec: 0.01 },
  { name: "airgapT(气隙)", def: 0.7, lo: 0.6, hi: 1, prec: 0.01 },
  { name: "magH(磁钢厚度)", def: 4.5, lo: 4, hi: 5, prec: 0.01 },
  { name: "magW(磁钢宽度)", def: 13, lo: 12, hi: 15, prec: 0.01 },
  { name: "spanAngle(磁钢张角)", def: 100, lo: 80, hi: 110, prec: 1 },
];

const availableParams = [
  "铁芯长度", "铁芯叠压系数", "定子材料名称", "定子槽数",
  "定子斜槽宽度(定子齿距)", "定子槽形", "平行齿", "齿宽",
  "定子槽尺寸b0", "定子槽尺寸b1", "定子槽尺寸b2", "定子槽尺寸r",
  "定子槽尺寸h0", "定子槽尺寸h1", "定子槽尺寸h2",
];

const targetParams = [
  { v: "线电压", p: "o_UL_1", expr: "UL", c: ">=0", dir: "接近于45" },
  { v: "效率", p: "o_Kef_1", expr: "Kef", c: ">=0", dir: "最大" },
  { v: "电机线电流有效值", p: "o_I_line_1", expr: "I_line", c: ">=0", dir: "无" },
  { v: "电机热负荷", p: "o_TLs_1", expr: "TLs", c: "<90e9", dir: "无" },
  { v: "铁芯损耗", p: "o_Pfe_1", expr: "Pfe", c: ">=0", dir: "无" },
  { v: "电机铜耗", p: "o_Pcu_1", expr: "Pcu", c: ">=0", dir: "无" },
  { v: "输出功率", p: "o_P2_1", expr: "P2", c: ">=0", dir: "无" },
  { v: "功率因数", p: "o_Kpf_1", expr: "Kpf", c: ">=0", dir: "无" },
  { v: "输出转矩", p: "o_M_output_1", expr: "M_output", c: ">=0", dir: "无" },
  { v: "同步转速", p: "o_n_sync_1", expr: "n_sync", c: ">=0", dir: "无" },
  { v: "线反电势", p: "o_Ulv_effh_line_1", expr: "Ulv_effh_line", c: ">=0", dir: "无" },
  { v: "电磁钢的价格", p: "o_Jsw_1", expr: "Jsw", c: ">=0", dir: "无" },
];

const initialWorkloads: Workload[] = [
  { id: "w1", name: "磁路法-场路耦合优化", type: "magnetic", power: "4.5", freq: "200" },
  { id: "w2", name: "有限元-额定工况", type: "fem", power: "4.5", freq: "200" },
];

function Index() {
  const [workloads, setWorkloads] = useState<Workload[]>(initialWorkloads);
  const [activeId, setActiveId] = useState("w1");
  const active = workloads.find((w) => w.id === activeId)!;
  const [search, setSearch] = useState("");

  const addWorkload = (type: WorkType) => {
    const id = `w${Date.now()}`;
    const name = type === "magnetic" ? "磁路法-新工况" : "有限元-新工况";
    setWorkloads([...workloads, { id, name, type, power: "4.5", freq: "200" }]);
    setActiveId(id);
  };

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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => addWorkload("magnetic")}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                        title="新增磁路法工况"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 p-2">
                    <Category label="磁路法工况" color="primary" onAdd={() => addWorkload("magnetic")}>
                      {magnetic.map((w) => (
                        <WorkloadItem key={w.id} w={w} active={w.id === activeId} onClick={() => setActiveId(w.id)} />
                      ))}
                      {magnetic.length === 0 && <Empty>暂无磁路法工况</Empty>}
                    </Category>
                    <Category label="有限元工况" color="fem" onAdd={() => addWorkload("fem")}>
                      {fem.map((w) => (
                        <WorkloadItem key={w.id} w={w} active={w.id === activeId} onClick={() => setActiveId(w.id)} />
                      ))}
                      {fem.length === 0 && <Empty>暂无有限元工况</Empty>}
                    </Category>
                  </div>
                </div>

                {/* Right details */}
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-[13px] font-medium">工况参数</div>
                    <Table head={["功率(kW)", "频率(Hz)"]} widths={["1fr", "1fr"]}>
                      <Row>
                        <Cell>{active.power}</Cell>
                        <Cell>{active.freq}</Cell>
                      </Row>
                    </Table>
                  </div>

                  <div>
                    <div className="mb-2 text-[13px] font-medium">工况优化目标</div>
                    <div className="grid grid-cols-[260px_1fr] gap-3">
                      <div className="rounded-md border border-border bg-card">
                        <div className="border-b border-border px-3 py-2 font-medium">
                          可用目标参数
                          {active.type === "magnetic" && (
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                              （按组分类）
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="搜索参数名称或ID..."
                              className="w-full rounded border border-input bg-background py-1.5 pl-7 pr-2 text-[12px] focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                            {active.type === "magnetic" ? (
                              <GroupedParams search={search} />
                            ) : (
                              availableParams
                                .filter((p) => p.includes(search))
                                .map((p) => (
                                  <button
                                    key={p}
                                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-left text-[12px] transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
                                  >
                                    {p}
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="font-medium">目标参数列表</span>
                          <IconBtn><Plus className="h-4 w-4" /></IconBtn>
                        </div>
                        <Table
                          head={["变量名称", "参数名称", "目标表达式", "约束", "优化方向", ""]}
                          widths={["1.4fr", "1.2fr", "1.4fr", "0.8fr", "1fr", "40px"]}
                        >
                          {targetParams.map((t) => (
                            <Row key={t.p}>
                              <Cell>{t.v}</Cell>
                              <Cell mono>{t.p}</Cell>
                              <Cell mono>{t.expr}</Cell>
                              <Cell mono>{t.c}</Cell>
                              <SelectCell value={t.dir} />
                              <DeleteCell />
                            </Row>
                          ))}
                        </Table>
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
  label, color, onAdd, children,
}: { label: string; color: "primary" | "fem"; onAdd: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const dot = color === "primary" ? "bg-primary" : "bg-[var(--fem)]";
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-1">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </button>
        <button onClick={onAdd} className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function WorkloadItem({ w, active, onClick }: { w: Workload; active: boolean; onClick: () => void }) {
  const tone =
    w.type === "magnetic"
      ? active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-border hover:border-primary/40 hover:bg-accent"
      : active
        ? "bg-[var(--fem)] text-white border-[var(--fem)]"
        : "border-border hover:border-[var(--fem)]/40 hover:bg-[var(--fem-bg)]";
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded border px-3 py-2 text-left text-[12px] transition-all ${tone}`}
    >
      <span className="truncate">{w.name}</span>
      <MoreHorizontal className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
    </button>
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
