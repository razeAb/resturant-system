import { useEffect, useState } from "react";
import api from "../api.js";

export default function MenuBrowser({ onAdd }) {
  const [menu, setMenu] = useState({ categories: [], products: [] });

  useEffect(() => {
    api.get("/api/menu").then((res) => setMenu(res.data));
  }, []);

  return (
    <div className="p-4 overflow-y-auto">
      {menu.categories.map((cat) => (
        <div key={cat} className="mb-4">
          <h3 className="font-bold mb-2 capitalize">{cat}</h3>
          <div className="space-y-2">
            {menu.products
              .filter((p) => p.category === cat)
              .map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <button className="text-blue-400" onClick={() => onAdd(p)}>
                    Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
