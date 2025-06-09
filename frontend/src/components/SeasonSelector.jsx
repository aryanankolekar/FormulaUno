import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SeasonSelector({ onSeasonSelect }) {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/seasons') // Assumes backend is running on the same host/port or proxy is set up
      .then(response => {
        if (response.data && response.data.seasons) {
          setSeasons(response.data.seasons);
          if (response.data.seasons.length > 0) {
            // Optionally pre-select the first season
            // setSelectedSeason(response.data.seasons[0]);
            // onSeasonSelect(response.data.seasons[0]);
          }
        } else {
          setSeasons([]); // Ensure seasons is an array
        }
      })
      .catch(err => {
        console.error("Error fetching seasons:", err);
        setError('Failed to load seasons. Is the backend server running?');
        setSeasons([]); // Ensure seasons is an array on error
      });
  }, []); // Empty dependency array means this runs once on mount

  const handleSeasonChange = (event) => {
    const newSeason = event.target.value;
    setSelectedSeason(newSeason);
    onSeasonSelect(newSeason); // Notify parent component
  };

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <label htmlFor="season-select">Select Season: </label>
      <select id="season-select" value={selectedSeason} onChange={handleSeasonChange} disabled={seasons.length === 0}>
        <option value="">-- Select a Season --</option>
        {seasons.map(season => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SeasonSelector;
