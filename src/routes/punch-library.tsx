import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronsRight, Search, LayoutGrid, List } from "lucide-react";

export const Route = createFileRoute("/punch-library")({
  head: () => ({
    meta: [
      { title: "我的冲片库 — EasiMotor Online" },
      { name: "description", content: "我的冲片库,按名称、极数、磁极结构、冲片类型筛选" },
    ],
  }),
  component: PunchLibrary,
});

interface PunchItem {
  name: string;
  type: "完整冲片" | "仅定子" | "仅转子";
  img: string;
}

const items: PunchItem[] = [
  { name: "8极4.5kW内嵌式三相永磁同步电动机_优化设计_8冲片", type: "完整冲片", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop" },
  { name: "交流永磁同步电动机_Map计算_2冲片", type: "完整冲片", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop" },
  { name: "鼠笼式三相感应电机_32冲片", type: "完整冲片", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-foreground">{label}：</span>
      {children}
    </div>
  );
}

function PunchLibrary() {
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
          <span className="font-medium text-primary">我的冲片库</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Field label="通过名称搜索">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-[12px]" />
            </div>
          </Field>
          <Field label="极数">
            <select className="h-7 flex-1 rounded border border-border bg-background px-2 text-[12px]"><option>不限</option></select>
          </Field>
          <Field label="磁极结构">
            <select className="h-7 flex-1 rounded border border-border bg-background px-2 text-[12px]"><option>不限</option></select>
          </Field>
          <Field label="电机类型">
            <select className="h-7 flex-1 rounded border border-border bg-background px-2 text-[12px]"><option>不限</option></select>
          </Field>
          <Field label="冲片外径(mm)">
            <input className="h-7 w-20 rounded border border-border bg-background px-2 text-[12px]" />
            <span>—</span>
            <input className="h-7 w-20 rounded border border-border bg-background px-2 text-[12px]" />
          </Field>
          <Field label="冲片类型">
            <select className="h-7 flex-1 rounded border border-border bg-background px-2 text-[12px]">
              <option>全部</option>
              <option>完整冲片</option>
              <option>仅定子</option>
              <option>仅转子</option>
            </select>
          </Field>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-1">
            <button className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent">
              <List className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded border border-primary bg-primary/10 text-primary">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded border border-border p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {items.map((it) => (
              <div key={it.name} className="flex flex-col items-center rounded border border-border bg-card p-2 hover:border-primary">
                <div className="aspect-square w-full rounded bg-muted" />
                <div className="mt-2 line-clamp-2 text-center text-[12px] text-foreground">{it.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
