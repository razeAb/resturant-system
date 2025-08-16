import React, { useEffect, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";

const ManageWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "cook",
  });
  const [message, setMessage] = useState("");

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/api/workers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkers(res.data.workers || []);
    } catch (err) {
      console.error("Error fetching workers", err);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      await api.post("/api/workers", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormData({ username: "", password: "", role: "cook" });
      setMessage("Worker added successfully");
      fetchWorkers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error adding worker");
    }
  };

  return (
    <div className="flex">
      <SideMenu />
      <div className="p-4 max-w-xl w-full">
        <h2 className="text-2xl font-semibold mb-4">Manage Workers</h2>
        {message && <p className="mb-4 text-red-500">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
          className="w-full p-2 border border-gray-300 rounded"
          required
        />
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full p-2 border border-gray-300 rounded"
          required
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="cook">Cook</option>
          <option value="waiter">Waiter</option>
          <option value="dishwasher">Dishwasher</option>
        </select>
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded w-full"
          >
            Add Worker
          </button>
        </form>

        <ul className="space-y-2">
          {workers.map((w) => (
            <li key={w._id} className="border p-2 rounded flex justify-between">
              <span>
                {w.username} - {w.role}
              </span>
              {w.onShift && <span className="text-green-600">On shift</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManageWorkers;