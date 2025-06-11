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

// Base Chart Options (simplified, specific y-axis details will be per chart)
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: {
        display: true,
        text: "Time (s)", // Standardized X-axis title
        color: "var(--color-text-secondary)",
      },
      ticks: { color: "var(--color-text-secondary)" },
      grid: { color: "var(--color-border)" },
    },
    // Y-axis will be defined per chart
  },
  plugins: {
    legend: {
      position: "top",
      labels: { color: "var(--color-text-primary)" },
      // display: false, // Individual legends might be too much, consider removing if chart titles are clear
    },
    title: { // This title is for the chart itself, will be overridden
      display: true,
      color: "var(--color-text-primary)",
      font: { size: 14 }, // Slightly smaller for individual charts
    },
  },
};

// Component accepts allSessionDrivers as a prop
function DriverTelemetryChart({ selectedRace, allSessionDrivers }) {
  const [individualChartsData, setIndividualChartsData] = useState(null); // Renamed from chartData
  const [telemetryData, setTelemetryData] = useState(null); // Raw telemetry
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [isProcessingChart, setIsProcessingChart] = useState(false);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Effect 1: Reset selections and data when the race or drivers prop changes
  useEffect(() => {
    setSelectedDriver(null);
    setIndividualChartsData(null); // Reset new state
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
      setIndividualChartsData(null); // Reset new state

      // TODO: Replace with actual telemetry API endpoint and parameters
      // Example: /telemetry?session_key={session_key}&driver_number={driver_number}&fields=time,speed,rpm,throttle,brake,gear,drs
      // The structure of the response data will determine how it's processed.
      setTimeout(() => {
        // MOCK DATA - Updated with gear and drs
        const mockData = [
          { time: 0, speed: 0, rpm: 800, throttle: 0, brake: 1, gear: 1, drs: 0 },
          { time: 1, speed: 50, rpm: 2000, throttle: 0.5, brake: 0, gear: 2, drs: 0 },
          { time: 2, speed: 100, rpm: 3000, throttle: 1, brake: 0, gear: 3, drs: 1 },
          { time: 3, speed: 150, rpm: 4000, throttle: 1, brake: 0, gear: 4, drs: 1 },
          { time: 4, speed: 120, rpm: 3500, throttle: 0.7, brake: 0, gear: 4, drs: 0 },
          { time: 5, speed: 80, rpm: 2500, throttle: 0.2, brake: 1, gear: 3, drs: 0 },
        ];
        setTelemetryData(mockData);
        setIsLoadingTelemetry(false);
      }, 1000);

      // Example using axios (ensure to request all necessary fields):
      // axios
      //   .get(
      //     `${OPENF1_BASE_URL}/telemetry?session_key=${selectedRace.session_key}&driver_number=${selectedDriver}&fields=time,speed,rpm,throttle,brake,gear,drs`
      //   )
      //   .then((response) => {
      //     if (Array.isArray(response.data)) {
      //       setTelemetryData(response.data);
      //     } else {
      //       console.error("Telemetry data is not an array:", response.data);
      //       setTelemetryData([]); // Set to empty array to prevent errors in processing
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
      setIndividualChartsData(null); // Reset new state
      setIsLoadingTelemetry(false);
      setIsProcessingChart(false);
      setError("");
    }
  }, [selectedRace?.session_key, selectedDriver]);

  // Effect 3: Process telemetryData into individualChartsData for six charts
  useEffect(() => {
    if (telemetryData && telemetryData.length > 0 && allSessionDrivers && allSessionDrivers.length > 0 && selectedDriver) {
      setIsProcessingChart(true);
      setError("");
      setIndividualChartsData(null); // Clear previous multi-chart data

      try {
        const driverInfo = allSessionDrivers.find(d => d.driver_number === selectedDriver);
        const driverNameAcronym = driverInfo?.name_acronym || `Driver ${selectedDriver}`;
        const labels = telemetryData.map(d => d.time); // Common X-axis labels (time)

        const createChartConfig = (telemetryKey, yAxisTitle, color, yAxisOptions = {}) => {
          const dataValues = telemetryData.map(d => d[telemetryKey]);
          return {
            data: {
              labels: labels,
              datasets: [{
                label: `${yAxisTitle} (${driverNameAcronym})`,
                data: dataValues,
                borderColor: color,
                backgroundColor: `${color}80`, // Add some transparency
                tension: 0.2,
                fill: false,
                pointRadius: 2, // Smaller points for dense data
              }],
            },
            options: {
              ...baseChartOptions,
              scales: {
                ...baseChartOptions.scales,
                y: {
                  title: { display: true, text: yAxisTitle, color: "var(--color-text-secondary)" },
                  ticks: { color: "var(--color-text-secondary)", ...yAxisOptions.ticks },
                  grid: { color: "var(--color-border)" },
                  min: yAxisOptions.min,
                  max: yAxisOptions.max,
                },
              },
              plugins: {
                ...baseChartOptions.plugins,
                title: {
                  ...baseChartOptions.plugins.title,
                  text: `${yAxisTitle} - ${driverNameAcronym}`,
                },
                legend: { // Keep legend for individual charts, but simplify label
                    position: "top",
                    labels: {
                        color: "var(--color-text-primary)",
                        boxWidth: 10, // Smaller legend box
                        font: { size: 10 } // Smaller font for legend
                    }
                },
              },
            },
          };
        };

        setIndividualChartsData({
          speed: createChartConfig('speed', 'Speed (km/h)', 'var(--color-accent-red)'),
          throttle: createChartConfig('throttle', 'Throttle (%)', 'green', { min: 0, max: 1, ticks: { stepSize: 0.1 } }),
          brake: createChartConfig('brake', 'Brake (0=Off, 1=On)', 'blue', { min: 0, max: 1, ticks: { stepSize: 1 } }),
          rpm: createChartConfig('rpm', 'RPM', 'var(--color-accent-purple)'),
          gear: createChartConfig('gear', 'Gear', 'orange', { min: 0, max: 8, ticks: { stepSize: 1 } }), // Assuming gear 0 for Neutral/Error
          drs: createChartConfig('drs', 'DRS (0=Off, 1..12=On)', 'cyan', { min: 0, max: 12, ticks: { stepSize: 1 } }), // DRS can have multiple zones/values in OpenF1
        });

      } catch (e) {
        console.error("Error processing chart data:", e);
        setError("Failed to process data for telemetry charts.");
        setIndividualChartsData(null);
      } finally {
        setIsProcessingChart(false);
      }
    } else {
      setIndividualChartsData(null);
      if (selectedDriver && telemetryData && telemetryData.length === 0) {
        setError("No telemetry data points available for this driver/session.");
      } else if (selectedDriver && (!allSessionDrivers || allSessionDrivers.length === 0)) {
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
      <label htmlFor="driver-telemetry-select">Select Driver:</label>
      <select
        id="driver-telemetry-select"
        value={selectedDriver || ""}
        onChange={(e) => {
          setSelectedDriver(e.target.value ? parseInt(e.target.value) : null);
          setIndividualChartsData(null); // Clear charts when driver changes
        }}
        disabled={!allSessionDrivers || allSessionDrivers.length === 0 || isLoadingTelemetry || isProcessingChart}
      >
        <option value="">-- Select Driver --</option>
        {allSessionDrivers &&
          allSessionDrivers.map((driver) => (
            <option key={`tel-chart-${driver.driver_number}`} value={driver.driver_number}>
              {driver.fullName} {driver.name_acronym ? `(${driver.name_acronym})` : ""}
            </option>
          ))}
      </select>
    </div>
  );

  const chartConfigs = [
    { key: 'speed', title: 'Speed' },
    { key: 'throttle', title: 'Throttle' },
    { key: 'brake', title: 'Brake' },
    { key: 'rpm', title: 'RPM' },
    { key: 'gear', title: 'Gear' },
    { key: 'drs', title: 'DRS' },
  ];

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
          <div className="chart-placeholder"><p>No telemetry data points found for the selected driver.</p></div>
      )}

      {!isLoadingTelemetry && !isProcessingChart && !error && selectedDriver && individualChartsData && (
        <div className="telemetry-charts-grid">
          {chartConfigs.map(config => (
            <div key={config.key} className="telemetry-chart-item">
              {/* The h4 title is now part of the chart options `plugins.title.text` */}
              {/* <h4>{config.title}</h4> */}
              {individualChartsData[config.key] ? (
                <Line data={individualChartsData[config.key].data} options={individualChartsData[config.key].options} />
              ) : (
                <p>Data for {config.title} not available.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoadingTelemetry && !isProcessingChart && !error && !selectedDriver && allSessionDrivers && allSessionDrivers.length > 0 && (
          <div className="chart-placeholder"><p>Select a driver to view their telemetry.</p></div>
      )}
       {!isLoadingTelemetry && !isProcessingChart && !error && selectedDriver && !individualChartsData && telemetryData && telemetryData.length > 0 && (
          <div className="chart-placeholder"><p>Could not process telemetry data into charts.</p></div>
      )}
    </div>
  );
}

export default DriverTelemetryChart;
