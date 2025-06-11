// frontend/src/components/DriverTelemetryChart.jsx
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
} from "chart.js";
import { OPENF1_BASE_URL } from "../apiConfig";
import axios from "axios";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Base Chart Options (can be dynamically updated)
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: {
        display: true,
        text: "Time", // Or Lap Number, depending on telemetry data
        color: "var(--color-text-secondary)",
      },
      ticks: { color: "var(--color-text-secondary)" },
      grid: { color: "var(--color-border)" },
    },
    y: {
      title: {
        display: true,
        text: "Value", // This will be overridden by specific telemetry data types
        color: "var(--color-text-secondary)",
      },
      ticks: { color: "var(--color-text-secondary)" },
      grid: { color: "var(--color-border)" },
    },
  },
  plugins: {
    legend: { position: "top", labels: { color: "var(--color-text-primary)" } },
    title: {
      display: true,
      text: "Driver Telemetry",
      color: "var(--color-text-primary)",
      font: { size: 16 },
    },
  },
};

// Component accepts allSessionDrivers as a prop
function DriverTelemetryChart({ selectedRace, allSessionDrivers }) {
  const [chartData, setChartData] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [isProcessingChart, setIsProcessingChart] = useState(false);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Effect 1: Reset selections and data when the race or drivers prop changes
  useEffect(() => {
    setSelectedDriver(null);
    setChartData(null);
    setTelemetryData(null);
    setError("");
    setIsLoadingTelemetry(false);
    setIsProcessingChart(false);
  }, [selectedRace, allSessionDrivers]);

  // Effect 2: Fetch telemetry data for the selected session and driver
  useEffect(() => {
    if (selectedRace && selectedRace.session_key && selectedDriver) {
      setIsLoadingTelemetry(true);
      setIsProcessingChart(false);
      setError("");
      setTelemetryData(null);
      setChartData(null);

      // TODO: Replace with actual telemetry API endpoint and parameters
      // Example: /telemetry?session_key={session_key}&driver_number={driver_number}
      // The structure of the response data will determine how it's processed.
      // For now, we'll simulate a delay and set some mock data.
      setTimeout(() => {
        // MOCK DATA - Replace with actual API call
        const mockData = [
          { time: 0, speed: 0, rpm: 800, throttle: 0, brake: 1 },
          { time: 1, speed: 50, rpm: 2000, throttle: 0.5, brake: 0 },
          { time: 2, speed: 100, rpm: 3000, throttle: 1, brake: 0 },
          { time: 3, speed: 150, rpm: 4000, throttle: 1, brake: 0 },
          { time: 4, speed: 100, rpm: 3000, throttle: 0.5, brake: 1 },
          { time: 5, speed: 50, rpm: 2000, throttle: 0, brake: 1 },
        ];
        setTelemetryData(mockData);
        setIsLoadingTelemetry(false);
      }, 1000);


      // Example using axios:
      // axios
      //   .get(
      //     `${OPENF1_BASE_URL}/telemetry?session_key=${selectedRace.session_key}&driver_number=${selectedDriver}`
      //   )
      //   .then((response) => {
      //     if (Array.isArray(response.data)) {
      //       setTelemetryData(response.data);
      //     } else {
      //       console.error("Telemetry data is not an array:", response.data);
      //       setTelemetryData([]);
      //       setError("Failed to load telemetry data: Unexpected format.");
      //     }
      //     setIsLoadingTelemetry(false);
      //   })
      //   .catch((err) => {
      //     console.error(
      //       `Error fetching telemetry data for session ${selectedRace.session_key}, driver ${selectedDriver}:`,
      //       err
      //     );
      //     setError("Failed to load telemetry data for the session and driver.");
      //     setTelemetryData(null);
      //     setIsLoadingTelemetry(false);
      //   });
    } else {
      setTelemetryData(null);
      setChartData(null);
      setIsLoadingTelemetry(false);
      setIsProcessingChart(false);
      setError("");
    }
  }, [selectedRace?.session_key, selectedDriver]);

  // Effect 3: Process telemetry data into chartData
  useEffect(() => {
    if (telemetryData && telemetryData.length > 0 && allSessionDrivers && allSessionDrivers.length > 0 && selectedDriver) {
      setIsProcessingChart(true);
      setError("");

      try {
        const driverInfo = allSessionDrivers.find(d => d.driver_number === selectedDriver);
        const driverName = driverInfo?.name_acronym || `Driver ${selectedDriver}`;

        // TODO: Adapt this based on the actual telemetry data structure
        // This example assumes telemetryData is an array of objects with time, speed, rpm, throttle, brake
        const labels = telemetryData.map(d => d.time); // Or d.lap_number, d.timestamp, etc.

        const speedData = telemetryData.map(d => d.speed);
        const rpmData = telemetryData.map(d => d.rpm);
        const throttleData = telemetryData.map(d => d.throttle);
        const brakeData = telemetryData.map(d => d.brake);

        setChartData({
          labels: labels,
          datasets: [
            {
              label: `Speed (${driverName})`,
              data: speedData,
              borderColor: "var(--color-accent-red)",
              backgroundColor: "var(--color-accent-red)80",
              yAxisID: 'y-speed', // Assign to a specific Y axis
              tension: 0.2,
              fill: false,
            },
            {
              label: `RPM (${driverName})`,
              data: rpmData,
              borderColor: "var(--color-accent-purple)",
              backgroundColor: "var(--color-accent-purple)80",
              yAxisID: 'y-rpm', // Assign to a specific Y axis
              tension: 0.2,
              fill: false,
            },
            {
              label: `Throttle (${driverName})`,
              data: throttleData,
              borderColor: "green", // Example color
              backgroundColor: "green80",
              yAxisID: 'y-throttle-brake', // Assign to a specific Y axis
              tension: 0.2,
              fill: false,
            },
            {
              label: `Brake (${driverName})`,
              data: brakeData,
              borderColor: "blue", // Example color
              backgroundColor: "blue80",
              yAxisID: 'y-throttle-brake', // Assign to a specific Y axis
              tension: 0.2,
              fill: false,
            },
          ],
        });
      } catch (e) {
        console.error("Error processing chart data:", e);
        setError("Failed to process data for the telemetry chart.");
        setChartData(null);
      } finally {
        setIsProcessingChart(false);
      }
    } else {
      setChartData(null);
      if (selectedDriver && (!allSessionDrivers || allSessionDrivers.length === 0)) {
        setError("Driver details are not available to process the chart.");
      }
      setIsProcessingChart(false);
    }
  }, [selectedDriver, telemetryData, allSessionDrivers]);

  if (!selectedRace || !selectedRace.session_key) {
    return (
      <div className="chart-placeholder">
        <p>Select a race to see driver telemetry.</p>
      </div>
    );
  }

  const renderDriverSelector = () => (
    <div className="driver-selector">
      <label htmlFor="driver-select">Select Driver:</label>
      <select
        id="driver-select"
        value={selectedDriver || ""}
        onChange={(e) => {
          setSelectedDriver(e.target.value ? parseInt(e.target.value) : null);
          setChartData(null); // Clear chart when driver changes
        }}
        disabled={!allSessionDrivers || allSessionDrivers.length === 0 || isLoadingTelemetry || isProcessingChart}
      >
        <option value="">-- Select Driver --</option>
        {allSessionDrivers &&
          allSessionDrivers.map((driver) => (
            <option key={`tel-${driver.driver_number}`} value={driver.driver_number}>
              {driver.fullName} {driver.name_acronym ? `(${driver.name_acronym})` : ""}
            </option>
          ))}
      </select>
    </div>
  );

  // Dynamic options to handle multiple Y axes if needed
  const currentChartOptions = {
    ...baseChartOptions,
    scales: {
        ...baseChartOptions.scales,
        'y-speed': { // Axis for Speed
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Speed (km/h)', color: 'var(--color-text-secondary)'},
            ticks: { color: 'var(--color-text-secondary)'},
            grid: { drawOnChartArea: false }, // Only draw grid for the main Y axis to avoid clutter
        },
        'y-rpm': { // Axis for RPM
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'RPM', color: 'var(--color-text-secondary)'},
            ticks: { color: 'var(--color-text-secondary)'},
            grid: { drawOnChartArea: false },
        },
        'y-throttle-brake': { // Axis for Throttle/Brake (0-1 range)
            type: 'linear',
            display: true,
            position: 'right', // Or another position
            min: 0,
            max: 1,
            title: { display: true, text: 'Throttle / Brake', color: 'var(--color-text-secondary)'},
            ticks: { color: 'var(--color-text-secondary)', stepSize: 0.1 },
            grid: { color: "var(--color-border)" }, // Main grid
        }
    },
    plugins: {
      ...baseChartOptions.plugins,
      title: {
        ...baseChartOptions.plugins.title,
        text: selectedDriver && allSessionDrivers && allSessionDrivers.length > 0
            ? `Telemetry: ${allSessionDrivers.find(d => d.driver_number === selectedDriver)?.name_acronym || 'Selected Driver'}`
            : "Driver Telemetry",
      },
    },
  };


  return (
    <div className="driver-telemetry-chart-container">
      <h3>
        Driver Telemetry: {selectedRace.meeting_name} ({selectedRace.year})
      </h3>
      {(!allSessionDrivers || allSessionDrivers.length === 0) && !isLoadingTelemetry && (
        <p className="chart-placeholder">Driver list not available, cannot render selector.</p>
      )}
      {allSessionDrivers && allSessionDrivers.length > 0 && renderDriverSelector()}

      {isLoadingTelemetry && <div className="loading-message"><p>Loading telemetry data...</p></div>}
      {isProcessingChart && !isLoadingTelemetry && <div className="loading-message"><p>Processing chart data...</p></div>}
      {error && !isLoadingTelemetry && !isProcessingChart && <div className="error-message"><p>{error}</p></div>}

      {!isLoadingTelemetry && !isProcessingChart && !error && (!telemetryData || telemetryData.length === 0) && selectedDriver && (
          <div className="chart-placeholder"><p>No telemetry data available for the selected driver or an error occurred.</p></div>
      )}

      {!isLoadingTelemetry && !isProcessingChart && !error && selectedDriver && chartData && (
        <div className="driver-telemetry-chart-area">
          <Line data={chartData} options={currentChartOptions} />
        </div>
      )}

      {!isLoadingTelemetry && !isProcessingChart && !error && !selectedDriver && allSessionDrivers && allSessionDrivers.length > 0 && (
          <div className="chart-placeholder"><p>Telemetry data loaded. Select a driver to view their telemetry.</p></div>
      )}
    </div>
  );
}

export default DriverTelemetryChart;
