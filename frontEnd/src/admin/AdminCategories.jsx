import React, { useEffect, useState } from "react";
import axios from "axios";
import SideMenu from "../layouts/SideMenu";
import EditCategoryModal from "./modals/EditCategoryModal";
import AddCategoryModal from "./modals/AddCategoryModal"; // ✅ Now imported

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // ✅ Now declared
  const [categoryToDelete, setCategoryToDelete] = useState(null); // category object
  const [deleteConfirmInput, setDeleteConfirmInput] = useState(""); // user input

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

  const handleAdd = (newCategory) => {
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const handleUpdate = (updated) => {
    setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  };

  if (!categories.length) return <div className="text-center text-slate-400 py-10">טוען קטגוריות...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {/* Sidebar */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>
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
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 p-5 overflow-x-auto text-right" dir="rtl">
        <h1 className="text-3xl font-bold mb-8 text-center">🗂️ ניהול קטגוריות</h1>

        <div className="flex justify-start mb-6">
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold"
            onClick={() => setIsAddModalOpen(true)}
          >
            ➕ הוסף קטגוריה
          </button>
        </div>

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
                <p className="text-sm font-semibold text-white mb-1">🧀 תוספות קבועות:</p>
                <p className="text-sm text-slate-300">
                  {cat.additions?.fixed?.length ? (
                    cat.additions.fixed.map((f) => f.name).join(", ")
                  ) : (
                    <span className="text-red-400">אין תוספות קבועות</span>
                  )}
                </p>
              </div>

              {/* Meat Additions */}
              <div>
                <p className="text-sm font-semibold text-white mb-1">🥩 תוספות בשר (לפי גרמים):</p>
                <p className="text-sm text-slate-300">
                  {cat.additions?.grams?.length ? (
                    cat.additions.grams.map((g) => g.name).join(", ")
                  ) : (
                    <span className="text-red-400">אין תוספות בשר</span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(cat)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full font-bold"
                >
                  ✏️ ערוך קטגוריה
                </button>
                <button
                  onClick={() => {
                    setCategoryToDelete(cat);
                    setDeleteConfirmInput("");
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded w-full font-bold"
                >
                  🗑️ מחק קטגוריה
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      {selectedCategory && (
        <EditCategoryModal category={selectedCategory} onClose={() => setSelectedCategory(null)} onUpdate={handleUpdate} />
      )}
      {isAddModalOpen && <AddCategoryModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAdd} />}
      {categoryToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
          onClick={() => setCategoryToDelete(null)}
        >
          <div className="bg-[#1f1f1f] rounded-xl p-6 w-full max-w-md text-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-center mb-4">🗑️ מחיקת קטגוריה</h2>
            <p className="mb-4 text-sm text-gray-300 text-right">
              הקטגוריה <span className="text-red-400 font-bold">"{categoryToDelete.name}"</span> תימחק לצמיתות.
              <br />
              הקלד את שם הקטגוריה לאישור:
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="הכנס את שם הקטגוריה"
              className="w-full px-4 py-2 mb-4 rounded bg-[#2a2a2a] border border-white/20"
            />
            <div className="flex justify-between">
              <button onClick={() => setCategoryToDelete(null)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">
                ביטול
              </button>
              <button
                disabled={deleteConfirmInput !== categoryToDelete.name}
                onClick={async () => {
                  await handleDelete(categoryToDelete._id);
                  setCategoryToDelete(null);
                }}
                className={`px-4 py-2 rounded text-white font-bold ${
                  deleteConfirmInput === categoryToDelete.name ? "bg-red-500 hover:bg-red-600" : "bg-red-300 cursor-not-allowed"
                }`}
              >
                מחק לצמיתות
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
