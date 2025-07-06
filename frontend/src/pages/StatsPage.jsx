import React from "react";

export default function StatsPage({
  selectedRace,
  selectedDrivers,
  telemetrySettings,
  setTelemetrySettings,
}) {
  return (
    <div
      className="f1-card"
      style={{ maxWidth: 900, margin: "2em auto", textAlign: "center" }}
    >
      <div className="f1-header">Stats & Telemetry</div>
      <div className="f1-line" />
      <p style={{ fontSize: "1.1em", marginBottom: "1em", color: "#444" }}>
        View race stats, driver telemetry, and more. (Detailed stats UI coming
        soon!)
      </p>
      {/* TODO: Add stats and telemetry UI */}
    </div>
  );
}
