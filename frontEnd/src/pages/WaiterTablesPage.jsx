import { useSearchParams, Link } from "react-router-dom";
import { useContext } from "react";

import { FloorProvider, useFloor } from "../context/FloorContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";

function TableGrid() {
  const { floor } = useFloor();
  if (!floor) return <div>Loading...</div>;
  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {floor.tables.map((t) => (
        <Link key={t.id} to={`/waiter/order?table=${t.id}`} className="p-4 bg-gray-700 rounded">
          <div className="font-bold">{t.name}</div>
          <div className="text-sm capitalize">{t.status}</div>
        </Link>
      ))}
    </div>
  );
}

export default function WaiterTablesPage() {
  const [params] = useSearchParams();
  const { user } = useContext(AuthContext);
  if (!user?.isWaiter) return <div>Unauthorized</div>;
  const floorId = params.get("floorId");
  if (!floorId) return <div>No floorId</div>;
  return (
    <FloorProvider floorId={floorId}>
      <TableGrid />
    </FloorProvider>
  );
}
