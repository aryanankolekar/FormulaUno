import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import axios from "axios";
import { OPENF1_BASE_URL } from "../apiConfig";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MAX_DRIVERS_ON_CHART = 7;

const formatLapTime = (seconds) => {
  if (seconds === null || typeof seconds === "undefined") return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const millis = Math.floor(
    (remainingSeconds - Math.floor(remainingSeconds)) * 1000
  );
  return `${minutes}:${Math.floor(remainingSeconds)
    .toString()
    .padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};

// Component now accepts allSessionDrivers as a prop
const PaceAnalysisChart = ({ selectedRace, allSessionDrivers }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoadingLaps, setIsLoadingLaps] = useState(false); // Specific loading for laps
  const [error, setError] = useState("");
  // sessionDrivers state is now derived from allSessionDrivers prop
  const [sessionLapsByDriver, setSessionLapsByDriver] = useState(new Map());
  const [driversToPlot, setDriversToPlot] = useState(new Set());
  const [processedDrivers, setProcessedDrivers] = useState([]); // To hold drivers formatted for UI

  // Effect for fetching Laps data and processing drivers from prop
  useEffect(() => {
    setChartData(null);
    setError("");
    setIsLoadingLaps(false);
    setSessionLapsByDriver(new Map());
    setDriversToPlot(new Set());
    setProcessedDrivers([]);

    if (!selectedRace || !selectedRace.session_key) {
      return;
    }

    setIsLoadingLaps(true); // Start loading laps

    // Process allSessionDrivers prop
    if (allSessionDrivers && allSessionDrivers.length > 0) {
      const currentDriversMap = new Map();
      allSessionDrivers.forEach((d) =>
        currentDriversMap.set(d.driver_number, {
          fullName: d.full_name || `Driver ${d.driver_number}`,
          name_acronym: d.name_acronym, // Store acronym
          teamColour: d.team_colour ? `#${d.team_colour}` : "#808080",
          driver_number: d.driver_number,
        })
      );
      // This mapping is for UI selection, actual plotting depends on lap data availability
      setProcessedDrivers(
        allSessionDrivers
          .map((d) => currentDriversMap.get(d.driver_number))
          .filter(Boolean)
      );
    } else {
      // No drivers passed, clear processed drivers
      setProcessedDrivers([]);
    }

    // Fetch only laps now
    axios
      .get(
        `${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`
      )
      .then((lapsResponse) => {
        const lapsData = lapsResponse.data;

        if (!Array.isArray(lapsData)) {
          setError("Failed to parse lap time data from OpenF1.");
          setIsLoadingLaps(false);
          return;
        }

        const currentLapsByDriver = new Map();
        const driverNumbersWithLaps = new Set(); // Keep track of drivers who actually have laps

        lapsData.forEach((lap) => {
          // We only care about laps from drivers passed in allSessionDrivers
          if (
            allSessionDrivers &&
            !allSessionDrivers.find(
              (d) => d.driver_number === lap.driver_number
            )
          )
            return;

          if (!currentLapsByDriver.has(lap.driver_number)) {
            currentLapsByDriver.set(lap.driver_number, []);
          }
          if (
            lap.lap_duration !== null &&
            typeof lap.lap_duration === "number"
          ) {
            currentLapsByDriver.get(lap.driver_number).push({
              lap_number: lap.lap_number,
              lap_duration: lap.lap_duration,
            });
            driverNumbersWithLaps.add(lap.driver_number);
          }
        });
        setSessionLapsByDriver(currentLapsByDriver);

        // Filter processedDrivers to only those who have lap data
        // And sort them by number of laps completed for initial selection
        const driversForUI = (allSessionDrivers || [])
          .filter((d) => driverNumbersWithLaps.has(d.driver_number))
          .map((d) => ({
            // Re-map to ensure consistent structure if needed, or use from processedDrivers
            fullName: d.full_name || `Driver ${d.driver_number}`,
            name_acronym: d.name_acronym,
            teamColour: d.team_colour ? `#${d.team_colour}` : "#808080",
            driver_number: d.driver_number,
            lapCount: (currentLapsByDriver.get(d.driver_number) || []).length,
          }))
          .sort((a, b) => b.lapCount - a.lapCount);

        setProcessedDrivers(driversForUI);

        const initialDriversToPlot = new Set();
        for (let i = 0; i < Math.min(driversForUI.length, 2); i++) {
          initialDriversToPlot.add(driversForUI[i].driver_number);
        }
        setDriversToPlot(initialDriversToPlot);

        setIsLoadingLaps(false);
      })
      .catch((err) => {
        console.error(
          `Error fetching lap data for session ${selectedRace.session_key}:`,
          err
        );
        setError(`Failed to load lap data for ${selectedRace.meeting_name}.`);
        setIsLoadingLaps(false);
      });
  }, [selectedRace, allSessionDrivers]); // Depend on allSessionDrivers

  // Effect for generating chartData
  useEffect(() => {
    // Guard against running if processedDrivers isn't populated yet from the prop
    if (
      driversToPlot.size === 0 ||
      sessionLapsByDriver.size === 0 ||
      processedDrivers.length === 0
    ) {
      setChartData(null);
      return;
    }

    let maxLaps = 0;
    driversToPlot.forEach((driverNumber) => {
      const driverLaps = sessionLapsByDriver.get(driverNumber) || [];
      const currentMax = Math.max(...driverLaps.map((l) => l.lap_number), 0);
      if (currentMax > maxLaps) maxLaps = currentMax;
    });

    if (maxLaps === 0 && driversToPlot.size > 0) {
      setError("Selected drivers have no valid lap data to plot.");
      setChartData(null);
      return;
    } else if (maxLaps === 0) {
      setChartData(null); // No data to plot, but not necessarily an error if no drivers selected
      return;
    }
    setError("");

    const labels = Array.from({ length: maxLaps }, (_, i) => `Lap ${i + 1}`);
    const datasets = [];

    driversToPlot.forEach((driverNumber) => {
      // Find driver details from processedDrivers (which is derived from allSessionDrivers prop)
      const driverInfo = processedDrivers.find(
        (d) => d.driver_number === driverNumber
      );
      if (!driverInfo) return; // Should not happen if processedDrivers is correctly populated

      const driverLaps = sessionLapsByDriver.get(driverNumber) || [];
      const lapDataArray = new Array(maxLaps).fill(null);
      driverLaps.forEach((lap) => {
        if (lap.lap_number - 1 < maxLaps) {
          lapDataArray[lap.lap_number - 1] = lap.lap_duration;
        }
      });

      datasets.push({
        label: `${driverInfo.name_acronym || driverInfo.fullName}`, // Prefer acronym for legend
        data: lapDataArray,
        borderColor: driverInfo.teamColour,
        backgroundColor: `${driverInfo.teamColour}B3`, // Semi-transparent for area fill
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
        hitRadius: 10,
        fill: false,
      });
    });

    if (datasets.length > 0) {
      setChartData({ labels, datasets });
    } else if (driversToPlot.size > 0) {
      setError("No lap data for selected drivers to plot.");
      setChartData(null);
    }
  }, [driversToPlot, sessionLapsByDriver, processedDrivers]);

  const handleDriverSelectionChange = (driverNumber) => {
    setDriversToPlot((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(driverNumber)) {
        newSelected.delete(driverNumber);
      } else {
        if (newSelected.size < MAX_DRIVERS_ON_CHART) {
          newSelected.add(driverNumber);
        } else {
          alert(
            `You can select a maximum of ${MAX_DRIVERS_ON_CHART} drivers for comparison.`
          );
        }
      }
      return newSelected;
    });
  };

  if (!selectedRace || !selectedRace.session_key) {
    return (
      <p className="results-placeholder">
        Select a race to view pace analysis.
      </p>
    );
  }
  // isLoadingLaps is true, and processedDrivers might not be populated yet
  if (isLoadingLaps && processedDrivers.length === 0) {
    return (
      <p className="loading-message">
        Loading pace analysis data for{" "}
        {selectedRace.meeting_name || "selected race"}...
      </p>
    );
  }
  // Error state, especially if chart can't be generated
  if (error && (!chartData || chartData.datasets.length === 0)) {
    return <p className="error-message">{error}</p>;
  }
  // If not loading, but no drivers (from prop or after filtering for laps) are available
  if (!isLoadingLaps && processedDrivers.length === 0 && !error) {
    return (
      <p className="results-placeholder">
        No driver data with laps available to generate pace chart for this
        session.
      </p>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#fff",
        },
      },
      title: {
        display: true,
        text: `Lap Times Comparison - ${
          selectedRace.meeting_name || "Selected Race"
        }`,
        color: "#fff",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "var(--color-bg-tertiary)",
        titleColor: "var(--color-text-primary)",
        bodyColor: "var(--color-text-primary)",
        borderColor: "var(--color-accent-red)",
        borderWidth: 1,
        padding: 10,
        bodyFont: { size: 12 },
        titleFont: { size: 14, weight: "bold" },
        callbacks: {
          title: function (tooltipItems) {
            return tooltipItems.length > 0 ? tooltipItems[0].label : "";
          },
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null)
              label += formatLapTime(context.parsed.y);
            else label += "N/A";
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Lap Number",
          color: "var(--color-text-primary)",
          font: {
            size: 12,
            weight: "bold",
          },
        },
        ticks: {
          color: "#fff",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Lap Time",
          color: "var(--color-text-primary)",
          font: {
            size: 12,
            weight: "bold",
          },
        },
        ticks: {
          color: "#fff",
        },
      },
    },
    interaction: { intersect: false, mode: "index" },
    backgroundColor: "var(--f1-card)",
  };

  return (
    <div
      style={{
        background: "var(--f1-card)",
        borderRadius: "10px",
        padding: "1em",
      }}
    >
      <div className="driver-selection-container">
        <h4>Select Drivers for Pace Chart (Max {MAX_DRIVERS_ON_CHART}):</h4>
        {/* Use processedDrivers for UI, which is derived from allSessionDrivers and filtered by lap data */}
        {processedDrivers.map((driver) => (
          <label key={driver.driver_number} className="driver-checkbox-label">
            <input
              type="checkbox"
              checked={driversToPlot.has(driver.driver_number)}
              onChange={() => handleDriverSelectionChange(driver.driver_number)}
              disabled={
                (driversToPlot.size >= MAX_DRIVERS_ON_CHART &&
                  !driversToPlot.has(driver.driver_number)) ||
                isLoadingLaps
              }
            />
            <span
              style={{
                color: driver.teamColour,
                fontWeight: driversToPlot.has(driver.driver_number)
                  ? "bold"
                  : "normal",
              }}
            >
              {driver.name_acronym || driver.fullName} {/* Prefer acronym */}
            </span>
          </label>
        ))}
        {isLoadingLaps && processedDrivers.length > 0 && (
          <p>Updating lap data...</p>
        )}
      </div>
      {error && (!chartData || chartData.datasets.length === 0) && (
        <p className="error-message">{error}</p>
      )}
      {chartData && chartData.datasets.length > 0 ? (
        <div style={{ height: "450px", width: "100%", marginTop: "20px" }}>
          <Line options={chartOptions} data={chartData} />
        </div>
      ) : (
        !isLoadingLaps &&
        !error && (
          <p className="results-placeholder">
            Select drivers to display their pace comparison, or no data for
            current selection.
          </p>
        )
      )}
    </div>
  );
};

export default PaceAnalysisChart;
