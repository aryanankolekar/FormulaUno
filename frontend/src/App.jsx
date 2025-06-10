import React, { useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import SeasonSelector from './components/SeasonSelector';
import RaceList from './components/RaceList';
import RaceResults from './components/RaceResults';
// import './App.css'; // Assuming this was removed or is empty

function App() {
  const [currentSeason, setCurrentSeason] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);
  const resultsRef = useRef(null); // Create a ref for the RaceResults section

  const handleSeasonSelected = (season) => {
    setCurrentSeason(season);
    setSelectedRace(null);
    console.log("Selected season in App:", season);
  };

  const handleRaceSelected = (race) => {
    setSelectedRace(race);
    console.log("Selected race in App:", race);
  };

  // Scroll to results when a race is selected
  useEffect(() => {
    if (selectedRace && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedRace]); // Dependency array: run when selectedRace changes

  return (
    <div>
      <h1>F1 Data Analysis</h1>
      <SeasonSelector onSeasonSelect={handleSeasonSelected} />
      <hr />
      <RaceList season={currentSeason} onRaceSelect={handleRaceSelected} />
      <hr />
      {/* Add a div with the ref around RaceResults */}
      <div ref={resultsRef}>
        <RaceResults selectedRace={selectedRace} />
      </div>
    </div>
  );
}

export default App;
