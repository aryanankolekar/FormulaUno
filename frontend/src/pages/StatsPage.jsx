import React from "react";

export default function StatsPage({
  selectedRace,
  // selectedDrivers, // No longer primarily using this page for detailed views tied to selectedDrivers from App state
  // telemetrySettings,
  // setTelemetrySettings,
}) {
  return (
    <div
      className="f1-card"
      style={{ maxWidth: 900, margin: "2em auto", textAlign: "center" }}
    >
      <div className="f1-header">Stats & Telemetry</div>
      <div className="f1-line" />
      <p style={{ fontSize: "1.1em", marginBottom: "1em", color: "#444" }}>
        Select a race and view detailed analysis on the main page. (This page can be used for general, non-race-specific stats in the future.)
      </p>
      {selectedRace ? (
        <p>Currently selected race: {selectedRace.race_name || selectedRace.meeting_name}</p>
      ) : (
        <p>No race selected. Please select a race from the Home or Races page to see detailed visualizations.</p>
      )}
      {/* Placeholder for any future general stats content */}
    </div>
  );
}
