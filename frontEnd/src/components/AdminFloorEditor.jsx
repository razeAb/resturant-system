import { useState } from "react";
import api from "../api.js";
import { useFloor } from "../context/FloorContext.jsx";

const genId = () => Math.random().toString(36).slice(2, 9);

export default function AdminFloorEditor() {
  const { floor, setFloor } = useFloor();
  const [selected, setSelected] = useState(null);

  if (!floor) return <div>Loading...</div>;

  const addTable = (shape) => {
    const table = { id: genId(), name: "Table", seats: 4, x: 50, y: 50, w: 80, h: 80, r: 0, shape, status: "free" };
    setFloor({ ...floor, tables: [...floor.tables, table] });
  };

  const handleMouseDown = (e, id) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const table = floor.tables.find((t) => t.id === id);
    const origX = table.x;
    const origY = table.y;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setFloor((f) => ({ ...f, tables: f.tables.map((t) => (t.id === id ? { ...t, x: origX + dx, y: origY + dy } : t)) }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const save = async () => {
    await api.put(`/api/floors/${floor._id}`, floor);
    alert("Saved");
  };

  const selectedTable = floor.tables.find((t) => t.id === selected);

  const updateSelected = (patch) => {
    setFloor((f) => ({ ...f, tables: f.tables.map((t) => (t.id === selected ? { ...t, ...patch } : t)) }));
  };

  return (
    <div className="flex">
      <div className="flex-1">
        <div className="mb-2 space-x-2">
          <button onClick={() => addTable("rect")}>Add Rect</button>
          <button onClick={() => addTable("circle")}>Add Circle</button>
          <button onClick={save}>Save</button>
        </div>
        <svg width={floor.width || 800} height={floor.height || 600} className="bg-gray-800" style={{ cursor: "move" }}>
          {floor.tables.map((t) =>
            t.shape === "rect" ? (
              <rect
                key={t.id}
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                fill={selected === t.id ? "#4ade80" : "#fff"}
                onMouseDown={(e) => handleMouseDown(e, t.id)}
                onClick={() => setSelected(t.id)}
              />
            ) : (
              <circle
                key={t.id}
                cx={t.x}
                cy={t.y}
                r={t.w / 2}
                fill={selected === t.id ? "#4ade80" : "#fff"}
                onMouseDown={(e) => handleMouseDown(e, t.id)}
                onClick={() => setSelected(t.id)}
              />
            )
          )}
        </svg>
      </div>
      {selectedTable && (
        <div className="w-64 p-4">
          <h3 className="font-bold mb-2">Properties</h3>
          <div className="mb-2">
            <label>Name</label>
            <input className="w-full" value={selectedTable.name} onChange={(e) => updateSelected({ name: e.target.value })} />
          </div>
          <div className="mb-2">
            <label>Seats</label>
            <input
              type="number"
              className="w-full"
              value={selectedTable.seats}
              onChange={(e) => updateSelected({ seats: Number(e.target.value) })}
            />
          </div>
          <div className="mb-2">
            <label>Rotation</label>
            <input
              type="number"
              className="w-full"
              value={selectedTable.r}
              onChange={(e) => updateSelected({ r: Number(e.target.value) })}
            />
          </div>
          <div className="mb-2">
            <label>Status</label>
            <select className="w-full" value={selectedTable.status} onChange={(e) => updateSelected({ status: e.target.value })}>
              <option value="free">Free</option>
              <option value="occupied">Occupied</option>
              <option value="bill">Bill</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
