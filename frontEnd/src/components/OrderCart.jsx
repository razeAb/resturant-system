import { useMemo } from "react";

export default function OrderCart({ items, setItems, onSend, onFire }) {
  const groups = useMemo(() => {
    const g = {};
    items.forEach((it) => {
      g[it.course] = g[it.course] || [];
      g[it.course].push(it);
    });
    return g;
  }, [items]);

  const updateItem = (id, patch) => {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));

  return (
    <div className="p-4 w-full">
      {["starter", "main", "dessert", "drink"].map((course) => (
        <div key={course} className="mb-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold capitalize">{course}s</h3>
            <button onClick={() => onFire(course)} className="text-sm text-red-400">
              Fire {course}
            </button>
          </div>
          {(groups[course] || []).map((it) => (
            <div key={it.id} className="flex items-center space-x-2 mb-1">
              <span className="flex-1">{it.name}</span>
              <input
                type="number"
                className="w-16 text-black"
                value={it.qty}
                onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })}
              />
              <input className="flex-1 text-black" value={it.notes || ""} onChange={(e) => updateItem(it.id, { notes: e.target.value })} />
              <button onClick={() => removeItem(it.id)}>x</button>
            </div>
          ))}
        </div>
      ))}
      <button className="mt-4 bg-blue-500 px-4 py-2" onClick={onSend}>
        Send Order
      </button>
    </div>
  );
}
