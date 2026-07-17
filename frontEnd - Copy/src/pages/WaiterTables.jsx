import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "floorLayoutTables";

const statusStyles = {
  free: { bg: "bg-emerald-500/80", text: "text-white", border: "border-emerald-500/80" },
  occupied: { bg: "bg-amber-500/80", text: "text-white", border: "border-amber-500/80" },
  cleaning: { bg: "bg-slate-400/80", text: "text-white", border: "border-slate-400/80" },
};

const shapeClass = (shape) => {
  switch (shape) {
    case "square":
      return "w-20 h-20 rounded-xl";
    case "bar":
      return "w-28 h-12 rounded-lg";
    case "booth":
      return "w-24 h-16 rounded-2xl";
    default:
      return "w-20 h-20 rounded-full";
  }
};

export default function WaiterTables() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [guestCount, setGuestCount] = useState(2);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTables(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load tables", e);
    }
  }, []);

  const selectedTable = useMemo(() => tables.find((t) => t.id === selected), [tables, selected]);

  const startOrder = () => {
    if (!selectedTable) return;
    // placeholder: in real flow, redirect to order page with tableId & guest count
    alert(`Start order for table ${selectedTable.label} with ${guestCount} guests`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">שולחנות</h2>
            <p className="text-sm text-slate-400">בחר שולחן כדי לפתוח הזמנה</p>
          </div>
          <div className="relative w-full rounded-2xl bg-slate-900 border border-white/10 overflow-hidden" style={{ minHeight: 480 }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#1f2937_1px,transparent_0)] [background-size:36px_36px] opacity-40 pointer-events-none" />
            {tables.map((t) => {
              const style = statusStyles[t.status] || statusStyles.free;
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 border text-center text-sm font-semibold shadow ${style.bg} ${style.text} ${style.border} ${shapeClass(
                    t.shape
                  )} ${
                    isSelected ? "ring-2 ring-offset-2 ring-emerald-400 ring-offset-slate-900" : ""
                  }`}
                  style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  onClick={() => setSelected(t.id)}
                  title={`שולחן ${t.label}`}
                >
                  <div className="text-lg">{t.label || "?"}</div>
                  <div className="text-[11px] opacity-90">{t.seats} מקומות</div>
                  <div className="text-[10px] capitalize opacity-80">{t.status}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-4">
          <h3 className="text-lg font-semibold">פרטי שולחן</h3>
          {selectedTable ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-300">
                <div className="font-semibold text-lg">שולחן {selectedTable.label}</div>
                <div>{selectedTable.seats} מקומות</div>
                <div>סטטוס: {selectedTable.status}</div>
              </div>
              <label className="block text-sm text-slate-300">
                מספר סועדים
                <input
                  type="number"
                  min="1"
                  max={selectedTable.seats}
                  className="mt-1 w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                />
              </label>
              <button onClick={startOrder} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 font-semibold">
                פתיחת הזמנה
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">בחר שולחן כדי להתחיל</p>
          )}
          <div className="text-xs text-slate-500">* דמו: נתוני מיקומים נטענים מהדפדפן. חברו ל-API להזמנות אמיתיות.</div>
        </div>
      </div>
    </div>
  );
}
