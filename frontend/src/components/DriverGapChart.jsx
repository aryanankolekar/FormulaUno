// frontend/src/components/DriverGapChart.jsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, // For X axis (lap numbers)
  LinearScale,   // For Y axis (gap in seconds)
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { OPENF1_BASE_URL } from '../apiConfig';
import axios from 'axios';

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

// Helper function
const formatGapTime = (seconds, includeSign = true) => {
  if (seconds === null || typeof seconds === 'undefined' || isNaN(seconds)) {
    return "N/A";
  }
  const sign = seconds < 0 ? "-" : (includeSign ? "+" : "");
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  if (minutes > 0) {
    return `${sign}${minutes}:${secs.toFixed(3).padStart(6, '0')}s`;
  }
  return `${sign}${secs.toFixed(3)}s`;
};

// Chart Options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: {
        display: true,
        text: 'Lap Number',
        color: 'var(--color-text-secondary)',
      },
      ticks: { color: 'var(--color-text-secondary)' },
      grid: { color: 'var(--color-border)' }
    },
    y: {
      title: {
        display: true,
        text: 'Gap (seconds)',
        color: 'var(--color-text-secondary)',
      },
      ticks: {
        color: 'var(--color-text-secondary)',
        callback: function(value) {
          return formatGapTime(value, false); // Chart.js handles sign via position
        }
      },
      grid: { color: 'var(--color-border)' }
    }
  },
  plugins: {
    legend: {
      position: 'top',
      labels: { color: 'var(--color-text-primary)'}
    },
    title: {
      display: true,
      text: 'Driver Gap Over Race Laps',
      color: 'var(--color-text-primary)',
      font: { size: 16 }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += formatGapTime(context.parsed.y, true);
          }
          return label;
        }
      }
    }
  }
};


function DriverGapChart({ selectedRace, allSessionDrivers }) {
  const [chartData, setChartData] = useState(null);
  const [sessionLapsData, setSessionLapsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For chart data processing
  const [error, setError] = useState('');

  const [driver1, setDriver1] = useState(null);
  const [driver2, setDriver2] = useState(null);

  // Effect 1: Reset selections and all data when the race changes
  useEffect(() => {
    setDriver1(null);
    setDriver2(null);
    setChartData(null);
    setSessionLapsData(null);
    setError('');
    setIsLoading(false);
    setIsProcessing(false);
  }, [selectedRace]);

  // Effect 2: Fetch all lap data for the selected session
  useEffect(() => {
    if (selectedRace && selectedRace.session_key) {
      setIsLoading(true); // Loading session lap data
      setIsProcessing(false); // Not processing chart yet
      setError('');
      setSessionLapsData(null);
      setChartData(null);

      axios.get(`${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`)
        .then(response => {
          if (Array.isArray(response.data)) {
            setSessionLapsData(response.data);
          } else {
            console.error("Lap data is not an array:", response.data);
            setSessionLapsData([]);
            setError('Failed to load lap data: Unexpected format.');
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error(`Error fetching lap data for session ${selectedRace.session_key}:`, err);
          setError('Failed to load lap data for the session.');
          setSessionLapsData(null);
          setIsLoading(false);
        });
    } else {
      setSessionLapsData(null);
      setChartData(null);
      setIsLoading(false);
      setIsProcessing(false);
      setError('');
    }
  }, [selectedRace?.session_key]);

  // Effect 3: Process lap data into chartData
  useEffect(() => {
    if (driver1 && driver2 && sessionLapsData && sessionLapsData.length > 0) {
      setIsProcessing(true); // Processing chart data
      setError(''); // Clear previous processing errors
      setChartData(null); // Clear previous chart

      try {
        const lapsD1 = sessionLapsData.filter(lap => lap.driver_number === driver1).sort((a, b) => a.lap_number - b.lap_number);
        const lapsD2 = sessionLapsData.filter(lap => lap.driver_number === driver2).sort((a, b) => a.lap_number - b.lap_number);

        const cumulativeTimeD1 = new Map();
        let currentTotalD1 = 0;
        lapsD1.forEach(lap => {
          if (lap.lap_duration) { // Ensure lap_duration is valid
             currentTotalD1 += lap.lap_duration;
             cumulativeTimeD1.set(lap.lap_number, currentTotalD1);
          }
        });

        const cumulativeTimeD2 = new Map();
        let currentTotalD2 = 0;
        lapsD2.forEach(lap => {
          if (lap.lap_duration) { // Ensure lap_duration is valid
            currentTotalD2 += lap.lap_duration;
            cumulativeTimeD2.set(lap.lap_number, currentTotalD2);
          }
        });

        const commonLaps = [];
        const maxLap = Math.max(
            lapsD1.length > 0 ? lapsD1[lapsD1.length-1].lap_number : 0,
            lapsD2.length > 0 ? lapsD2[lapsD2.length-1].lap_number : 0
        );

        for (let i = 1; i <= maxLap; i++) {
          if (cumulativeTimeD1.has(i) && cumulativeTimeD2.has(i)) {
            commonLaps.push(i);
          }
        }

        if (commonLaps.length === 0) {
            setError("Selected drivers have no common laps to compare.");
            setIsProcessing(false);
            return;
        }

        const gapData = commonLaps.map(lapNum => {
          return cumulativeTimeD2.get(lapNum) - cumulativeTimeD1.get(lapNum);
        });

        const driver1Info = allSessionDrivers.find(d => d.driver_number === driver1);
        const driver2Info = allSessionDrivers.find(d => d.driver_number === driver2);
        const d1Name = driver1Info?.name_acronym || `Driver ${driver1}`;
        const d2Name = driver2Info?.name_acronym || `Driver ${driver2}`;

        const teamColorD2 = driver2Info?.team_colour ? `#${driver2Info.team_colour}` : 'var(--color-accent-red)';

        setChartData({
          labels: commonLaps,
          datasets: [
            {
              label: `Gap: ${d2Name} to ${d1Name}`,
              data: gapData,
              borderColor: teamColorD2,
              backgroundColor: `${teamColorD2}80`, // Add alpha for background
              tension: 0.2,
              fill: false,
              pointRadius: Math.max(1, Math.min(3, Math.floor(150 / commonLaps.length))), // Dynamic point size
              pointHoverRadius: 5,
            },
          ],
        });
      } catch (e) {
        console.error("Error processing chart data:", e);
        setError("Failed to process data for the chart.");
        setChartData(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setChartData(null); // Clear chart if drivers deselected or no lap data
      setIsProcessing(false);
    }
  }, [driver1, driver2, sessionLapsData, allSessionDrivers]);


  if (!selectedRace || !selectedRace.session_key) {
    return <div className="chart-placeholder"><p>Select a race to see driver gap analysis.</p></div>;
  }

  const renderDriverSelectors = () => (
    <div className="driver-gap-selectors">
      <div className="driver-selector">
        <label htmlFor="driver1-select">Compare Driver 1 (Reference):</label>
        <select
          id="driver1-select"
          value={driver1 || ''}
          onChange={(e) => setDriver1(e.target.value ? parseInt(e.target.value) : null)}
          disabled={!allSessionDrivers || allSessionDrivers.length === 0 || isLoading || isProcessing}
        >
          <option value="">-- Select Driver 1 --</option>
          {allSessionDrivers && allSessionDrivers.map(driver => (
            <option
              key={`d1-${driver.driver_number}`}
              value={driver.driver_number}
              disabled={driver2 === driver.driver_number}
            >
              {driver.fullName} {driver.name_acronym ? `(${driver.name_acronym})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="driver-selector">
        <label htmlFor="driver2-select">With Driver 2 (Challenger):</label>
        <select
          id="driver2-select"
          value={driver2 || ''}
          onChange={(e) => setDriver2(e.target.value ? parseInt(e.target.value) : null)}
          disabled={!allSessionDrivers || allSessionDrivers.length === 0 || isLoading || isProcessing}
        >
          <option value="">-- Select Driver 2 --</option>
          {allSessionDrivers && allSessionDrivers.map(driver => (
            <option
              key={`d2-${driver.driver_number}`}
              value={driver.driver_number}
              disabled={driver1 === driver.driver_number}
            >
              {driver.fullName} {driver.name_acronym ? `(${driver.name_acronym})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Main return logic
  return (
    <div className="driver-gap-chart-container">
      <h3>Head-to-Head Lap Gap: {selectedRace.meeting_name} ({selectedRace.year})</h3>
      {renderDriverSelectors()}

      {isLoading && <div className="loading-message"><p>Loading session lap data...</p></div>}

      {isProcessing && !isLoading && <div className="loading-message"><p>Processing chart data for selected drivers...</p></div>}

      {error && !isLoading && !isProcessing && <div className="error-message"><p>{error}</p></div>}

      {!isLoading && !isProcessing && !error && (!sessionLapsData || sessionLapsData.length === 0) && (
        <div className="chart-placeholder">
          <p>No lap data available for this session.</p>
        </div>
      )}

      {!isLoading && !isProcessing && !error && sessionLapsData && sessionLapsData.length > 0 && (!driver1 || !driver2) && (
        <div className="chart-placeholder">
          <p>Lap data loaded. Select two drivers to compare their lap-by-lap gap.</p>
        </div>
      )}

      {!isLoading && !isProcessing && !error && chartData && driver1 && driver2 && (
        <div className="driver-gap-chart-area">
           <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Fallback for states not explicitly caught, e.g. data loaded, drivers selected, but chartData is null due to processing issue not setting error */}
      {!isLoading && !isProcessing && !error && sessionLapsData && driver1 && driver2 && !chartData && (
         <div className="chart-placeholder">
            <p>Ready to process data. If chart doesn't appear, check console for errors or ensure drivers have common laps.</p>
         </div>
      )}
    </div>
  );
}

export default DriverGapChart;
