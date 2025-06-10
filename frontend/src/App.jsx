import React, { useState, useEffect, useRef } from 'react';
import SeasonSelector from './components/SeasonSelector';
import RaceList from './components/RaceList';
import RaceResults from './components/RaceResults';
import PaceAnalysisChart from './components/PaceAnalysisChart'; // Import the new chart component

function App() {
  const [currentSeason, setCurrentSeason] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);
  const [viewMode, setViewMode] = useState('selectRace'); // 'selectRace' or 'viewRaceDetails'

  const detailsViewRef = useRef(null);

  const handleSeasonSelected = (season) => {
    setCurrentSeason(season);
    setSelectedRace(null);
    setViewMode('selectRace');
    console.log("Selected season in App:", season);
  };

  const handleRaceSelected = (race) => {
    setSelectedRace(race);
    setViewMode('viewRaceDetails');
    console.log("Selected race in App:", race);
  };

  const handleBackToRaceList = () => {
    setSelectedRace(null);
    setViewMode('selectRace');
  };

  useEffect(() => {
    if (viewMode === 'viewRaceDetails' && selectedRace && detailsViewRef.current) {
      detailsViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedRace, viewMode]);

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
          <hr className="section-divider" />
          <div className="pace-analysis-section">
            {/* Title is now part of PaceAnalysisChart or can be added here if needed */}
            {/* <h4>Pace Analysis</h4> */}
            <PaceAnalysisChart selectedRace={selectedRace} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
