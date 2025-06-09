import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RaceList({ season, onRaceSelect }) {
  const [races, setRaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!season) {
      setRaces([]);
      return;
    }

    setIsLoading(true);
    setError('');
    axios.get(`/api/races/${season}`)
      .then(response => {
        if (response.data && response.data.races) {
          // Each 'race' object from API already includes year and round, which RaceResults will need
          // Ensure that the API for /api/races/{season} returns these.
          // The backend app.py for get_races_by_year currently returns:
          // 'round', 'raceName', 'date', 'time', 'raceUrl', 'circuitName', 'circuitUrl'
          // It needs to also return 'year' for onRaceSelect to pass it to RaceResults correctly.
          // For now, we assume 'year' is part of the race object or add it.
          // Let's add 'year' to each race object here if it's not coming from backend (it should though).
          const racesWithSeason = response.data.races.map(r => ({ ...r, year: season }));
          setRaces(racesWithSeason);
        } else {
          setRaces([]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(`Error fetching races for season ${season}:`, err);
        setError(`Failed to load races for ${season}.`);
        setRaces([]);
        setIsLoading(false);
      });
  }, [season]);

  if (!season) {
    return <p>Please select a season to see the races.</p>;
  }

  if (isLoading) {
    return <p>Loading races for {season}...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (races.length === 0) {
    return <p>No races found for the {season} season.</p>;
  }

  return (
    <div>
      <h3>Races in {season}</h3>
      <ul>
        {races.map(race => (
          <li key={`${race.round}-${race.raceName}`}>
            <strong>Round {race.round}: {race.raceName}</strong> ({race.date})
            <br />
            <em>{race.circuitName}</em>
            <br />
            <button onClick={() => onRaceSelect(race)} style={{ marginLeft: '10px', cursor: 'pointer' }}>
              View Results
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RaceList;
