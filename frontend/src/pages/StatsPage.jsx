import React, { useState, useEffect } from "react";
import TireStrategyGraph from "../components/TireStrategyGraph";

export default function StatsPage({
  selectedRace,
  raceSessionDrivers, // Renamed from selectedDrivers
  raceStintData,
  isLoadingDrivers,
  isLoadingStints,
  // telemetrySettings,
  // setTelemetrySettings,
}) {
  const [showTireStrategy, setShowTireStrategy] = useState(false);
  const [processedGraphData, setProcessedGraphData] = useState({ drivers: [], raceTotalLaps: 0 });

  useEffect(() => {
    if (selectedRace && raceSessionDrivers && raceStintData) {
      // Basic processing: combine driver info with their stints
      // The graph component will expect drivers to have a 'stints' array matching its needs.
      // raceStintData is an array of all stints for the race. We need to map them to drivers.
      // OpenF1 /stints endpoint returns: driver_number, lap_start, lap_end, compound, stint_number, tyre_age_at_start_of_stint
      // raceSessionDrivers has: driver_number, name_acronym (for display), finishingPosition (placeholder added in App.jsx)

      const driversWithStints = raceSessionDrivers.map(driver => {
        const stintsForDriver = raceStintData
          .filter(stint => stint.driver_number === driver.driver_number)
          .map(stint => ({
            lapStart: stint.lap_start,
            lapEnd: stint.lap_end,
            compound: stint.compound,
          }));
        return {
          ...driver,
          id: driver.driver_number, // Ensure an 'id' for graph keying if needed
          name: driver.name_acronym || `Driver ${driver.driver_number}`, // Use acronym or fallback
          finishingPosition: driver.finishingPosition, // Already added in App.jsx
          stints: stintsForDriver,
        };
      });

      setProcessedGraphData({
        drivers: driversWithStints,
        raceTotalLaps: selectedRace.laps_completed || selectedRace.total_laps || 0, // Prefer laps_completed or total_laps
      });
    } else {
      setProcessedGraphData({ drivers: [], raceTotalLaps: 0 });
    }
  }, [selectedRace, raceSessionDrivers, raceStintData]);

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '1em',
    color: 'white',
    backgroundColor: '#e10600', // F1 red
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    margin: '0 10px',
    transition: 'background-color 0.3s',
  };

  const handleToggleTireStrategy = () => {
    setShowTireStrategy(!showTireStrategy);
  };

  return (
    <div
      className="f1-card"
      style={{ maxWidth: 1200, margin: "2em auto", textAlign: "center" }} // Increased maxWidth for graph
    >
      <div className="f1-header">Stats & Telemetry</div>
      <div className="f1-line" />
      <p style={{ fontSize: "1.1em", marginBottom: "1em", color: "#444" }}>
        View race stats, driver telemetry, and more.
      </p>

      <div style={{ margin: "20px 0" }}>
        {/* Placeholder for Telemetry Button - Assuming it would be similar */}
        <button
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.backgroundColor = '#c00500'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#e10600'}
          onClick={() => alert("Telemetry button clicked (placeholder)")}
        >
          Telemetry
        </button>
        <button
          style={buttonStyle}
          onMouseOver={(e) => e.target.style.backgroundColor = '#c00500'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#e10600'}
          onClick={handleToggleTireStrategy}
        >
          {showTireStrategy ? "Hide Tire Strategy" : "Show Tire Strategy"}
        </button>
      </div>

      {isLoadingDrivers || isLoadingStints && <p>Loading data for strategy graph...</p>}

      {!isLoadingDrivers && !isLoadingStints && showTireStrategy && (
        <TireStrategyGraph
          raceData={{ totalLaps: processedGraphData.raceTotalLaps, name: selectedRace?.meeting_name || "Race" }}
          driverData={processedGraphData.drivers}
        />
      )}

      {!selectedRace && (
         <p style={{ fontSize: "1em", color: "#777", marginTop: "20px" }}>
           Select a race from the Home or Races page to view detailed stats and visualizations.
         </p>
      )}
       {selectedRace && raceSessionDrivers && raceSessionDrivers.length === 0 && !isLoadingDrivers && (
         <p style={{ fontSize: "1em", color: "#777", marginTop: "20px" }}>
           No driver data loaded for the selected race.
         </p>
       )}
    </div>
  );
}
