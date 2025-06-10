import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig';

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

// Helper function to format seconds into M:SS.mmm
const formatLapTime = (seconds) => {
  if (seconds === null || typeof seconds === 'undefined') return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const millis = Math.floor((remainingSeconds - Math.floor(remainingSeconds)) * 1000);
  return `${minutes}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const PaceAnalysisChart = ({ selectedRace }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionDrivers, setSessionDrivers] = useState([]);
  const [sessionLapsByDriver, setSessionLapsByDriver] = useState(new Map());
  const [driversToPlot, setDriversToPlot] = useState(new Set());

  useEffect(() => {
    setChartData(null);
    setError('');
    setIsLoading(false);
    setSessionDrivers([]);
    setSessionLapsByDriver(new Map());
    setDriversToPlot(new Set());

    if (!selectedRace || !selectedRace.session_key) {
      return;
    }

    setIsLoading(true);

    Promise.all([
      axios.get(`${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`),
      axios.get(`${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`)
    ])
    .then(([lapsResponse, driversResponse]) => {
      const lapsData = lapsResponse.data;
      const driversData = driversResponse.data;

      if (!Array.isArray(lapsData) || !Array.isArray(driversData)) {
        setError('Failed to parse lap time data from OpenF1.');
        setIsLoading(false);
        return;
      }

      const currentDriversMap = new Map();
      driversData.forEach(d => currentDriversMap.set(d.driver_number, {
        fullName: d.full_name || `Driver ${d.driver_number}`,
        teamColour: d.team_colour ? `#${d.team_colour}` : '#808080',
        driver_number: d.driver_number
      }));

      const currentLapsByDriver = new Map();
      lapsData.forEach(lap => {
        if (!currentDriversMap.has(lap.driver_number)) return;
        if (!currentLapsByDriver.has(lap.driver_number)) {
          currentLapsByDriver.set(lap.driver_number, []);
        }
        if (lap.lap_duration !== null && typeof lap.lap_duration === 'number') {
          currentLapsByDriver.get(lap.driver_number).push({ lap_number: lap.lap_number, lap_duration: lap.lap_duration });
        }
      });

      const sortedAvailableDrivers = [...currentLapsByDriver.keys()]
        .filter(driverNumber => currentDriversMap.has(driverNumber))
        .sort((a, b) => (currentLapsByDriver.get(b)?.length || 0) - (currentLapsByDriver.get(a)?.length || 0))
        .map(driverNumber => currentDriversMap.get(driverNumber));

      setSessionDrivers(sortedAvailableDrivers);
      setSessionLapsByDriver(currentLapsByDriver);

      const initialDriversToPlot = new Set();
      for(let i = 0; i < Math.min(sortedAvailableDrivers.length, 2); i++) {
        initialDriversToPlot.add(sortedAvailableDrivers[i].driver_number);
      }
      setDriversToPlot(initialDriversToPlot);

      setIsLoading(false);
    })
    .catch(err => {
      console.error(`Error fetching pace data for session ${selectedRace.session_key}:`, err);
      setError(`Failed to load initial pace data for ${selectedRace.meeting_name}.`);
      setIsLoading(false);
    });

  }, [selectedRace]);

  useEffect(() => {
    if (driversToPlot.size === 0 || sessionLapsByDriver.size === 0 || sessionDrivers.length === 0) {
      setChartData(null);
      return;
    }

    let maxLaps = 0;
    driversToPlot.forEach(driverNumber => {
      const driverLaps = sessionLapsByDriver.get(driverNumber) || [];
      const currentMax = Math.max(...driverLaps.map(l => l.lap_number), 0);
      if (currentMax > maxLaps) maxLaps = currentMax;
    });

    if (maxLaps === 0) {
      setError(driversToPlot.size > 0 ? "Selected drivers have no lap data." : "No laps to plot.");
      setChartData(null);
      return;
    }
    setError('');

    const labels = Array.from({ length: maxLaps }, (_, i) => `Lap ${i + 1}`);
    const datasets = [];

    driversToPlot.forEach(driverNumber => {
      const driverInfo = sessionDrivers.find(d => d.driver_number === driverNumber);
      if (!driverInfo) return;

      const driverLaps = sessionLapsByDriver.get(driverNumber) || [];
      const lapDataArray = new Array(maxLaps).fill(null);
      driverLaps.forEach(lap => {
        if (lap.lap_number - 1 < maxLaps) {
          lapDataArray[lap.lap_number - 1] = lap.lap_duration;
        }
      });

      datasets.push({
        label: driverInfo.fullName,
        data: lapDataArray,
        borderColor: driverInfo.teamColour,
        backgroundColor: `${driverInfo.teamColour}B3`, // Slightly more opaque for lines if filled
        tension: 0.3, // Smoother curve
        pointRadius: 2,
        pointHoverRadius: 6, // Larger hover radius
        borderWidth: 2, // Thicker line
        hitRadius: 10,
        fill: false,
      });
    });

    if (datasets.length > 0) {
        setChartData({ labels, datasets });
    } else if (driversToPlot.size > 0) {
        setError("No lap data for selected drivers.");
        setChartData(null);
    }

  }, [driversToPlot, sessionLapsByDriver, sessionDrivers]);

  const handleDriverSelectionChange = (driverNumber) => {
    setDriversToPlot(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(driverNumber)) {
        newSelected.delete(driverNumber);
      } else {
        if (newSelected.size < MAX_DRIVERS_ON_CHART) {
          newSelected.add(driverNumber);
        } else {
          alert(`You can select a maximum of ${MAX_DRIVERS_ON_CHART} drivers for comparison.`);
        }
      }
      return newSelected;
    });
  };

  if (!selectedRace || !selectedRace.session_key) {
    return <p className="results-placeholder">Select a race to view pace analysis.</p>;
  }
  if (isLoading && sessionDrivers.length === 0) {
    return <p className="loading-message">Loading pace analysis data for {selectedRace.meeting_name || 'selected race'}...</p>;
  }
  if (error && (!chartData || chartData.datasets.length === 0)) {
    return <p className="error-message">{error}</p>;
  }
  if (!isLoading && sessionDrivers.length === 0 && !error) {
      return <p className="results-placeholder">No driver data available to generate pace chart for this session.</p>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--color-text-primary)', font: { size: 12 } } },
      title: { display: true, text: `Lap Times Comparison - ${selectedRace.meeting_name || 'Selected Race'}`, color: 'var(--color-text-primary)', font: { size: 16, weight: 'bold' } },
      tooltip: {
        mode: 'index',
        intersect: false,
        bodyFont: { size: 12 },
        titleFont: { size: 14, weight: 'bold' },
        callbacks: {
          title: function(tooltipItems) {
            // tooltipItems is an array, use the first item for the label
            if (tooltipItems.length > 0) {
              return tooltipItems[0].label; // This is "Lap X"
            }
            return '';
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatLapTime(context.parsed.y);
            } else {
              label += 'N/A';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: 'Lap Number', color: 'var(--color-text-secondary)', font: { size: 12, weight: 'bold' } },
        ticks: { color: 'var(--color-text-primary)', font: {size: 10} },
        grid: { color: 'var(--color-border)', borderColor: 'var(--color-border)' }
      },
      y: {
        display: true,
        title: { display: true, text: 'Lap Time', color: 'var(--color-text-secondary)', font: { size: 12, weight: 'bold' } },
        ticks: {
          color: 'var(--color-text-primary)',
          font: {size: 10},
          callback: function(value, index, values) {
            return formatLapTime(value); // Format Y-axis ticks
          }
        },
        grid: { color: 'var(--color-border)', borderColor: 'var(--color-border)' }
      }
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <div>
      <div className="driver-selection-container">
        <h4>Select Drivers for Pace Chart (Max {MAX_DRIVERS_ON_CHART}):</h4>
        {sessionDrivers.map(driver => (
          <label key={driver.driver_number} className="driver-checkbox-label">
            <input
              type="checkbox"
              checked={driversToPlot.has(driver.driver_number)}
              onChange={() => handleDriverSelectionChange(driver.driver_number)}
              disabled={driversToPlot.size >= MAX_DRIVERS_ON_CHART && !driversToPlot.has(driver.driver_number)}
            />
            <span style={{ color: driver.teamColour, fontWeight: driversToPlot.has(driver.driver_number) ? 'bold' : 'normal' }}>
              {driver.fullName}
            </span>
          </label>
        ))}
      </div>
      {error && (!chartData || chartData.datasets.length === 0) && <p className="error-message">{error}</p>}
      {(chartData && chartData.datasets.length > 0) ? (
        <div style={{ height: '450px', width: '100%', marginTop: '20px' }}>
          <Line options={options} data={chartData} />
        </div>
      ) : (
        !isLoading && <p className="results-placeholder">Select drivers to display their pace comparison, or no data for current selection.</p>
      )}
    </div>
  );
};

export default PaceAnalysisChart;
