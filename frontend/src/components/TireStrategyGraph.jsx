import React from 'react';

const TIRE_COLORS = {
  SOFT: '#FF6347', // Tomato Red
  MEDIUM: '#FFD700', // Gold/Yellow
  HARD: '#D3D3D3', // Light Grey
  INTERMEDIATE: '#32CD32', // Lime Green
  WET: '#1E90FF', // Dodger Blue
  UNKNOWN: '#808080', // Grey for unknown/other compounds
};

const TireStrategyGraph = ({ raceData, driverData }) => {
  if (!raceData || !driverData || driverData.length === 0 || !raceData.totalLaps) {
    if (raceData && raceData.totalLaps === 0) {
        return <p>Race has 0 laps, cannot display strategy graph.</p>;
    }
    return <p>Loading graph data or insufficient data to display graph...</p>;
  }

  const sortedDrivers = [...driverData].sort((a, b) => {
    // Handle cases where finishingPosition might be null or undefined
    if (a.finishingPosition == null) return 1;
    if (b.finishingPosition == null) return -1;
    return a.finishingPosition - b.finishingPosition;
  });

  const totalLaps = raceData.totalLaps;

  // SVG dimensions and layout parameters
  const svgWidth = "100%"; // Use percentage for responsiveness
  const svgHeight = Math.max(400, sortedDrivers.length * 30 + 100); // Dynamic height based on driver count
  const margin = { top: 50, right: 50, bottom: 50, left: 80 }; // Increased left margin for driver names
  const graphWidth = 800; // Fixed graph width for now, can be made responsive
  const graphHeight = svgHeight - margin.top - margin.bottom;

  const lapScale = (lap) => (lap / totalLaps) * graphWidth;

  // Determine X-axis tick interval (e.g., every 5 or 10 laps)
  const lapTickInterval = totalLaps <= 30 ? 5 : (totalLaps <= 60 ? 10 : 15);
  const lapTicks = Array.from({ length: Math.floor(totalLaps / lapTickInterval) + 1 }, (_, i) => i * lapTickInterval);
  if (lapTicks[lapTicks.length - 1] < totalLaps && totalLaps % lapTickInterval !== 0) {
    lapTicks.push(totalLaps); // Ensure last lap is a tick if not covered
  }


  return (
    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <h4 style={{ textAlign: 'center', color: '#181818', marginBottom: '20px' }}>
        Tire Strategy: {raceData.name || 'Race'} ({totalLaps} Laps)
      </h4>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${graphWidth + margin.left + margin.right} ${svgHeight}`}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* X-axis (Laps) */}
          <line x1="0" y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="#ccc" />
          {lapTicks.map((lap) => (
            <g key={`lap-tick-${lap}`} transform={`translate(${lapScale(lap)}, ${graphHeight})`}>
              <line y1="0" y2="5" stroke="#ccc" />
              <text dy="1.5em" textAnchor="middle" fontSize="10" fill="#555">
                {lap}
              </text>
            </g>
          ))}
          <text x={graphWidth / 2} y={graphHeight + 35} textAnchor="middle" fontSize="12" fill="#333">
            Lap Number
          </text>

          {/* Y-axis (Drivers) & Stint Lines */}
          {sortedDrivers.map((driver, index) => {
            const driverYPosition = (index / sortedDrivers.length) * graphHeight + (graphHeight / sortedDrivers.length / 2);

            return (
              <g key={`driver-row-${driver.id || driver.driver_number}`}>
                <text
                  x="-10"
                  y={driverYPosition}
                  dy="0.35em" /* vertical alignment */
                  textAnchor="end"
                  fontSize="10"
                  fill="#333"
                  title={driver.full_name || driver.name} // Show full name on hover if available
                >
                  {`P${driver.finishingPosition || '?'} ${driver.name_acronym || driver.name}`}
                </text>

                {/* Background line for the driver row (optional) */}
                <line x1="0" y1={driverYPosition} x2={graphWidth} y2={driverYPosition} stroke="#eee" strokeDasharray="2,2" />

                {/* Tire Stints */}
                {driver.stints && driver.stints.map((stint, stintIndex) => {
                  const startLap = stint.lapStart || 0; // lap_start in API
                  let endLap = stint.lapEnd || totalLaps; // lap_end in API
                  // Ensure endLap does not exceed totalLaps for visualization
                  if (endLap > totalLaps) endLap = totalLaps;

                  const x1 = lapScale(startLap);
                  const x2 = lapScale(endLap);
                  const compoundUpper = stint.compound ? stint.compound.toUpperCase() : 'UNKNOWN';
                  const color = TIRE_COLORS[compoundUpper] || TIRE_COLORS.UNKNOWN;

                  if (x1 > x2) { // Should not happen with correct data
                      console.warn("Stint start lap is after end lap:", stint, "for driver", driver.name);
                      return null;
                  }

                  return (
                    <line
                      key={`stint-${driver.id}-${stintIndex}`}
                      x1={x1}
                      y1={driverYPosition}
                      x2={x2}
                      y2={driverYPosition}
                      stroke={color}
                      strokeWidth="8" // Make lines thicker
                      title={`${stint.compound} (Laps ${startLap}-${endLap})`} // Tooltip
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Legend for tire colors */}
          <g transform={`translate(${graphWidth - 100}, -30)`}>
            {Object.entries(TIRE_COLORS).map(([tire, color], index) => (
              <g key={tire} transform={`translate(0, ${index * 18})`}>
                <rect width="12" height="12" fill={color} y="-10"/>
                <text x="18" y="0" fontSize="10" fill="#333">{tire.charAt(0) + tire.slice(1).toLowerCase()}</text>
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default TireStrategyGraph;
