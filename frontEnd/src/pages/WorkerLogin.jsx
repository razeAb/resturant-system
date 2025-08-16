import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const WorkerLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/workers/login", { username, password });
      localStorage.setItem("workerToken", res.data.token);
      localStorage.setItem("worker", JSON.stringify(res.data.worker));
      navigate("/worker/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold mb-6">Worker Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="bg-black text-white w-full py-2 rounded hover:bg-gray-800">
          Start Shift
        </button>
      </form>
    </div>
  );
};

export default WorkerLogin;
