import { useSearchParams } from "react-router-dom";
import { FloorProvider } from "../context/FloorContext.jsx";
import AdminFloorEditor from "../components/AdminFloorEditor.jsx";

export default function AdminFloorPage() {
  const [params] = useSearchParams();
  const floorId = params.get("floorId");
  if (!floorId) return <div>No floorId</div>;
  return (
    <FloorProvider floorId={floorId}>
      <AdminFloorEditor />
    </FloorProvider>
  );
}
