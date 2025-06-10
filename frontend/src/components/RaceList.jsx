import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig'; // Import from config

// const OPENF1_BASE_URL = 'https://api.openf1.org/v1'; // Removed

function RaceList({ season, onRaceSelect }) {
  const [races, setRaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!season) {
      setRaces([]);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    Promise.all([
      axios.get(`${OPENF1_BASE_URL}/sessions?year=${season}&session_type=Race`),
      axios.get(`${OPENF1_BASE_URL}/meetings?year=${season}`)
    ])
    .then(([sessionsResponse, meetingsResponse]) => {
      const raceSessions = sessionsResponse.data;
      const meetingsData = meetingsResponse.data;

      if (!Array.isArray(raceSessions) || !Array.isArray(meetingsData)) {
        console.error("Unexpected data format from OpenF1 API. Expected arrays.", { sessions: raceSessions, meetings: meetingsData });
        setError('Failed to parse race data from OpenF1.');
        setRaces([]);
        setIsLoading(false);
        return;
      }

      const meetingsMap = new Map();
      meetingsData.forEach(meeting => {
        meetingsMap.set(meeting.meeting_key, meeting.meeting_name);
      });

      const processedRaces = raceSessions
        .filter(session => session.meeting_key && session.session_key)
        .map(session => ({
          session_key: session.session_key,
          meeting_key: session.meeting_key,
          meeting_name: meetingsMap.get(session.meeting_key) || session.session_name || 'Unknown Grand Prix',
          circuit_short_name: session.circuit_short_name || 'Unknown Circuit',
          date_start: session.date_start,
          year: parseInt(season),
        }))
        .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
        .map((race, index) => ({
          ...race,
          round: index + 1
        }));

      setRaces(processedRaces);
      setIsLoading(false);
    })
    .catch(err => {
      console.error(`Error fetching race data for season ${season} from OpenF1:`, err);
      if (err.response) {
        setError(`Failed to load races for ${season}. OpenF1 API responded with status ${err.response.status}.`);
      } else if (err.request) {
        setError(`Failed to load races for ${season}. No response from OpenF1 API. Check network.`);
      } else {
        setError(`Failed to load races for ${season}. Error setting up request to OpenF1 API.`);
      }
      setRaces([]);
      setIsLoading(false);
    });

  }, [season]);

  const handleRaceClick = (race) => {
    onRaceSelect(race);
  };

  if (!season) {
    return <p>Please select a season to see the races.</p>;
  }

  if (isLoading) {
    return <p>Loading races for {season} from OpenF1...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (races.length === 0) {
    return <p>No races found for the {season} season using OpenF1. The API might have no data for this year or there was an issue.</p>;
  }

  return (
    <div>
      <h3>Races in {season}</h3>
      <ul>
        {races.map(race => (
          <li key={race.session_key}>
            <strong>Round {race.round}: {race.meeting_name}</strong>
            <br />
            <em>{race.circuit_short_name} - {new Date(race.date_start).toLocaleDateString()}</em>
            <br />
            <button onClick={() => handleRaceClick(race)}>View Results</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RaceList;
