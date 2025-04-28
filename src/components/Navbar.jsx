import React, { useState, useEffect, useContext } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink } from "react-router-dom";
import { AiOutlineMenuUnfold, AiOutlineClose } from "react-icons/ai";
import Button from "../layouts/Button.jsx";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext.jsx";

const Navbar = () => {
  const [menu, setMenu] = useState(false);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { logout } = useContext(AuthContext);
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || ""); // Fallback if name not present
        setIsLoggedIn(true);
        setIsAdmin(user.isAdmin || false);
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
      }
    }
  }, []);

  const handleChange = () => {
    setMenu(!menu);
  };

  const closeMenu = () => {
    setMenu(false);
  };

  const handleLogout = () => {
    logout(); // <-- This will remove from localStorage + set user to null
    setIsLoggedIn(false);
    setUserName("");
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="fixed w-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.2)] z-50">
      <div className="flex flex-row justify-between p-5 md:px-32">
        <div className="flex items-center">
          <RouterLink to="/">
            <div className="flex items-center cursor-pointer">
              <img src="photos/logo1.jpg" alt="Icon" className="w-12 h-12" />
              <div className="flex flex-col ml-2">
                <h1 className="text-xl font-semibold">hungry</h1>
                {userName && <span className="text-sm text-gray-600"> {userName}</span>}
              </div>
            </div>
          </RouterLink>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-row items-center text-lg font-medium gap-8">
          <ScrollLink to="home" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            בית
          </ScrollLink>
          <RouterLink to="/about" className="hover:text-brightColor transition-all cursor-pointer">
            עלינו
          </RouterLink>
          <ScrollLink to="menu" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            תפריט
          </ScrollLink>
          <RouterLink to="/cart" className="hover:text-brightColor transition-all cursor-pointer">
            עגלה
          </RouterLink>
          {isAdmin && (
            <RouterLink to="/admin/dashboard" className="hover:text-brightColor transition-all cursor-pointer">
              Admin Dashboard
            </RouterLink>
          )}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
              Logout
            </button>
          ) : (
            <RouterLink to="/login">
              <Button title="Login" />
            </RouterLink>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          {menu ? (
            <AiOutlineClose size={25} onClick={handleChange} className="text-black" />
          ) : (
            <AiOutlineMenuUnfold size={25} onClick={handleChange} className="text-black" />
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`${
          menu ? "translate-x-0" : "-translate-x-full"
        } md:hidden flex flex-col absolute bg-black text-white left-0 top-20 font-semibold text-2xl text-center pt-8 pb-4 gap-8 w-full h-fit transition-transform duration-300`}
      >
        <ScrollLink
          to="home"
          spy={true}
          smooth={true}
          duration={500}
          onClick={closeMenu}
          className="hover:text-brightColor transition-all cursor-pointer"
        >
          בית
        </ScrollLink>
        <RouterLink to="/about" onClick={closeMenu} className="hover:text-brightColor transition-all cursor-pointer">
          עלינו
        </RouterLink>
        <ScrollLink
          to="menu"
          spy={true}
          smooth={true}
          duration={500}
          onClick={closeMenu}
          className="hover:text-brightColor transition-all cursor-pointer"
        >
          תפריט
        </ScrollLink>
        <RouterLink to="/cart" onClick={closeMenu} className="hover:text-brightColor transition-all cursor-pointer">
          עגלה
        </RouterLink>
        {isAdmin && (
          <RouterLink to="/admin/dashboard">
            <Button title="admin dashboard" />
          </RouterLink>
        )}
        {isLoggedIn ? (
          <button onClick={handleLogout} className="text-mid text-red-500 hover:underline">
            Logout
          </button>
        ) : (
          <RouterLink to="/login">
            <Button title="Login" />
          </RouterLink>
        )}
      </div>
    </div>
  );
};

export default Navbar;
