import React from "react";

const Button = ({ title, href, onClick, children }) => {
  const classes =
    "px-6 py-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold flex justify-between items-center gap-4";

  if (href) {
    return (
      <a href={href} className={classes}>
        <span>{title}</span>
        {children && <span>{children}</span>}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      <span>{title}</span>
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;
