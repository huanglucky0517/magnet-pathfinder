import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronsRight, Filter, ArrowUpDown, Search, LayoutGrid, List } from "lucide-react";

export const Route = createFileRoute("/motor-library")({
  head: () => ({
    meta: [
      { title: "标准电机库 — EasiMotor Online" },
      { name: "description", content: "标准电机型号库,按分类、极数、冷却方式、能效等级筛选" },
    ],
  }),
  component: MotorLibrary,
});

interface MotorRow {
  model: string;
  power: number;
  rpm: number;
  poles: number;
  diameter: number;
  cooling: string;
  efficiency: string;
}

const rows: MotorRow[] = [
  { model: "H280-8-1000rpm-110kw", power: 110, rpm: 1000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1000rpm-55kw", power: 55, rpm: 1000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1000rpm-75kw", power: 75, rpm: 1000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1000rpm-90kw", power: 90, rpm: 1000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1500rpm-110kw", power: 110, rpm: 1500, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1500rpm-132kw", power: 132, rpm: 1500, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1500rpm-160kw", power: 160, rpm: 1500, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1500rpm-75kw", power: 75, rpm: 1500, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-1500rpm-90kw", power: 90, rpm: 1500, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-3000rpm-132kw", power: 132, rpm: 3000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-3000rpm-160kw", power: 160, rpm: 3000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
  { model: "H280-8-3000rpm-200kw", power: 200, rpm: 3000, poles: 8, diameter: 445, cooling: "风冷", efficiency: "IE5" },
];

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <select className="h-7 rounded border border-border bg-background px-2 text-[12px] text-foreground">
        <option>全部</option>
      </select>
    </div>
  );
}

function MotorLibrary() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-border bg-card px-4 text-[13px]">
        <Link to="/" className="flex items-baseline gap-0.5">
          <span className="text-[15px] font-semibold text-primary">Easi</span>
          <span className="text-[15px] font-semibold text-foreground">Motor</span>
          <span className="ml-0.5 text-[9px] text-muted-foreground">Online</span>
        </Link>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Link to="/" className="hover:text-primary">首页</Link>
          <ChevronsRight className="h-3 w-3" />
          <span className="font-medium text-foreground">标准电机库</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <FilterSelect label="分类" />
            <FilterSelect label="极" />
            <FilterSelect label="冷却方式" />
            <FilterSelect label="能效等级" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="按照型号名称进行搜索"
                className="h-7 w-64 rounded border border-border bg-background pl-7 pr-2 text-[12px]"
              />
            </div>
            <button className="flex h-7 items-center gap-1 rounded border border-border px-2 text-[12px] hover:bg-accent">
              <Filter className="h-3.5 w-3.5" />筛选
            </button>
            <button className="flex h-7 items-center gap-1 rounded border border-border px-2 text-[12px] hover:bg-accent">
              <ArrowUpDown className="h-3.5 w-3.5" />排序
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded border border-primary bg-primary/10 text-primary">
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded border border-border">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted/60 text-foreground">
              <tr>
                {["型号", "额定功率(kW)", "额定转速(rpm)", "极数", "定子外径(mm)", "冷却方式", "能效等级"].map((h) => (
                  <th key={h} className="border-b border-border px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className="hover:bg-accent/40">
                  <td className="border-b border-border px-3 py-2">{r.model}</td>
                  <td className="border-b border-border px-3 py-2">{r.power}</td>
                  <td className="border-b border-border px-3 py-2">{r.rpm}</td>
                  <td className="border-b border-border px-3 py-2">{r.poles}</td>
                  <td className="border-b border-border px-3 py-2">{r.diameter}</td>
                  <td className="border-b border-border px-3 py-2">{r.cooling}</td>
                  <td className="border-b border-border px-3 py-2">{r.efficiency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-1">
            {["«", "‹", "1", "2", "3", "4", "5", "›", "»"].map((p, i) => (
              <button
                key={i}
                className={`h-6 min-w-6 rounded px-1.5 hover:bg-accent ${p === "1" ? "bg-primary text-primary-foreground" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
          <span>共 12 页</span>
          <span className="flex items-center gap-1">
            跳至第 <input className="h-6 w-10 rounded border border-border bg-background px-1 text-center" defaultValue={1} /> 页
          </span>
          <span>每页显示数量 30 ▾</span>
        </div>
      </div>
    </div>
  );
}
