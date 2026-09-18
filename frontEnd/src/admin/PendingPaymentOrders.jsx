import React, { useEffect, useState } from "react";
import api from "../api";

// A card charge can succeed at Tranzila while the webhook that confirms it here never
// arrives (network blip, gateway misconfiguration, a field Tranzila didn't echo back).
// Those orders stay in "pending_payment" and /active deliberately hides them since their
// payment isn't confirmed - which otherwise makes a charged order invisible anywhere in
// the admin UI. This panel surfaces them so staff can cross-check against Tranzila and
// manually confirm the ones that really were paid.
export default function PendingPaymentOrders() {
  const [orders, setOrders] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);

  const fetchPending = async () => {
    try {
      const res = await api.get("/api/orders/pending-payment");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Failed to fetch pending-payment orders:", err?.message || err);
    }
  };

  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, 15000);
    return () => clearInterval(id);
  }, []);

  const markAsPaid = async (orderId) => {
    if (!window.confirm("לאשר שהתשלום התקבל בטרנזילה ולהעביר את ההזמנה להזמנות פעילות?")) return;
    setConfirmingId(orderId);
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: "paid" });
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      console.error("❌ Failed to confirm pending-payment order:", err?.message || err);
      alert("שגיאה באישור ההזמנה");
    } finally {
      setConfirmingId(null);
    }
  };

  if (orders.length === 0) return null;

  return (
    <div className="px-4 md:px-6 mt-4">
      <div className="rounded-2xl overflow-hidden shadow-lg border border-amber-500/40 bg-amber-500/10">
        <div className="px-4 py-3 border-b border-amber-500/30">
          <h2 className="text-sm font-semibold text-amber-300">
            ⚠️ הזמנות ממתינות לאישור תשלום ({orders.length})
          </h2>
          <p className="text-amber-200/70 text-xs mt-0.5">
            ייתכן שהתשלום בוצע בטרנזילה אך ההזמנה לא אושרה אוטומטית - בדקו מול טרנזילה לפני אישור ידני.
          </p>
        </div>
        <div className="divide-y divide-white/10">
          {orders.map((order) => {
            const customer = order.user?.name || order.customerName || "אורח";
            const phone = order.user?.phone || order.phone || "";
            return (
              <div key={order._id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="text-sm text-white/80">
                  <span className="text-white/50">#{order._id.slice(-6)}</span>{" "}
                  <span className="mx-1">·</span>
                  {new Date(order.createdAt).toLocaleString("he-IL")}
                  <span className="mx-1">·</span>
                  {customer}
                  {phone && <span className="text-white/40"> ({phone})</span>}
                  <span className="mx-1">·</span>
                  {order.totalPrice ? `₪${order.totalPrice}` : "-"}
                </div>
                <button
                  onClick={() => markAsPaid(order._id)}
                  disabled={confirmingId === order._id}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50"
                >
                  {confirmingId === order._id ? "מאשר..." : "אישור תשלום ידני"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
