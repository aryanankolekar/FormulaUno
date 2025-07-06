import React from "react";

export default function HomePage() {
  return (
    <div
      className="f1-card"
      style={{ maxWidth: 700, margin: "2em auto", textAlign: "center" }}
    >
      <div className="f1-header">Welcome to FormulaUno</div>
      <div className="f1-line" />
      <p
        style={{
          fontSize: "1.2em",
          marginBottom: "1em",
          color: "#444",
        }}
      >
        Dive into F1 data, race results, driver stats, and more. Select a season
        and race to get started, or use the navigation bar to explore!
      </p>
      <p style={{ color: "#e10600", fontWeight: 600 }}>
        Fast. Insightful. Beautiful. Just like F1.
      </p>
    </div>
  );
}
