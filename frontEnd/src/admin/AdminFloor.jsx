import React, { useEffect, useMemo, useRef, useState } from "react";
import SideMenu from "../layouts/SideMenu";
import { Menu, RotateCcw, Trash2, Grid, Plus, Edit2 } from "lucide-react";

const genId = () => Math.random().toString(36).slice(2, 9);

/* שולחנות עם PNG */
const TABLE_TEMPLATES = [
  { type: "round", seats: 4, label: "שולחן עגול", iconSrc: "/photos/roundTable.png" },
  { type: "square", seats: 4, label: "שולחן ריבועי", iconSrc: "/photos/table4.png" },
  { type: "rect", seats: 4, label: "שולחן מלבני", iconSrc: "/photos/table2.png" },
];

export default function AdminFloor() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /* קומות */
  const [floors, setFloors] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminFloors");
      if (saved) return JSON.parse(saved);
    }
    return [{ id: genId(), name: "קומה 1", tables: [] }];
  });
  const [activeFloorId, setActiveFloorId] = useState(() => floors[0].id);
  const activeIndex = floors.findIndex((f) => f.id === activeFloorId);
  const currentFloor = floors[activeIndex];

  /* גריד קבוע */
  const TILE = 32; // snap grid
  const GAP = 2;
  const SUBGRID = 16;
  const TABLE_PX = 96; // ✅ uniform table size on floor

  const floorRef = useRef(null);

  const tileBackground = useMemo(() => {
    const tileSize = 32; // גודל האריח
    const grout = "#ffffff"; // צבע הקווים (רובה)
    const tile = "#f2f2f2"; // צבע האריח עצמו

    return {
      backgroundImage: `
      linear-gradient(${grout} 1px, transparent 1px),
      linear-gradient(90deg, ${grout} 1px, transparent 1px)
    `,
      backgroundSize: `${tileSize}px ${tileSize}px`,
      backgroundColor: tile,
    };
  }, []);

  /* רצפת עץ */
  const wood = useMemo(
    () => ({
      base: "#7b5a3b",
      plankA: "#8c6946",
      plankB: "#7f5f42",
      seam: "rgba(26,20,16,.45)",
      grainLight: "rgba(255,255,255,.05)",
      grainDark: "rgba(0,0,0,.04)",
      vignette: "rgba(0,0,0,.18)",
    }),
    []
  );

  const noiseDataURI =
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
        <filter id='n'>
          <feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/>
          <feColorMatrix type='saturate' values='0'/>
          <feComponentTransfer><feFuncA type='table' tableValues='0 0 0 0 0 0 0.03 0.06 0.09 0.12'/></feComponentTransfer>
        </filter>
        <rect width='100%' height='100%' filter='url(#n)'/>
      </svg>`
    );

  const woodBackground = useMemo(() => {
    const plankWidth = 112;
    const seamW = 2;
    const jointW = 1;
    const jointLen = 220;
    const jointVar = 60;
    const minor = SUBGRID;
    const major = TILE;

    const minorLine = "rgba(255,255,255,0.03)";
    const majorLine = "rgba(255,255,255,0.06)";

    return {
      backgroundImage: [
        `linear-gradient(${wood.base}, ${wood.base})`,
        `repeating-linear-gradient(90deg, ${wood.plankA} 0 ${plankWidth}px, ${wood.plankB} ${plankWidth}px ${plankWidth * 2}px)`,
        `repeating-linear-gradient(90deg, transparent 0 ${plankWidth - seamW}px, ${wood.seam} ${plankWidth - seamW}px ${plankWidth}px)`,
        `repeating-linear-gradient(0deg, transparent 0 ${jointLen - jointW}px, ${wood.seam} ${
          jointLen - jointW
        }px ${jointLen}px, transparent ${jointLen}px ${jointLen + jointVar}px)`,
        `repeating-linear-gradient(0deg, transparent 0 ${jointLen - jointW}px, ${wood.seam} ${
          jointLen - jointW
        }px ${jointLen}px, transparent ${jointLen}px ${jointLen + jointVar}px)`,
        `repeating-linear-gradient(15deg, transparent 0 18px, ${wood.grainLight} 18px 20px)`,
        `repeating-linear-gradient(195deg, transparent 0 22px, ${wood.grainDark} 22px 24px)`,
        `radial-gradient(120% 120% at 50% 50%, transparent 55%, ${wood.vignette})`,
        `url("${noiseDataURI}")`,
        `repeating-linear-gradient(90deg, transparent 0 ${minor - 1}px, ${minorLine} ${minor - 1}px ${minor}px)`,
        `repeating-linear-gradient(0deg, transparent 0 ${minor - 1}px, ${minorLine} ${minor - 1}px ${minor}px)`,
        `repeating-linear-gradient(90deg, transparent 0 ${major - 1}px, ${majorLine} ${major - 1}px ${major}px)`,
        `repeating-linear-gradient(0deg, transparent 0 ${major - 1}px, ${majorLine} ${major - 1}px ${major}px)`,
      ].join(","),
      backgroundSize: [
        `100% 100%`,
        `${plankWidth * 2}px 100%`,
        `${plankWidth}px 100%`,
        `100% ${jointLen + jointVar}px`,
        `100% ${jointLen + jointVar}px`,
        `280px 280px`,
        `300px 300px`,
        `100% 100%`,
        `256px 256px`,
        `${minor}px ${minor}px`,
        `${minor}px ${minor}px`,
        `${major}px ${major}px`,
        `${major}px ${major}px`,
      ].join(","),
      backgroundPosition: [`0 0`, `0 0`, `0 0`, `0 0`, `${plankWidth}px 0`, `0 0`, `0 0`, `0 0`, `0 0`, `0 0`, `0 0`, `0 0`, `0 0`].join(
        ","
      ),
      backgroundBlendMode: "multiply, normal, normal, normal, normal, overlay, overlay, multiply, normal, normal, normal, normal, normal",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.35), inset 0 0 40px rgba(0,0,0,.25)",
      backgroundColor: wood.base,
    };
  }, [SUBGRID, TILE, wood, noiseDataURI]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminFloors", JSON.stringify(floors));
    }
  }, [floors]);

  /* פעולות */
  const addFloor = () => {
    const nextNumber = floors.length + 1;
    const newFloor = { id: genId(), name: `קומה ${nextNumber}`, tables: [] };
    setFloors((prev) => [...prev, newFloor]);
    setActiveFloorId(newFloor.id);
  };

  const renameFloor = (id) => {
    const name = window.prompt("שם חדש לקומה:", floors.find((f) => f.id === id)?.name || "");
    if (!name) return;
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  };

  const removeFloor = (id) => {
    if (floors.length === 1) return;
    setFloors((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (id === activeFloorId && updated.length) {
        setActiveFloorId(updated[0].id);
      }
      return updated.length ? updated : prev;
    });
  };

  const handleDragStart = (e, templ) => {
    e.dataTransfer.setData("application/json", JSON.stringify(templ));
    e.dataTransfer.effectAllowed = "copy";
  };

  const floorCoords = (clientX, clientY) => {
    const rect = floorRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const snap = (px) => Math.max(0, Math.round(px / TILE) * TILE);

  const onDropNew = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    const templ = JSON.parse(data);

    const { x, y } = floorCoords(e.clientX, e.clientY);
    const w = TABLE_PX;
    const h = TABLE_PX;

    const nx = snap(x - w / 2);
    const ny = snap(y - h / 2);

    setFloors((prev) =>
      prev.map((f) =>
        f.id === activeFloorId
          ? {
              ...f,
              tables: [
                ...f.tables,
                { id: genId(), type: templ.type, seats: templ.seats, x: nx, y: ny, w, h, r: 0, iconSrc: templ.iconSrc },
              ],
            }
          : f
      )
    );
  };

  const onTablePointerDown = (e, id) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const table = currentFloor.tables.find((t) => t.id === id);
    if (!table) return;

    const { x, y } = floorCoords(e.clientX, e.clientY);
    const offsetX = x - table.x;
    const offsetY = y - table.y;

    const move = (ev) => {
      const { x: cx, y: cy } = floorCoords(ev.clientX, ev.clientY);
      const nx = snap(cx - offsetX);
      const ny = snap(cy - offsetY);
      setFloors((prev) =>
        prev.map((f) => (f.id === activeFloorId ? { ...f, tables: f.tables.map((t) => (t.id === id ? { ...t, x: nx, y: ny } : t)) } : f))
      );
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const rotateTable = (id) => {
    setFloors((prev) =>
      prev.map((f) =>
        f.id === activeFloorId
          ? {
              ...f,
              tables: f.tables.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      r: (t.r + 90) % 360,
                    }
                  : t
              ),
            }
          : f
      )
    );
  };

  const removeTable = (id) => {
    setFloors((prev) => prev.map((f) => (f.id === activeFloorId ? { ...f, tables: f.tables.filter((t) => t.id !== id) } : f)));
  };

  /* UI */
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-white/5 transition"
              aria-label="פתח תפריט"
            >
              <Menu className="size-5 opacity-80" />
            </button>
            <h1 className="text-lg font-semibold">רצפת המסעדה</h1>
          </div>
          <div className="text-sm opacity-70">Admin · Floor Designer</div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4 p-4">
          {/* SIDEBAR */}
          <div className="hidden lg:block">
            <SideMenu brand="Hungry" />
          </div>

          {/* MAIN */}
          <main className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 mb-4">
              <div className="flex flex-wrap gap-2">
                {floors.map((f) => {
                  const isActive = f.id === activeFloorId;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFloorId(f.id)}
                      className={[
                        "px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition",
                        isActive
                          ? "bg-emerald-900/30 text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
                      ].join(" ")}
                      title="החלף קומה"
                    >
                      {f.name}
                      <Edit2
                        className="size-3.5 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          renameFloor(f.id);
                        }}
                        title="שינוי שם קומה"
                      />
                      {floors.length > 1 && (
                        <Trash2
                          className="size-3.5 opacity-60 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFloor(f.id);
                          }}
                          title="מחק קומה"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={addFloor}
                className="ml-auto inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm transition"
                title="הוסף קומה"
              >
                <Plus className="size-4" />
                הוסף קומה
              </button>
            </div>

            {/* Toolbar */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-white/70">
                  <Grid className="size-4" /> ספריית שולחנות (גרור לתוך הריבוע)
                </span>

                <div className="h-3 w-px bg-white/10 mx-1" />

                {TABLE_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t)}
                    className="flex flex-col items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs hover:bg-white/10 active:scale-[.98] transition"
                    title="גרור לתוך האזור הריבועי"
                  >
                    <div className="w-[96px] h-[96px] shrink-0 rounded-md overflow-hidden">
                      <img
                        src={t.iconSrc}
                        alt={t.label}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        style={{ display: "block" }}
                      />
                    </div>
                    <span className="mt-0.5 text-white/90">{t.label}</span>
                  </button>
                ))}

                <div className="ml-auto text-xs text-white/60">
                  אריח: {TILE}px | גרוט: {GAP}px | קומה: {currentFloor?.name}
                </div>
              </div>
            </div>

            {/* Floor */}
            <div
              ref={floorRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropNew}
              className="aspect-square w-full relative overflow-hidden rounded-2xl ring-1 ring-slate-800 shadow-xl"
              style={woodBackground}
            >
              {currentFloor?.tables.map((t) => (
                <div
                  key={t.id}
                  className="absolute group"
                  style={{
                    top: t.y,
                    left: t.x,
                    width: TABLE_PX,
                    height: TABLE_PX,
                    transform: `rotate(${t.r}deg)`,
                  }}
                >
                  <img
                    src={t.iconSrc}
                    alt="table"
                    draggable={false}
                    onPointerDown={(e) => onTablePointerDown(e, t.id)}
                    className="h-full w-full object-contain cursor-grab active:cursor-grabbing select-none"
                    style={{ userSelect: "none" }}
                  />

                  <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {t.type !== "round" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateTable(t.id);
                        }}
                        className="p-1 rounded-md bg-slate-800/90 hover:bg-slate-700"
                        title="סיבוב 90°"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTable(t.id);
                      }}
                      className="p-1 rounded-md bg-slate-800/90 hover:bg-slate-700"
                      title="מחק שולחן"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile SideMenu */}
      {isMenuOpen && (
        <>
          <button aria-label="סגור תפריט" onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden" />
          <div className="fixed inset-y-0 right-0 z-50 md:hidden">
            <SideMenu onClose={() => setIsMenuOpen(false)} brand="Hungry" />
          </div>
        </>
      )}
    </div>
  );
}
