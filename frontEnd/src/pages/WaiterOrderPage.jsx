import { useSearchParams } from "react-router-dom";
import { OrderProvider, useOrder } from "../context/OrderContext.jsx";
import MenuBrowser from "../components/MenuBrowser.jsx";
import OrderCart from "../components/OrderCart.jsx";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

const courseMap = { starters: "starter", mains: "main", desserts: "dessert", drinks: "drink" };

function Screen() {
  const { order, create, updateItems, fireCourse } = useOrder();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (order) {
      setItems(order.items.map((it) => ({ ...it, id: Math.random().toString(36).slice(2, 9) })));
    }
  }, [order]);

  const handleAdd = (p) => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).slice(2, 9),
        productId: p.id,
        name: p.name,
        price: p.price,
        qty: 1,
        course: courseMap[p.category],
        notes: "",
        status: "queued",
      },
    ]);
  };

  const sendOrder = () => {
    const payload = items.map(({ id, ...rest }) => rest);
    if (order) updateItems(payload);
    else create(payload);
  };

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-gray-700">
        <MenuBrowser onAdd={handleAdd} />
      </div>
      <div className="w-1/2">
        <OrderCart items={items} setItems={setItems} onSend={sendOrder} onFire={fireCourse} />
      </div>
    </div>
  );
}

export default function WaiterOrderPage() {
  const [params] = useSearchParams();
  const { user } = useContext(AuthContext);
  if (!user?.isWaiter) return <div>Unauthorized</div>;
  const tableId = params.get("table");
  if (!tableId) return <div>No table</div>;
  return (
    <OrderProvider tableId={tableId}>
      <Screen />
    </OrderProvider>
  );
}
