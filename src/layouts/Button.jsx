import React from "react";

const Button = ({ title, href, onClick }) => {
  const classes =
    "px-6 py-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold";

  if (href) {
    return (
      <a href={href} className={classes}>
        {title}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {title}
    </button>
  );
};

export default Button;
