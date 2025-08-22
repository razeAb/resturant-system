import { createContext, useContext, useEffect, useState } from "react";
import api from "../api.js";
import socket from "../lib/socket";

const OrderContext = createContext();

export const OrderProvider = ({ tableId, children }) => {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!tableId) return;
    api.get(`/api/table-orders/active-by-table/${tableId}`).then((res) => setOrder(res.data));
    socket.emit("join_table", tableId);
    const handleOrder = ({ order }) => {
      if (order.tableId === tableId) setOrder(order);
    };
    socket.on("order_updated", handleOrder);
    return () => {
      socket.emit("leave_table", tableId);
      socket.off("order_updated", handleOrder);
    };
  }, [tableId]);

  const create = async (items) => {
    const res = await api.post("/api/table-orders", { tableId, items });
    setOrder(res.data);
  };

  const updateItems = async (items) => {
    if (!order) return;
    const res = await api.put(`/api/table-orders/${order._id}/items`, { items });
    setOrder(res.data);
  };

  const fireCourse = async (course) => {
    if (!order) return;
    const res = await api.put(`/api/table-orders/${order._id}/fire`, null, { params: { course } });
    setOrder(res.data);
  };

  return <OrderContext.Provider value={{ order, create, updateItems, fireCourse }}>{children}</OrderContext.Provider>;
};

export const useOrder = () => useContext(OrderContext);
