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
    title: {
      // This title is for the chart itself, will be overridden
      display: true,
      color: "var(--color-text-primary)",
      font: { size: 14 }, // Slightly smaller for individual charts
    },
  },
};

const chartOptions = {
  plugins: {
    legend: {
      labels: {
        color: "#fff",
      },
    },
    title: {
      color: "#fff",
    },
  },
  scales: {
    x: {
      grid: {
        color: "#fff",
      },
      ticks: {
        color: "#fff",
      },
    },
    y: {
      grid: {
        color: "#fff",
      },
      ticks: {
        color: "#fff",
      },
    },
  },
  backgroundColor: "var(--f1-card)",
};

// Component accepts allSessionDrivers as a prop
function DriverTelemetryChart({ selectedRace, allSessionDrivers }) {
  const [individualChartsData, setIndividualChartsData] = useState(null); // Renamed from chartData
  const [telemetryData, setTelemetryData] = useState(null); // Raw telemetry
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [isProcessingChart, setIsProcessingChart] = useState(false);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverLaps, setDriverLaps] = useState([]);
  const [selectedLap, setSelectedLap] = useState(null);
  const [isLoadingLapsList, setIsLoadingLapsList] = useState(false);
  const [lapsError, setLapsError] = useState("");

  // Effect 1: Reset selections and data when the race or drivers prop changes
  useEffect(() => {
    setSelectedDriver(null);
    setIndividualChartsData(null);
    setTelemetryData(null);
    setDriverLaps([]);
    setSelectedLap(null);
    setError("");
    setLapsError("");
    setIsLoadingTelemetry(false);
    setIsProcessingChart(false);
    setIsLoadingLapsList(false);
  }, [selectedRace, allSessionDrivers]);

  // New Effect: Fetch Laps for Selected Driver
  useEffect(() => {
    if (selectedRace && selectedRace.session_key && selectedDriver) {
      setIsLoadingLapsList(true);
      setDriverLaps([]);
      setSelectedLap(null); // Reset selected lap when driver changes
      setLapsError("");
      // Also clear existing chart data as it's no longer valid for the new driver's laps
      setIndividualChartsData(null);
      setTelemetryData(null);

      axios
        .get(
          `${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&driver_number=${selectedDriver}&lap_duration>0`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            const sortedLaps = response.data.sort(
              (a, b) => a.lap_number - b.lap_number
            );
            setDriverLaps(
              sortedLaps.map((lap) => ({
                lap_number: lap.lap_number,
                date_start: lap.date_start,
                lap_duration: lap.lap_duration,
              }))
            );
          } else {
            console.error("Driver laps data is not an array:", response.data);
            setDriverLaps([]);
            setLapsError("Failed to load laps for driver: Unexpected format.");
          }
          setIsLoadingLapsList(false);
        })
        .catch((err) => {
          console.error(
            `Error fetching laps for driver ${selectedDriver}:`,
            err
          );
          setLapsError("Failed to load laps for the selected driver.");
          setDriverLaps([]);
          setIsLoadingLapsList(false);
        });
    } else {
      setDriverLaps([]);
      setSelectedLap(null);
      setIsLoadingLapsList(false);
      setLapsError("");
    }
  }, [selectedRace?.session_key, selectedDriver]);

  // Effect for fetching telemetry data (previously Effect 2)
  // Now depends on selectedLap as well
  useEffect(() => {
    // Only fetch if a driver AND a lap are selected
    if (
      selectedRace &&
      selectedRace.session_key &&
      selectedDriver &&
      selectedLap
    ) {
      setIsLoadingTelemetry(true);
      setIsProcessingChart(false);
      setError("");
      setTelemetryData(null);
      setIndividualChartsData(null);

      const lapInfo = driverLaps.find((lap) => lap.lap_number === selectedLap);
      if (
        !lapInfo ||
        !lapInfo.date_start ||
        typeof lapInfo.lap_duration !== "number"
      ) {
        setError("Selected lap information is incomplete or missing.");
        setIsLoadingTelemetry(false);
        return;
      }

      const startDate = new Date(lapInfo.date_start);
      const endDate = new Date(
        startDate.getTime() + lapInfo.lap_duration * 1000
      );

      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();

      axios
        .get(
          `${OPENF1_BASE_URL}/car_data?session_key=${selectedRace.session_key}&driver_number=${selectedDriver}&date>=${startDateISO}&date<=${endDateISO}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            // Sort data by date just in case it's not perfectly ordered
            const sortedData = response.data.sort(
              (a, b) => new Date(a.date) - new Date(b.date)
            );
            setTelemetryData(sortedData);
          } else {
            console.error("Fetched car_data is not an array:", response.data);
            setTelemetryData([]);
            setError("Failed to load telemetry for lap: Unexpected format.");
          }
          setIsLoadingTelemetry(false);
        })
        .catch((err) => {
          console.error(
            `Error fetching car_data for session ${selectedRace.session_key}, driver ${selectedDriver}, lap ${selectedLap}:`,
            err
          );
          setError("Failed to load telemetry data for the selected lap.");
          setTelemetryData(null);
          setIsLoadingTelemetry(false);
        });
    } else {
      setTelemetryData(null);
      setIndividualChartsData(null);
      setIsLoadingTelemetry(false);
      setIsProcessingChart(false);
      // Don't clear main error here if it's a lap list error for example
    }
  }, [selectedRace?.session_key, selectedDriver, selectedLap, driverLaps]); // driverLaps added to re-evaluate if needed, though API call depends on selectedLap

  // Effect for processing telemetry data (previously Effect 3)
  useEffect(() => {
    if (
      telemetryData &&
      telemetryData.length > 0 &&
      allSessionDrivers &&
      allSessionDrivers.length > 0 &&
      selectedDriver &&
      selectedLap
    ) {
      setIsProcessingChart(true);
      setIndividualChartsData(null);

      const lapInfo = driverLaps.find((lap) => lap.lap_number === selectedLap);
      if (!lapInfo || !lapInfo.date_start) {
        setError("Cannot process telemetry: Lap start time is missing.");
        setIsProcessingChart(false);
        return;
      }
      const lapStartTimeMillis = new Date(lapInfo.date_start).getTime();

      try {
        const driverInfo = allSessionDrivers.find(
          (d) => d.driver_number === selectedDriver
        );
        const driverNameAcronym =
          driverInfo?.name_acronym || `Driver ${selectedDriver}`;

        // Calculate X-axis labels: time in seconds from lap start
        const labels = telemetryData.map(
          (d) => (new Date(d.date).getTime() - lapStartTimeMillis) / 1000
        );

        const createChartConfig = (
          telemetryKey,
          yAxisTitle,
          color,
          yAxisOptions = {},
          isStepped = false,
          isLastChart = false
        ) => {
          // Ensure n_gear is mapped to gear if that's the field name from API
          const actualTelemetryKey =
            telemetryKey === "gear" &&
            telemetryData[0] &&
            typeof telemetryData[0].n_gear !== "undefined"
              ? "n_gear"
              : telemetryKey;
          const dataValues = telemetryData.map((d) => d[actualTelemetryKey]);

          const datasetOptions = {
            label: `${yAxisTitle} (${driverNameAcronym})`,
            data: dataValues,
            borderColor: color,
            backgroundColor: `${color}80`, // Add some transparency
            fill: false,
            pointRadius: isStepped ? 0 : 2, // No points for stepped lines
            tension: isStepped ? 0 : 0.2, // No tension for stepped lines
          };

          if (isStepped) {
            datasetOptions.stepped = true;
          }

          return {
            data: {
              labels: labels,
              datasets: [datasetOptions],
            },
            options: {
              ...baseChartOptions,
              scales: {
                ...baseChartOptions.scales, // Spread existing scales (like y if defined in base)
                x: {
                  // Override X-axis specifically
                  ...baseChartOptions.scales.x, // Keep base settings like grid color for X
                  title: {
                    ...baseChartOptions.scales.x.title,
                    display: isLastChart, // Only display title if it's the last chart
                  },
                  ticks: {
                    ...baseChartOptions.scales.x.ticks,
                    display: isLastChart, // Only display ticks if it's the last chart
                  },
                },
                y: {
                  // Y-axis configuration remains specific to each chart
                  title: {
                    display: true,
                    text: yAxisTitle,
                    color: "var(--color-text-secondary)",
                  },
                  ticks: {
                    color: "var(--color-text-secondary)",
                    ...yAxisOptions.ticks,
                  },
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
                legend: {
                  // Keep legend for individual charts, but simplify label
                  position: "top",
                  labels: {
                    color: "var(--color-text-primary)",
                    boxWidth: 10, // Smaller legend box
                    font: { size: 10 }, // Smaller font for legend
                  },
                },
              },
            },
          };
        };

        // Define the order and properties of charts
        const orderedChartConfigs = [
          {
            key: "speed",
            yAxisLabel: "Speed (km/h)",
            color: "var(--color-accent-red)",
            yAxisOptions: {},
            isStepped: false,
          },
          {
            key: "throttle",
            yAxisLabel: "Throttle (%)",
            color: "green",
            yAxisOptions: { min: 0, max: 1, ticks: { stepSize: 0.1 } },
            isStepped: false,
          },
          {
            key: "brake",
            yAxisLabel: "Brake (0=Off, 1=On)",
            color: "blue",
            yAxisOptions: { min: 0, max: 1, ticks: { stepSize: 1 } },
            isStepped: false,
          },
          {
            key: "rpm",
            yAxisLabel: "RPM",
            color: "var(--color-accent-purple)",
            yAxisOptions: {},
            isStepped: false,
          },
          {
            key: "gear",
            yAxisLabel: "Gear",
            color: "orange",
            yAxisOptions: { min: 0, max: 8, ticks: { stepSize: 1 } },
            isStepped: true,
          },
          {
            key: "drs",
            yAxisLabel: "DRS (0=Off, 1..12=On)",
            color: "cyan",
            yAxisOptions: { min: 0, max: 12, ticks: { stepSize: 1 } },
            isStepped: false,
          },
        ];

        const charts = {};
        orderedChartConfigs.forEach((config, index) => {
          const isLast = index === orderedChartConfigs.length - 1;
          charts[config.key] = createChartConfig(
            config.key,
            config.yAxisLabel,
            config.color,
            config.yAxisOptions,
            config.isStepped,
            isLast // Pass isLastChart argument
          );
        });
        setIndividualChartsData(charts);
      } catch (e) {
        console.error("Error processing chart data for lap:", e);
        setError("Failed to process telemetry data for the selected lap.");
        setIndividualChartsData(null);
      } finally {
        setIsProcessingChart(false);
      }
    } else {
      setIndividualChartsData(null); // Clear charts if conditions not met
      if (
        selectedDriver &&
        selectedLap &&
        telemetryData &&
        telemetryData.length === 0 &&
        !isLoadingTelemetry
      ) {
        setError(
          "No telemetry data points found for the selected driver and lap."
        );
      } else if (
        selectedDriver &&
        !selectedLap &&
        !isLoadingLapsList &&
        driverLaps.length > 0
      ) {
        //setError("Please select a lap to view telemetry."); // This is more of a prompt
      } else if (
        selectedDriver &&
        (!allSessionDrivers || allSessionDrivers.length === 0)
      ) {
        setError("Driver details are not available to process the chart.");
      }
      setIsProcessingChart(false);
    }
  }, [selectedDriver, selectedLap, telemetryData, allSessionDrivers]); // Added selectedLap

  if (!selectedRace || !selectedRace.session_key) {
    return (
      <div className="chart-placeholder">
        <p>Select a race to see driver telemetry.</p>
      </div>
    );
  }

  const renderSelectors = () => (
    <div className="telemetry-selectors-container">
      {" "}
      {/* New wrapper for both selectors */}
      <div className="driver-selector">
        <label htmlFor="driver-telemetry-select">Select Driver:</label>
        <select
          id="driver-telemetry-select"
          value={selectedDriver || ""}
          onChange={(e) => {
            const driverNum = e.target.value ? parseInt(e.target.value) : null;
            setSelectedDriver(driverNum);
            // Resets for laps and telemetry data are handled by useEffect for selectedDriver
          }}
          disabled={
            !allSessionDrivers ||
            allSessionDrivers.length === 0 ||
            isLoadingLapsList ||
            isLoadingTelemetry ||
            isProcessingChart
          }
        >
          <option value="">-- Select Driver --</option>
          {allSessionDrivers &&
            allSessionDrivers.map((driver) => (
              <option
                key={`tel-driver-${driver.driver_number}`}
                value={driver.driver_number}
              >
                {driver.fullName}{" "}
                {driver.name_acronym ? `(${driver.name_acronym})` : ""}
              </option>
            ))}
        </select>
      </div>
      <div className="lap-selector">
        {" "}
        {/* New lap selector */}
        <label htmlFor="lap-telemetry-select">Select Lap:</label>
        <select
          id="lap-telemetry-select"
          value={selectedLap || ""}
          onChange={(e) => {
            setSelectedLap(e.target.value ? parseInt(e.target.value) : null);
            setIndividualChartsData(null); // Clear charts when lap changes
            setError(""); // Clear main error when user makes a new lap selection
          }}
          disabled={
            !selectedDriver ||
            isLoadingLapsList ||
            driverLaps.length === 0 ||
            isLoadingTelemetry ||
            isProcessingChart
          }
        >
          <option value="">-- Select Lap --</option>
          {driverLaps.map((lap) => (
            <option key={`tel-lap-${lap.lap_number}`} value={lap.lap_number}>
              Lap {lap.lap_number} (Duration:{" "}
              {lap.lap_duration ? lap.lap_duration.toFixed(3) : "N/A"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const chartConfigs = [
    { key: "speed", title: "Speed" },
    { key: "throttle", title: "Throttle" },
    { key: "brake", title: "Brake" },
    { key: "rpm", title: "RPM" },
    { key: "gear", title: "Gear" },
    { key: "drs", title: "DRS" },
  ];

  return (
    <div
      style={{
        background: "var(--f1-card)",
        borderRadius: "10px",
        padding: "1em",
      }}
    >
      <div className="driver-telemetry-chart-container">
        <h3>
          Driver Telemetry for Lap: {selectedRace.meeting_name} (
          {selectedRace.year})
        </h3>
        {(!allSessionDrivers || allSessionDrivers.length === 0) &&
          !isLoadingLapsList &&
          !isLoadingTelemetry && (
            <p className="chart-placeholder">
              Driver list not available for this session.
            </p>
          )}
        {allSessionDrivers && allSessionDrivers.length > 0 && renderSelectors()}{" "}
        {/* Changed to renderSelectors */}
        {isLoadingLapsList && (
          <div className="loading-message">
            <p>Loading laps for driver...</p>
          </div>
        )}
        {lapsError && !isLoadingLapsList && (
          <div className="error-message">
            <p>{lapsError}</p>
          </div>
        )}
        {selectedDriver &&
          !isLoadingLapsList &&
          driverLaps.length === 0 &&
          !lapsError && (
            <div className="chart-placeholder">
              <p>No laps found for the selected driver in this session.</p>
            </div>
          )}
        {selectedDriver &&
          driverLaps.length > 0 &&
          !selectedLap &&
          !isLoadingLapsList &&
          !isLoadingTelemetry && (
            <div className="chart-placeholder">
              <p>Please select a lap to view telemetry.</p>
            </div>
          )}
        {isLoadingTelemetry && (
          <div className="loading-message">
            <p>Loading telemetry data for lap...</p>
          </div>
        )}
        {isProcessingChart && !isLoadingTelemetry && (
          <div className="loading-message">
            <p>Processing lap telemetry data...</p>
          </div>
        )}
        {error && !isLoadingTelemetry && !isProcessingChart && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        {!isLoadingTelemetry &&
          !isProcessingChart &&
          !error &&
          selectedDriver &&
          selectedLap &&
          (!telemetryData || telemetryData.length === 0) && (
            <div className="chart-placeholder">
              <p>
                No telemetry data points found for the selected driver and lap.
              </p>
            </div>
          )}
        {!isLoadingTelemetry &&
          !isProcessingChart &&
          !error &&
          selectedDriver &&
          selectedLap &&
          individualChartsData && (
            <div className="telemetry-charts-grid">
              {chartConfigs.map((config) => (
                <div key={config.key} className="telemetry-chart-item">
                  {individualChartsData[config.key] ? (
                    <Line
                      data={individualChartsData[config.key].data}
                      options={individualChartsData[config.key].options}
                    />
                  ) : (
                    // This case might indicate an issue during processing for a specific chart type
                    <p>Chart data for {config.title} unavailable.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        {/* Fallback for initial state or if driver not selected */}
        {!selectedDriver &&
          allSessionDrivers &&
          allSessionDrivers.length > 0 &&
          !isLoadingLapsList &&
          !isLoadingTelemetry && (
            <div className="chart-placeholder">
              <p>Select a driver to load their laps and view telemetry.</p>
            </div>
          )}
      </div>
    </div>
  );
}

export default DriverTelemetryChart;
