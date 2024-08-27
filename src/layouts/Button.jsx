import React from "react";

const Button = ({ title, href, onClick }) => {
  return (
    <div>
      <a href={href} onClick={onClick}>
        <button className="px-6 py-1 border-2 border-brightColor text-brightColor hover:bg-brightColor hover:text-white transition-all rounded-full">
          {title}
        </button>
      </a>
    </div>
  );
};

export default Button;
