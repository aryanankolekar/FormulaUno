import React, { useState, useEffect, useRef } from 'react';
import SeasonSelector from './components/SeasonSelector';
import RaceList from './components/RaceList';
import RaceResults from './components/RaceResults';
import PaceAnalysisChart from './components/PaceAnalysisChart';
import DriverGapChart from './components/DriverGapChart';
import axios from 'axios';
import { OPENF1_BASE_URL } from './apiConfig';

function App() {
  const [currentSeason, setCurrentSeason] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);
  const [viewMode, setViewMode] = useState('selectRace');

  const [allSessionDrivers, setAllSessionDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

  const [visibleCharts, setVisibleCharts] = useState({
    paceChart: false,
    gapChart: false,
  });

  const detailsViewRef = useRef(null);

  const toggleChartVisibility = (chartName) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chartName]: !prev[chartName]
    }));
  };

  const handleSeasonSelected = (season) => {
    setCurrentSeason(season);
    setSelectedRace(null);
    setAllSessionDrivers([]);
    setViewMode('selectRace');
    setVisibleCharts({ paceChart: false, gapChart: false });
    console.log("Selected season in App:", season);
  };

  const handleRaceSelected = (race) => {
    setSelectedRace(race);
    setViewMode('viewRaceDetails');
    setVisibleCharts({ paceChart: false, gapChart: false });
    console.log("Selected race in App:", race);
  };

  const handleBackToRaceList = () => {
    setSelectedRace(null);
    setAllSessionDrivers([]);
    setViewMode('selectRace');
    setVisibleCharts({ paceChart: false, gapChart: false });
  };

  useEffect(() => {
    if (viewMode === 'viewRaceDetails' && selectedRace && detailsViewRef.current) {
      detailsViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedRace, viewMode]);

  useEffect(() => {
    if (selectedRace && selectedRace.session_key) {
      setIsLoadingDrivers(true);
      setAllSessionDrivers([]);
      axios.get(`${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`)
        .then(response => {
          if (Array.isArray(response.data)) {
            setAllSessionDrivers(response.data);
          } else {
            console.error("Fetched drivers data is not an array:", response.data);
            setAllSessionDrivers([]);
          }
          setIsLoadingDrivers(false);
        })
        .catch(error => {
          console.error("Error fetching session drivers:", error);
          setAllSessionDrivers([]);
          setIsLoadingDrivers(false);
        });
    } else {
      setAllSessionDrivers([]);
      setIsLoadingDrivers(false);
    }
  }, [selectedRace?.session_key]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>F1 Data Analysis</h1>
      </header>

      <div className="selectors-container">
        <SeasonSelector onSeasonSelect={handleSeasonSelected} />
      </div>

      {viewMode === 'selectRace' && (
        <div className="race-list-view">
          {currentSeason ? (
            <RaceList season={currentSeason} onRaceSelect={handleRaceSelected} />
          ) : (
            <p className="initial-prompt">Please select a season to begin.</p>
          )}
        </div>
      )}

      {viewMode === 'viewRaceDetails' && selectedRace && (
        <div className="race-details-view" ref={detailsViewRef}>
          <button onClick={handleBackToRaceList} className="back-button">
            &larr; Back to Race List
          </button>
          <div className="race-summary-section">
            <RaceResults selectedRace={selectedRace} />
          </div>

          {!isLoadingDrivers && allSessionDrivers.length > 0 && (
            <div className="chart-controls">
              <button
                onClick={() => toggleChartVisibility('paceChart')}
                className={visibleCharts.paceChart ? 'active' : ''}
              >
                {visibleCharts.paceChart ? 'Hide' : 'Show'} Overall Pace Chart
              </button>
              <button
                onClick={() => toggleChartVisibility('gapChart')}
                className={visibleCharts.gapChart ? 'active' : ''}
              >
                {visibleCharts.gapChart ? 'Hide' : 'Show'} Head-to-Head Gap Chart
              </button>
            </div>
          )}

          {!isLoadingDrivers && allSessionDrivers.length > 0 ? (
            <div className="charts-display-area">
              {visibleCharts.paceChart && (
                <div className="chart-wrapper pace-analysis-section"> {/* Use existing section class for styling */}
                  <PaceAnalysisChart
                    selectedRace={selectedRace}
                    allSessionDrivers={allSessionDrivers}
                  />
                </div>
              )}

              {visibleCharts.paceChart && visibleCharts.gapChart && (
                <hr className="section-divider-minor" /> /* Optional: Use a more subtle divider */
              )}

              {visibleCharts.gapChart && (
                <div className="chart-wrapper driver-gap-chart-section"> {/* Use a distinct class or existing one */}
                  <DriverGapChart
                    selectedRace={selectedRace}
                    allSessionDrivers={allSessionDrivers}
                  />
                </div>
              )}

              {!visibleCharts.paceChart && !visibleCharts.gapChart && (
                <p className="initial-prompt chart-area-prompt">
                  Select a chart to display using the buttons above.
                </p>
              )}
            </div>
          ) : isLoadingDrivers ? (
            <p className="loading-message">Loading driver data for charts...</p>
          ) : (
            <p className="results-placeholder">
              Driver data for this session is unavailable, charts cannot be displayed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
