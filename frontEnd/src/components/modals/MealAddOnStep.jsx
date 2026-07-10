import React from "react";
import { useLang } from "../../context/LangContext";

const resolveName = (item, lang) => (lang === "en" ? item.name_en || item.name || item.title : item.name || item.name_he || item.title);
const resolveImage = (item) => item.image || item.img || "/shopping-bag.png";
const getKey = (item) => item._id || item.id || item.name || item.title;

const MealAddOnStep = ({ title, subtitle, items = [], counts = {}, maxCount = 1, skipSelected = false, onChangeCount, onSkipSelect, onBack, onNext, nextLabel }) => {
  const { t, lang, dir } = useLang();
  const visibleItems = items.filter((item) => item?.isActive !== false);
  const selectedTotal = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const showCounters = maxCount > 1;

  const increment = (item) => {
    if (selectedTotal >= maxCount) return;
    const key = getKey(item);
    onChangeCount(key, (counts[key] || 0) + 1);
  };

  const decrement = (item) => {
    const key = getKey(item);
    onChangeCount(key, Math.max(0, (counts[key] || 0) - 1));
  };

  const selectSingle = (item) => {
    const key = getKey(item);
    const isSelected = counts[key] > 0;
    onChangeCount(key, isSelected ? 0 : 1, true);
  };

  const handleSkipSelect = () => {
    onSkipSelect();
  };

  return (
    <div dir={dir} className="px-2 sm:px-4 py-4">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
        {showCounters && (
          <div className="mt-3 text-sm font-semibold text-orange-600">
            {selectedTotal}/{maxCount}
          </div>
        )}
      </div>

      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const key = getKey(item);
            const count = counts[key] || 0;
            return (
              <div
                key={key}
                className={`flex gap-3 rounded-xl border bg-white p-3 shadow-sm ${
                  count > 0 ? "border-orange-400 ring-1 ring-orange-200" : "border-slate-200"
                }`}
              >
                <img src={resolveImage(item)} alt={resolveName(item, lang)} className="h-20 w-20 rounded-lg object-cover bg-slate-100" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{resolveName(item, lang)}</h3>
                  <div className="mt-1 text-sm font-bold text-orange-600">₪{Number(item.price) || 0}</div>

                  {showCounters ? (
                    <div className="mt-3 flex items-center justify-between rounded-full border border-slate-200 px-3 py-2">
                      <button type="button" onClick={() => decrement(item)} disabled={count === 0} className="text-xl font-bold text-slate-700 disabled:opacity-30">
                        −
                      </button>
                      <span className="text-sm font-bold text-slate-900">{count}</span>
                      <button
                        type="button"
                        onClick={() => increment(item)}
                        disabled={selectedTotal >= maxCount}
                        className="text-xl font-bold text-slate-700 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectSingle(item)}
                      className={`mt-3 w-full rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        count > 0
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                      }`}
                    >
                      {count > 0 ? t("modal.selected", "Selected") : t("modal.choose", "Choose")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {t("modal.noRecommendations", "No recommendations available right now.")}
        </div>
      )}

      <div className="sticky bottom-0 mt-5 bg-white pt-4 space-y-3">
        <button
          type="button"
          onClick={handleSkipSelect}
          className={`w-full rounded-full border px-6 py-3 text-base font-bold transition ${
            skipSelected ? "border-orange-500 bg-orange-500 text-white shadow-md" : "border-slate-300 text-slate-700 hover:border-orange-300"
          }`}
        >
          {t("modal.noThanks", "No thanks")}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onBack} className="rounded-full border border-slate-300 px-6 py-3 text-base font-bold text-slate-700">
            {t("modal.back", "Back")}
          </button>
          <button type="button" onClick={onNext} className="rounded-full bg-orange-500 px-6 py-3 text-base font-bold text-white shadow-md hover:bg-orange-600 transition">
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealAddOnStep;
