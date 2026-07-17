function ShiftEditModal({ open, onClose, shift, onSave }) {
  const [mode, setMode] = useState("hours"); // 'hours' | 'detailed'
  const [hours, setHours] = useState(shift?.hours ?? 0);
  const [start, setStart] = useState(shift?.start ? new Date(shift.start).toISOString().slice(0, 16) : "");
  const [end, setEnd] = useState(shift?.end ? new Date(shift.end).toISOString().slice(0, 16) : "");
  const [breakMinutes, setBreakMinutes] = useState(shift?.breakMinutes ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shift) {
      setHours(shift.hours ?? 0);
      setStart(shift.start ? new Date(shift.start).toISOString().slice(0, 16) : "");
      setEnd(shift.end ? new Date(shift.end).toISOString().slice(0, 16) : "");
      setBreakMinutes(shift.breakMinutes ?? 0);
    }
  }, [shift]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "hours") {
        await onSave({ hours: Number(hours) });
      } else {
        await onSave({
          start: start ? new Date(start).toISOString() : undefined,
          end: end ? new Date(end).toISOString() : undefined,
          breakMinutes: Number(breakMinutes),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#17181d] border border-white/10 p-4">
        <h3 className="text-white text-base font-semibold mb-3">עדכון משמרת</h3>

        <div className="flex gap-2 mb-3">
          <button className={`px-3 py-1 rounded ${mode === "hours" ? "bg-emerald-600" : "bg-white/10"}`} onClick={() => setMode("hours")}>
            עדכון שעות ישיר
          </button>
          <button
            className={`px-3 py-1 rounded ${mode === "detailed" ? "bg-emerald-600" : "bg-white/10"}`}
            onClick={() => setMode("detailed")}
          >
            שינוי זמנים/הפסקה
          </button>
        </div>

        {mode === "hours" ? (
          <div className="space-y-2">
            <label className="block text-xs text-white/70">שעות (מספר עשרוני)</label>
            <input
              type="number"
              step="0.01"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-white/70">תחילת משמרת</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
            />
            <label className="block text-xs text-white/70 mt-2">סיום משמרת</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
            />
            <label className="block text-xs text-white/70 mt-2">דקות הפסקה</label>
            <input
              type="number"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
            />
            <p className="text-[11px] text-white/40">השרת יחישב שעות אוטומטית: (end-start) פחות breakMinutes.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/10">
            ביטול
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className={`px-3 py-2 rounded-xl ${saving ? "bg-emerald-700/60" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {saving ? "שומר…" : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
