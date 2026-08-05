import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, PanelRightClose, PanelRightOpen, Cpu } from "lucide-react";
import modelAsset from "@/assets/motor-cross-section.png.asset.json";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** 模型图展示分栏：可收缩/展开，支持滚轮缩放与拖拽平移 */
export function ModelViewPanel({ onCollapse }: { onCollapse: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const state = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  state.current = { zoom, offset };

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = state.current;
    const nz = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const k = nz / z;
    setZoom(nz);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  // 非被动 wheel 监听，避免页面滚动
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(
        state.current.zoom * Math.exp(-dy * 0.0015),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const drag = useRef<{ on: boolean; sx: number; sy: number; ox: number; oy: number }>({
    on: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.on) return;
      setOffset({
        x: drag.current.ox + (e.clientX - drag.current.sx),
        y: drag.current.oy + (e.clientY - drag.current.sy),
      });
    };
    const onUp = () => {
      drag.current.on = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const centerZoom = (factor: number) => {
    const el = wrapRef.current;
    if (!el) return;
    zoomAt(state.current.zoom * factor, el.clientWidth / 2, el.clientHeight / 2);
  };

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-[12px] font-medium">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          模型图
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn label="放大" onClick={() => centerZoom(1.2)}>
            <ZoomIn className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="缩小" onClick={() => centerZoom(1 / 1.2)}>
            <ZoomOut className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="适应窗口" onClick={reset}>
            <Maximize2 className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="收起模型图" onClick={onCollapse}>
            <PanelRightClose className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <div
        ref={wrapRef}
        onMouseDown={(e) => {
          drag.current = {
            on: true,
            sx: e.clientX,
            sy: e.clientY,
            ox: offset.x,
            oy: offset.y,
          };
        }}
        className="relative flex-1 cursor-grab overflow-hidden bg-white active:cursor-grabbing"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--primary) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src={modelAsset.url}
            alt="电机截面模型图"
            draggable={false}
            className="max-h-full max-w-full select-none object-contain p-6"
          />
        </div>

        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-2.5 py-0.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          {Math.round(zoom * 100)}% · 滚轮缩放 / 拖拽平移
        </div>
      </div>
    </aside>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** 收起状态下的竖向拉手 */
export function ModelViewRail({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      onClick={onExpand}
      title="展开模型图"
      className="flex h-full w-9 shrink-0 flex-col items-center gap-2 border-l border-border bg-card py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
    >
      <PanelRightOpen className="h-4 w-4" />
      <span className="text-[11px] [writing-mode:vertical-rl]">模型图</span>
    </button>
  );
}
