import { useState } from "react";
import api from "../api.js";
import { useFloor } from "../context/FloorContext.jsx";

const genId = () => Math.random().toString(36).slice(2, 9);

export default function AdminFloorEditor() {
  const { floor, setFloor } = useFloor();
  const [selected, setSelected] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // ---------- helpers ----------
  const addTable = (shape) => {
    if (!floor) return;
    const table = {
      id: genId(),
      name: `T${(floor.tables?.length || 0) + 1}`,
      seats: 4,
      x: 80,
      y: 80,
      w: 90,
      h: 60,
      r: 0,
      shape,
      status: "free",
    };
    setFloor({ ...floor, tables: [...(floor.tables || []), table] });
    setSelected(table.id);
  };

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const table = floor.tables.find((t) => t.id === id);
    const origX = table.x;
    const origY = table.y;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setFloor((f) => ({
        ...f,
        tables: f.tables.map((t) => (t.id === id ? { ...t, x: origX + dx, y: origY + dy } : t)),
      }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const save = async () => {
    try {
      setIsSaving(true);
      setError("");
      if (!floor?._id) {
        // No persisted floor yet — create it first (adjust route to your API)
        const { data } = await api.post(`/api/floors`, {
          ...floor,
          name: floor?.name || "Main Hall",
          width: floor?.width || 1200,
          height: floor?.height || 800,
        });
        setFloor(data);
        alert("Floor created");
      } else {
        await api.put(`/api/floors/${floor._id}`, floor);
        alert("Saved");
      }
    } catch (err) {
      console.error(err);
      setError("Save failed. Check server logs / route paths.");
    } finally {
      setIsSaving(false);
    }
  };

  const createSample = async () => {
    try {
      setIsSaving(true);
      setError("");
      // Quick dev helper if you implemented a seed route:
      // change to your real create route if you don't have /seed
      const { data } = await api.post(`/api/floors/seed`);
      setFloor(data);
      setSelected(null);
    } catch (err) {
      console.error(err);
      setError("Seed failed. Ensure /api/floors/seed exists.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTable = floor?.tables?.find((t) => t.id === selected);

  const updateSelected = (patch) => {
    if (!selected) return;
    setFloor((f) => ({
      ...f,
      tables: f.tables.map((t) => (t.id === selected ? { ...t, ...patch } : t)),
    }));
  };

  // ---------- UI ----------
  if (!floor) {
    // prettier loading + empty state
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-2">No floor loaded</h2>
          <p className="text-sm opacity-80 mb-4">
            It looks like the editor didn’t receive a floor. If you don’t yet have a floor in the database, create a sample one:
          </p>
          <div className="flex gap-3">
            <button onClick={createSample} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">
              Create Sample Floor
            </button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700">
              Retry
            </button>
          </div>
          {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 p-4">
      {/* Toolbar */}
      <div className="md:col-span-2 flex items-center gap-2 bg-slate-900 rounded-2xl p-3 sticky top-4 z-10">
        <div className="text-lg font-semibold">
          {floor.name || "Floor"} <span className="text-xs opacity-60">{floor._id ? `(#${floor._id.slice(-6)})` : "(unsaved)"}</span>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button onClick={() => addTable("rect")} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">
            + Rect
          </button>
          <button onClick={() => addTable("circle")} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">
            + Circle
          </button>
          <button onClick={save} disabled={isSaving} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60">
            {isSaving ? "Saving…" : floor?._id ? "Save" : "Create & Save"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-slate-900 rounded-2xl p-3 overflow-auto">
        <div className="text-xs opacity-70 mb-2">Tip: click a table to select; drag to move.</div>
        <svg
          width={floor.width || 1200}
          height={floor.height || 800}
          className="rounded-xl ring-1 ring-white/10"
          style={{ cursor: "move", backgroundColor: "#0b1220" }}
          onMouseDown={() => setSelected(null)}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Tables */}
          {floor.tables?.map((t) => {
            const isSel = selected === t.id;
            const common = {
              onMouseDown: (e) => handleMouseDown(e, t.id),
              onClick: (e) => {
                e.stopPropagation();
                setSelected(t.id);
              },
              className: `transition-[fill,stroke] ${isSel ? "fill-emerald-500/80 stroke-emerald-200" : "fill-white stroke-slate-300"}`,
              strokeWidth: 1.5,
            };

            if (t.shape === "rect") {
              return (
                <g key={t.id}>
                  <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={10} {...common} />
                  <text
                    x={t.x + t.w / 2}
                    y={t.y + t.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-slate-900 text-[12px] select-none"
                  >
                    {t.name}
                  </text>
                </g>
              );
            }

            // circle: keep x,y as TOP-LEFT in the data; render with cx,cy
            const cx = t.x + t.w / 2;
            const cy = t.y + t.h / 2;
            const r = Math.min(t.w, t.h) / 2;

            return (
              <g key={t.id}>
                <circle cx={cx} cy={cy} r={r} {...common} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[12px] select-none">
                  {t.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Properties panel */}
      <div className="bg-slate-900 rounded-2xl p-4 h-fit sticky top-4">
        <h3 className="font-semibold mb-3">Properties</h3>

        {!selectedTable && <div className="text-sm opacity-70">Select a table to edit…</div>}

        {selectedTable && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs opacity-70 mb-1">Name</label>
              <input
                className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                value={selectedTable.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs opacity-70 mb-1">Seats</label>
              <input
                type="number"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                value={selectedTable.seats}
                onChange={(e) => updateSelected({ seats: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs opacity-70 mb-1">Width</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                  value={selectedTable.w}
                  onChange={(e) => updateSelected({ w: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Height</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                  value={selectedTable.h}
                  onChange={(e) => updateSelected({ h: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs opacity-70 mb-1">Rotation (deg)</label>
              <input
                type="number"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                value={selectedTable.r}
                onChange={(e) => updateSelected({ r: Number(e.target.value) })}
              />
              <p className="text-[11px] opacity-60 mt-1">(rotation not applied in SVG yet—optional to add with a &lt;g transform&gt;)</p>
            </div>

            <div>
              <label className="block text-xs opacity-70 mb-1">Status</label>
              <select
                className="w-full bg-slate-800 rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
                value={selectedTable.status}
                onChange={(e) => updateSelected({ status: e.target.value })}
              >
                <option value="free">Free</option>
                <option value="occupied">Occupied</option>
                <option value="bill">Bill</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-rose-400">{error}</div>}
      </div>
    </div>
  );
}
