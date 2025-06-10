import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig'; // Import from config

// const OPENF1_BASE_URL = 'https://api.openf1.org/v1'; // Removed

function SeasonSelector({ onSeasonSelect }) {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    axios.get(`${OPENF1_BASE_URL}/meetings?year>=2018`)
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          const years = [...new Set(response.data.map(meeting => meeting.year))]
            .sort((a, b) => b - a);
          setSeasons(years);
        } else {
          setSeasons([]);
          console.warn("Unexpected data format from /meetings:", response.data);
          setError('Failed to parse seasons data from OpenF1.');
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching seasons from OpenF1:", err);
        if (err.response) {
          setError(`Failed to load seasons. API responded with status ${err.response.status}.`);
        } else if (err.request) {
          setError('Failed to load seasons. No response from OpenF1 API. Check network.');
        } else {
          setError('Failed to load seasons. Error setting up request to OpenF1 API.');
        }
        setSeasons([]);
        setIsLoading(false);
      });
  }, []);

  const handleSeasonChange = (event) => {
    const newSeason = event.target.value;
    setSelectedSeason(newSeason);
    onSeasonSelect(newSeason);
  };

  if (isLoading) {
    return <p>Loading seasons from OpenF1...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <label htmlFor="season-select">Select Season (Year): </label>
      <select id="season-select" value={selectedSeason} onChange={handleSeasonChange} disabled={seasons.length === 0}>
        <option value="">-- Select a Season --</option>
        {seasons.map(season => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
      {seasons.length === 0 && !isLoading && !error && <p>No seasons loaded. The OpenF1 API might be down or returned no data.</p>}
    </div>
  );
}

export default SeasonSelector;
