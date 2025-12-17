import React, { useEffect, useState, useRef } from "react";
import SideMenu from "../layouts/SideMenu";

const STORAGE_KEY = "floorLayoutTables";

const defaultTable = () => ({
  id: crypto.randomUUID(),
  label: "",
  seats: 4,
  x: 10, // percentage (left)
  y: 10, // percentage (top)
  status: "free", // free | occupied | cleaning
  shape: "round", // round | square | bar | booth
  rotation: 0, // degrees
});

const statusStyles = {
  free: { bg: "bg-slate-800/80", text: "text-white", border: "border-white/10" },
  occupied: { bg: "bg-amber-500/80", text: "text-white", border: "border-amber-500/60" },
  cleaning: { bg: "bg-slate-400/80", text: "text-white", border: "border-slate-400/80" },
};

function useFloorTables() {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTables(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load tables", e);
    }
  }, []);

  const save = (next) => {
    setTables(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to persist tables", e);
    }
  };

  return { tables, setTables, save };
}

const TableIcon = ({ shape, size = 64, label }) => {
  if (shape === "bar") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="10" y="40" width="80" height="20" rx="6" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={18 + i * 18} y="25" width="12" height="10" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`b-${i}`} x={18 + i * 18} y="65" width="12" height="10" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        ))}
        {label && (
          <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="22" y="22" width="56" height="56" rx="8" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        {[{ x: 50, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 90 }, { x: 10, y: 50 }].map((p, i) => (
          <rect key={i} x={p.x - 8} y={p.y - 6} width="16" height="12" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" transform={`rotate(${i * 90}, ${p.x}, ${p.y})`} />
        ))}
        {label && (
          <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  if (shape === "booth") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="20" y="34" width="60" height="32" rx="8" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        <rect x="12" y="28" width="10" height="44" rx="4" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        <rect x="78" y="28" width="10" height="44" rx="4" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        {label && (
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  // round
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
      <circle cx="50" cy="50" r="26" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + Math.cos(rad) * 38;
        const cy = 50 + Math.sin(rad) * 38;
        return <circle key={i} cx={cx} cy={cy} r="7" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />;
      })}
      {label && (
        <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
          {label}
        </text>
      )}
    </svg>
  );
};

const palette = [
  { shape: "round", label: "עגול", seats: 4 },
  { shape: "square", label: "מרובע", seats: 4 },
  { shape: "bar", label: "דלפק", seats: 2 },
  { shape: "booth", label: "תא", seats: 6 },
];

const tableTopStyle = {
  background:
    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(0,0,0,0.05)), linear-gradient(135deg, #8b5a2b, #5c3619)",
  boxShadow: "inset 0 4px 12px rgba(0,0,0,0.35)",
};

export default function FloorLayout() {
  const { tables, setTables, save } = useFloorTables();
  const [draggingId, setDraggingId] = useState(null);
  const [dragged, setDragged] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editRotation, setEditRotation] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const canvasRef = useRef(null);

  const updatePos = (clientX, clientY) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  };

  const handleDragMove = (e) => {
    if (!draggingId) return;
    setDragged(true);
    const pos = updatePos(e.clientX, e.clientY);
    if (!pos) return;
    setTables((prev) => prev.map((t) => (t.id === draggingId ? { ...t, ...pos } : t)));
  };

  const handleDragEnd = () => {
    if (!draggingId) return;
    save(tables);
    setDraggingId(null);
    // avoid opening edit modal on click after drag
    setTimeout(() => setDragged(false), 0);
  };

  const handleDropNew = (e) => {
    e.preventDefault();
    const shape = e.dataTransfer.getData("shape");
    const seats = Number(e.dataTransfer.getData("seats")) || 4;
    if (!shape) return;
    const pos = updatePos(e.clientX, e.clientY);
    if (!pos) return;
    const newTable = { ...defaultTable(), ...pos, shape, seats };
    const next = [...tables, newTable];
    save(next);
    setEditId(newTable.id);
    setEditLabel(newTable.label);
    setEditRotation(newTable.rotation);
  };

  const openEdit = (table) => {
    setEditId(table.id);
    setEditLabel(table.label || "");
    setEditRotation(table.rotation || 0);
    setModalOpen(true);
  };

  const rotateTable = (id, delta = 45) => {
    save(
      tables.map((t) =>
        t.id === id
          ? {
              ...t,
              rotation: (((t.rotation || 0) + delta) % 360 + 360) % 360,
            }
          : t
      )
    );
  };

  const deleteTable = (id) => {
    save(tables.filter((t) => t.id !== id));
  };

  const saveEdit = () => {
    if (!editId) return;
    save(tables.map((t) => (t.id === editId ? { ...t, label: editLabel, rotation: Number(editRotation) || 0 } : t)));
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <div className="hidden md:block">
        <SideMenu />
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <SideMenu onClose={() => setMenuOpen(false)} />
        </div>
      )}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">עיצוב מפת שולחנות</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-400 hidden sm:block">גרירת שולחנות או נשירה מפלטה | שמירה מקומית</p>
              <button
                className="md:hidden inline-flex items-center px-3 py-2 rounded-lg bg-black text-white"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
              >
                ☰
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-1">
            <h3 className="text-lg font-semibold">הוראות</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>גררו אייקון שולחן לפלטה כדי להוסיף.</li>
              <li>לחיצה על שולחן תפתח חלון לעריכת המספר.</li>
              <li>גררו שולחנות על הפלטה להזזה (שמירה אוטומטית).</li>
            </ul>
            <div className="text-xs text-slate-400">* נתונים נשמרים מקומית בדפדפן לצורך הדגמה. חיבור לשרת יידרש לשימוש אמיתי.</div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {palette.map((p) => (
              <div
                key={p.shape}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("shape", p.shape);
                  e.dataTransfer.setData("seats", String(p.seats));
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-grab hover:border-emerald-400 transition"
                title="גרור למפה"
              >
                <div className="w-12 h-12 grid place-items-center">
                  <TableIcon shape={p.shape} size={48} />
                </div>
                <span>{p.label}</span>
                <span className="text-xs text-white/60">({p.seats})</span>
              </div>
            ))}
          </div>

          <div
            className="relative w-full rounded-2xl bg-slate-900 border border-white/10 overflow-hidden"
            style={{ minHeight: 480 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropNew}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            ref={canvasRef}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#1f2937_1px,transparent_0)] [background-size:36px_36px] opacity-40 pointer-events-none" />
            {tables.map((t) => {
              const style = statusStyles[t.status] || statusStyles.free;
              return (
                <div
                  key={t.id}
                  className="absolute"
                  style={{ left: `${t.x}%`, top: `${t.y}%`, transform: `translate(-50%, -50%)` }}
                >
                  <button
                    className={`relative border text-center text-sm font-semibold shadow ${style.bg} ${style.text} ${style.border} rounded-2xl w-28 h-28`}
                    style={{ transform: `rotate(${t.rotation || 0}deg)` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragged) return;
                      openEdit(t);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragged(false);
                      setDraggingId(t.id);
                    }}
                    title={`שולחן ${t.label}`}
                  >
                    <div className="pointer-events-none mx-auto w-full h-full grid place-items-center">
                      <TableIcon shape={t.shape} size={90} label={t.label || "?"} />
                    </div>
                    <div className="text-[11px] opacity-90">{t.seats} מקומות</div>
                    <div className="text-[10px] capitalize opacity-80">{t.status}</div>
                    <div className="absolute -right-3 -bottom-3 flex flex-col gap-1">
                      <button
                        className="rounded-full bg-black/70 text-white text-xs px-2 py-1 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateTable(t.id);
                        }}
                        aria-label="Rotate table"
                      >
                        ↻
                      </button>
                      <button
                        className="rounded-full bg-white/80 text-black text-xs px-2 py-1 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                        aria-label="Edit table"
                      >
                        ✎
                      </button>
                      <button
                        className="rounded-full bg-red-600 text-white text-xs px-2 py-1 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTable(t.id);
                        }}
                        aria-label="Delete table"
                      >
                        🗑
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold">עריכת מספר שולחן</h4>
            <input
              className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="מספר / שם"
            />
            <label className="block text-sm text-slate-300">
              סיבוב (מעלות)
              <input
                type="number"
                min="-180"
                max="180"
                step="5"
                className="mt-1 w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
                value={editRotation}
                onChange={(e) => setEditRotation(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10" onClick={() => setModalOpen(false)}>
                ביטול
              </button>
              <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit}>
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
