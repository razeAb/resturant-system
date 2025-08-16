import React from "react";

const WorkerDashboard = () => {
  const worker = JSON.parse(localStorage.getItem("worker") || "{}");
  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-2">Welcome {worker.username || ""}</h2>
      <p className="mb-2">Role: {worker.role}</p>
      {worker.shiftStart && <p>Shift started at {new Date(worker.shiftStart).toLocaleString()}</p>}
    </div>
  );
};

export default WorkerDashboard;
