import React, { useState } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink } from "react-router-dom";
import { AiOutlineMenuUnfold, AiOutlineClose } from "react-icons/ai";
import Button from "../layouts/Button.jsx";

const Navbar = () => {
  const [menu, setMenu] = useState(false);

  const handleChange = () => {
    setMenu(!menu);
  };

  const closeMenu = () => {
    setMenu(false);
  };

  return (
    <div className="fixed w-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.2)] z-50">
      <div className="flex flex-row justify-between p-5 md:px-32">
        <div className="flex items-center">
          <RouterLink to="/">
            <div className="flex items-center cursor-pointer">
              <img src="photos/logo1.jpg" alt="Icon" className="w-12 h-12" />
              <h1 className="text-xl font-semibold ml-2">hungry</h1>
            </div>
          </RouterLink>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-row items-center text-lg font-medium gap-8">
          <ScrollLink to="home" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            בית
          </ScrollLink>
          <RouterLink to="/about" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            עלינו
          </RouterLink>
          <ScrollLink to="menu" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            תפריט
          </ScrollLink>
          {/* Use Router Link for the Cart Page */}
          <RouterLink to="/cart" className="hover:text-brightColor transition-all cursor-pointer">
            עגלה
          </RouterLink>
          <RouterLink to="/login">
            <Button title="Login" />
          </RouterLink>
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
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          בית
        </ScrollLink>
        <RouterLink
          to="/about"
          spy={true}
          smooth={true}
          duration={500}
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          עלינו
        </RouterLink>
        <ScrollLink
          to="menu"
          spy={true}
          smooth={true}
          duration={500}
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          תפריט
        </ScrollLink>
        {/* Cart Link for Mobile */}
        <RouterLink to="/cart" className="hover:text-brightColor transition-all cursor-pointer" onClick={closeMenu}>
          עגלה
        </RouterLink>
        <RouterLink to="/login">
          <Button title="Login" />
        </RouterLink>{" "}
      </div>
    </div>
  );
};

export default Navbar;
