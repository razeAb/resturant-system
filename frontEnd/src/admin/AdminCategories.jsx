import React, { useEffect, useState } from "react";
import axios from "axios";
import SideMenu from "../layouts/SideMenu";
import EditCategoryModal from "./modals/EditCategoryModal";
// import AddCategoryModal from "./modals/AddCategoryModal"; // Optional

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Optional

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    fetchCategories();
  }, []);

  const handleUpdate = (updated) => {
    setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  };

  if (!categories.length) return <div className="text-center text-slate-400 py-10">טוען קטגוריות...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {/* Mobile Menu Toggle */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>

      {/* Sidebar */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg">
            ❌
          </button>
        </div>
        <SideMenu />
      </div>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 p-5 overflow-x-auto text-right" dir="rtl">
        <h1 className="text-3xl font-bold mb-8 text-center">🗂️ ניהול קטגוריות</h1>

        {/* Add Category Button (future use) */}
        <div className="flex justify-end mb-6">
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold"
            // onClick={() => setIsAddModalOpen(true)}
          >
            ➕ הוסף קטגוריה
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat._id} className="bg-[#1f1f1f] rounded-xl shadow-lg p-5 space-y-4 hover:shadow-2xl transition-shadow duration-200">
              <h3 className="text-xl font-bold text-blue-400">🏷️ {cat.name}</h3>

              <div>
                <p className="text-sm font-semibold text-white mb-1">🥬 ירקות:</p>
                <p className="text-sm text-slate-300">
                  {cat.vegetables.length ? cat.vegetables.join(", ") : <span className="text-red-400">אין ירקות</span>}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-white mb-1">🧀 תוספות:</p>
                <p className="text-sm text-slate-300">
                  {cat.additions?.fixed?.length || 0} קבועות, {cat.additions?.grams?.length || 0} לפי גרם
                </p>
              </div>

              <button
                onClick={() => setSelectedCategory(cat)}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full font-bold"
              >
                ✏️ ערוך קטגוריה
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Edit Modal */}
      {selectedCategory && (
        <EditCategoryModal category={selectedCategory} onClose={() => setSelectedCategory(null)} onUpdate={handleUpdate} />
      )}

      {/* Optional: Add Modal */}
      {/* {isAddModalOpen && (
        <AddCategoryModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(newCategory) => setCategories([...categories, newCategory])}
        />
      )} */}
    </div>
  );
};

export default AdminCategories;
