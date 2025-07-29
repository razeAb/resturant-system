import React, { useEffect, useState } from "react";
import SideMenu from "../layouts/SideMenu";
import ProductCard from "../layouts/AdminPorductCard"; // your styled card component
import api from "../api";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const ITEMS_PER_PAGE = 8;

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/products");
        setProducts(res.data);
      } catch (err) {
        setError("שגיאה בטעינת המוצרים");
      }
    };

    fetchProducts();
  }, []);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen font-['Inter'] bg-[#0f1015] text-white">
      {/* Sidebar */}
      <SideMenu />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 md:p-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold mb-6 text-white">מוצרים</h1>

        {/* Error Message */}
        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
          {currentItems.map((product) => (
            <ProductCard
              key={product._id}
              image={product.image}
              title={product.name}
              category={product.category}
              subcategory={product.subcategory || ""}
              onView={() => console.log("View", product._id)}
              onEdit={() => console.log("Edit", product._id)}
              onDelete={() => console.log("Delete", product._id)}
              onDuplicate={() => console.log("Duplicate", product._id)}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            className="bg-[#1f2937] px-4 py-2 rounded hover:bg-[#374151] transition disabled:opacity-30"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            <FaChevronLeft />
          </button>
          <span className="text-sm text-white">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <button
            className="bg-[#1f2937] px-4 py-2 rounded hover:bg-[#374151] transition disabled:opacity-30"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
