import React, { useState } from 'react';
import SeasonSelector from './components/SeasonSelector';
import RaceList from './components/RaceList';
import RaceResults from './components/RaceResults'; // Import RaceResults
// import './App.css'; // Assuming this was removed or is empty

function App() {
  const [currentSeason, setCurrentSeason] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);

  const handleSeasonSelected = (season) => {
    setCurrentSeason(season);
    setSelectedRace(null); // Clear selected race when season changes
    console.log("Selected season in App:", season);
  };

  const handleRaceSelected = (race) => {
    // The 'race' object from RaceList should now contain 'year' and 'round'
    setSelectedRace(race);
    console.log("Selected race in App:", race);
  };

  return (
    <div>
      <h1>F1 Data Analysis</h1>
      <SeasonSelector onSeasonSelect={handleSeasonSelected} />
      <hr />
      <RaceList season={currentSeason} onRaceSelect={handleRaceSelected} />
      <hr />
      {/* Pass selectedRace to RaceResults */}
      <RaceResults selectedRace={selectedRace} />
    </div>
  );
}

export default App;
