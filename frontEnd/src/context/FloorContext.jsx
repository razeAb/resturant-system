import { createContext, useContext, useEffect, useState } from "react";
import api from "../api.js";
import socket from "../lib/socket";

const FloorContext = createContext();

export const FloorProvider = ({ floorId, children }) => {
  const [floor, setFloor] = useState(null);

  useEffect(() => {
    if (!floorId) return;
    api.get(`/api/floors/${floorId}`).then((res) => setFloor(res.data));
    socket.emit("join_floor", floorId);
    const handleTable = ({ floorId: fid, table }) => {
      if (fid !== floorId) return;
      setFloor((f) => ({ ...f, tables: f.tables.map((t) => (t.id === table.id ? table : t)) }));
    };
    const handleFloor = ({ floorId: fid }) => {
      if (fid === floorId) api.get(`/api/floors/${floorId}`).then((res) => setFloor(res.data));
    };
    socket.on("table_updated", handleTable);
    socket.on("floor_updated", handleFloor);
    return () => {
      socket.emit("leave_floor", floorId);
      socket.off("table_updated", handleTable);
      socket.off("floor_updated", handleFloor);
    };
  }, [floorId]);

  const updateTable = async (table) => {
    await api.put(`/api/floors/${floorId}/tables/${table.id}`, table);
  };

  return <FloorContext.Provider value={{ floor, setFloor, updateTable }}>{children}</FloorContext.Provider>;
};

export const useFloor = () => useContext(FloorContext);
