import React, { useEffect, useMemo, useState } from "react";
import { Menu, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { DEFAULT_MENU_OPTIONS, useMenuOptions } from "../context/MenuOptionsContext";

const SectionCard = ({ title, description, children, action }) => (
  <section className="bg-[#111824] border border-[#1f2a36] rounded-2xl p-4 sm:p-6">
    <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-xs text-white/60 mt-1">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ActionButton = ({ title, onClick, icon, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm disabled:opacity-60"
  >
    {icon}
    <span>{title}</span>
  </button>
);

export default function MenuOptionsAdmin() {
  const { vegetables, weightedAdditions, fixedAdditions, refresh, setOptions } = useMenuOptions();
  const [form, setForm] = useState(DEFAULT_MENU_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setForm({
      vegetables: vegetables || [],
      weightedAdditions: weightedAdditions || [],
      fixedAdditions: fixedAdditions || [],
    });
  }, [vegetables, weightedAdditions, fixedAdditions]);

  const handleArrayChange = (section, index, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleVegetableChange = (index, value) => {
    setForm((prev) => ({
      ...prev,
      vegetables: prev.vegetables.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addRow = (section) => {
    const emptyRow =
      section === "vegetables" ? "" : section === "fixedAdditions" ? { name: "", price: 0 } : { name: "", pricePer50: 0, pricePer100: 0 };
    setForm((prev) => ({ ...prev, [section]: [...prev[section], emptyRow] }));
  };

  const removeRow = (section, index) => {
    setForm((prev) => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        `/api/menu-options`,
        {
          vegetables: form.vegetables,
          weightedAdditions: form.weightedAdditions.map((item) => ({
            ...item,
            pricePer50: Number(item.pricePer50) || 0,
            pricePer100: Number(item.pricePer100) || 0,
          })),
          fixedAdditions: form.fixedAdditions.map((item) => ({ ...item, price: Number(item.price) || 0 })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const options = res.data?.options || form;
      setOptions(options);
      setStatus("הנתונים נשמרו בהצלחה");
      refresh();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "שמירת התוספות נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const totalItems = useMemo(() => {
    return (form.vegetables?.length || 0) + (form.fixedAdditions?.length || 0) + (form.weightedAdditions?.length || 0);
  }, [form]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f141c] text-white flex">
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} logoSrc="/developerTag.jpeg" brand="Hungry" />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 bg-[#11131a] border-b border-white/10">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="פתח תפריט"
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 className="text-[18px] font-bold tracking-tight">תוספות וסלטים</h1>
              <p className="text-[11px] text-[#8b93a7] mt-1">עריכת תוספות בתשלום, תוספות בגרמים וסלטים לצד המנה</p>
            </div>

            <div className="flex items-center gap-2">
              <ActionButton title="רענן" onClick={refresh} icon={<RefreshCcw size={16} />} />
              <ActionButton title={saving ? "שומר..." : "שמור"} onClick={handleSave} disabled={saving} icon={<Save size={16} />} />
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 pb-10 space-y-6">
          {(status || error) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                status ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
              }`}
            >
              {status || error}
            </div>
          )}

          <SectionCard
            title="סלטים וירקות"
            description="התוספות ללא עלות שמופיעות בטופס ההזמנה"
            action={<ActionButton title="הוסף ירק" icon={<Plus size={16} />} onClick={() => addRow("vegetables")} />}
          >
            <div className="space-y-3">
              {form.vegetables?.length === 0 && <div className="text-sm text-white/60">אין ירקות להציג.</div>}
              {form.vegetables?.map((veg, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    value={veg}
                    onChange={(e) => handleVegetableChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    placeholder="לדוגמה: 🥬 חסה"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow("vegetables", idx)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-rose-300"
                    aria-label="הסר"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="תוספות בגרמים"
            description="לחצני 50/100 גרם שמציגים מחיר שונה לכל אפשרות"
            action={<ActionButton title="הוסף בשר" icon={<Plus size={16} />} onClick={() => addRow("weightedAdditions")} />}
          >
            <div className="space-y-3">
              {form.weightedAdditions?.length === 0 && <div className="text-sm text-white/60">אין תוספות להציג.</div>}
              {form.weightedAdditions?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <input
                    value={item.name}
                    onChange={(e) => handleArrayChange("weightedAdditions", idx, "name", e.target.value)}
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    placeholder="🥩 שם התוספת"
                  />
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <span className="text-xs text-white/60 whitespace-nowrap">50 גרם</span>
                    <input
                      type="number"
                      value={item.pricePer50}
                      onChange={(e) => handleArrayChange("weightedAdditions", idx, "pricePer50", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <span className="text-xs text-white/60 whitespace-nowrap">100 גרם</span>
                    <input
                      type="number"
                      value={item.pricePer100}
                      onChange={(e) => handleArrayChange("weightedAdditions", idx, "pricePer100", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow("weightedAdditions", idx)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-rose-300"
                      aria-label="הסר"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="תוספות בתשלום"
            description="צ'קבוקסים/אפשרויות עם מחיר קבוע"
            action={<ActionButton title="הוסף תוספת" icon={<Plus size={16} />} onClick={() => addRow("fixedAdditions")} />}
          >
            <div className="space-y-3">
              {form.fixedAdditions?.length === 0 && <div className="text-sm text-white/60">אין תוספות להציג.</div>}
              {form.fixedAdditions?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <input
                    value={item.name}
                    onChange={(e) => handleArrayChange("fixedAdditions", idx, "name", e.target.value)}
                    className="sm:col-span-7 px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    placeholder="🧀 שם התוספת"
                  />
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <span className="text-xs text-white/60 whitespace-nowrap">מחיר (₪)</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleArrayChange("fixedAdditions", idx, "price", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f141c] border border-white/10 focus:border-emerald-400 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow("fixedAdditions", idx)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-rose-300"
                      aria-label="הסר"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="תקציר" description="מספר כולל של תוספות זמינות">
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-white/60">ירקות</div>
                <div className="text-lg font-bold">{form.vegetables?.length || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-white/60">תוספות בגרמים</div>
                <div className="text-lg font-bold">{form.weightedAdditions?.length || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-white/60">תוספות בתשלום</div>
                <div className="text-lg font-bold">{form.fixedAdditions?.length || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-white/60">סה"כ אפשרויות</div>
                <div className="text-lg font-bold">{totalItems}</div>
              </div>
            </div>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}
