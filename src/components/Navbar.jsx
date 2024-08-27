import React, { useState } from "react";
import { Link } from "react-scroll";
import { IoFastFoodOutline } from "react-icons/io5";
import Button from "../layouts/Button.jsx";
import { AiOutlineMenuUnfold, AiOutlineClose } from "react-icons/ai";
import { BiChevronDown } from "react-icons/bi";

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
          <img src="photos/logo1.jpg" alt="Icon" className="w-12 h-12" />
          {/* <IoFastFoodOutline size={32} /> */}
          <h1 className="text-xl font-semibold ml-2">hungry</h1>
        </div>
        <nav className="hidden md:flex flex-row items-center text-lg font-medium gap-8">
          <Link to="home" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            בית
          </Link>
          <Link to="about" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            עלינו
          </Link>
          <Link to="menu" spy={true} smooth={true} duration={500} className="hover:text-brightColor transition-all cursor-pointer">
            תפריט
          </Link>
          <Button title="Login" />
        </nav>
        <div className="md:hidden flex items-center">
          {menu ? (
            <AiOutlineClose size={25} onClick={handleChange} className="text-black" />
          ) : (
            <AiOutlineMenuUnfold size={25} onClick={handleChange} className="text-black" />
          )}
        </div>
      </div>

      <div
        className={`${
          menu ? "translate-x-0" : "-translate-x-full"
        } md:hidden flex flex-col absolute bg-black text-white left-0 top-20 font-semibold text-2xl text-center pt-8 pb-4 gap-8 w-full h-fit transition-transform duration-300`}
      >
        <Link
          to="home"
          spy={true}
          smooth={true}
          duration={500}
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          בית
        </Link>

        {/* <BiChevronDown className=" cursor-pointer" size={25} /> */}

        <Link
          to="about"
          spy={true}
          smooth={true}
          duration={500}
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          עלינו
        </Link>
        <Link
          to="menu"
          spy={true}
          smooth={true}
          duration={500}
          className="hover:text-brightColor transition-all cursor-pointer"
          onClick={closeMenu}
        >
          תפריט
        </Link>

        <Button title="Login" />
      </div>
    </div>
  );
};

export default Navbar;
