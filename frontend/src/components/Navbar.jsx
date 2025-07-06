import React from "react";
import { useLocation } from "react-router-dom";

const navStyle = {
  background: "#fff",
  borderBottom: "none",
  color: "#181818",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.5em 2em 0 2em",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  minHeight: "60px",
};

const logoStyle = {
  fontWeight: 700,
  fontSize: "1.7em",
  letterSpacing: "2px",
  color: "#e10600",
  textTransform: "uppercase",
  cursor: "pointer",
};

const linkBarStyle = {
  display: "flex",
  alignItems: "center",
  gap: "2em",
  height: "100%",
};

const linkStyle = {
  color: "#181818",
  fontWeight: 700,
  fontSize: "1.1em",
  textTransform: "uppercase",
  textDecoration: "none",
  padding: "0.5em 0",
  borderBottom: "3px solid transparent",
  cursor: "pointer",
  transition: "border-bottom 0.2s",
};

const activeLinkStyle = {
  borderBottom: "3px solid #e10600",
  color: "#e10600",
};

const Navbar = ({ onNavigate }) => {
  const location = useLocation();
  return (
    <nav style={navStyle}>
      <div onClick={() => onNavigate("/")} style={logoStyle}>
        FormulaUno
      </div>
      <div style={linkBarStyle}>
        <span
          style={{
            ...linkStyle,
            ...(location.pathname === "/" ? activeLinkStyle : {}),
          }}
          onClick={() => onNavigate("/")}
        >
          Home
        </span>
        <span
          style={{
            ...linkStyle,
            ...(location.pathname === "/races" ? activeLinkStyle : {}),
          }}
          onClick={() => onNavigate("/races")}
        >
          Races
        </span>
        <span
          style={{
            ...linkStyle,
            ...(location.pathname === "/drivers" ? activeLinkStyle : {}),
          }}
          onClick={() => onNavigate("/drivers")}
        >
          Drivers
        </span>
      </div>
    </nav>
  );
};

export default Navbar;
