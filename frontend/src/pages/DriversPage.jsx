import React from "react";

export default function DriversPage({ selectedDrivers, setSelectedDrivers }) {
  return (
    <div
      className="f1-card"
      style={{ maxWidth: 700, margin: "2em auto", textAlign: "center" }}
    >
      <div className="f1-header">Drivers</div>
      <div className="f1-line" />
      <p style={{ fontSize: "1.1em", marginBottom: "1em", color: "#444" }}>
        Select a driver to view stats and telemetry. (Driver selection UI coming
        soon!)
      </p>
      {/* TODO: Add driver selection and stats UI */}
    </div>
  );
}
