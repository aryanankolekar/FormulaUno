import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig'; // Import from config

// const OPENF1_BASE_URL = 'https://api.openf1.org/v1'; // Removed

function RaceList({ season, onRaceSelect }) {
  const [races, setRaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // For race sessions
  const [error, setError] = useState(''); // For race sessions

  const [circuitsMap, setCircuitsMap] = useState(new Map());
  const [isLoadingCircuits, setIsLoadingCircuits] = useState(false);
  const [circuitsError, setCircuitsError] = useState('');

  useEffect(() => {
    if (season) {
      const fetchCircuits = async () => {
        setIsLoadingCircuits(true);
        setCircuitsError('');
        try {
          const response = await axios.get(`${OPENF1_BASE_URL}/circuits`);
          if (response.data && Array.isArray(response.data)) {
            const newMap = new Map();
            response.data.forEach(circuit => {
              // Storing more circuit info if needed later, e.g., location, country
              newMap.set(circuit.circuit_key, {
                name: circuit.circuit_name,
                short_name: circuit.circuit_short_name, // circuit_short_name is already on session, but good to have consistency
                location: circuit.location,
                country_code: circuit.country_code
              });
            });
            setCircuitsMap(newMap);
          } else {
            setCircuitsError("Circuit data is not in expected format.");
            setCircuitsMap(new Map());
          }
        } catch (err) {
          console.error("Error fetching circuits:", err);
          setCircuitsError("Failed to load circuit data.");
          setCircuitsMap(new Map());
        } finally {
          setIsLoadingCircuits(false);
        }
      };
      fetchCircuits();
    } else {
      setCircuitsMap(new Map()); // Clear map if no season
      setCircuitsError('');
    }
  }, [season]);


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
        .filter(session => session.meeting_key && session.session_key && session.circuit_key) // Ensure circuit_key exists
        .map(session => ({
          session_key: session.session_key,
          meeting_key: session.meeting_key,
          circuit_key: session.circuit_key, // Keep circuit_key for lookup
          meeting_name: meetingsMap.get(session.meeting_key) || session.session_name || 'Unknown Grand Prix',
          // circuit_short_name is still on session, can be used as fallback or primary
          circuit_short_name: session.circuit_short_name || 'Unknown Circuit',
          date_start: session.date_start,
          year: parseInt(season),
          total_laps: session.session_laps, // Add this line
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

  if (isLoading || isLoadingCircuits) { // Check both loading states
    return <p>Loading data for {season} from OpenF1... (Races: {isLoading ? 'Loading...' : 'Done'}, Circuits: {isLoadingCircuits ? 'Loading...' : 'Done'})</p>;
  }

  if (error) { // Main error for races
    return <p style={{ color: 'red' }}>{error}</p>;
  }
  if (circuitsError) { // Display circuit specific error (could be less critical)
    // Decide if this should block rendering races or just be a warning
    return <p style={{ color: 'orange' }}>Warning: {circuitsError} Races may display without full circuit details.</p>;
  }


  if (races.length === 0 && !isLoading) { // Ensure not to show "no races" if still loading
    return <p>No races found for the {season} season using OpenF1. The API might have no data for this year or there was an issue.</p>;
  }

  // Note: The rendering part will be updated in a subsequent step to use circuitsMap.
  // For now, it uses circuit_short_name from the session data.
  // The section class "race-list-section" can be added to the root div if desired, or keep it as is.
  return (
    <div className="race-list-section">
      <h3>Races in {season}</h3>
      <div className="race-list-grid-container">
        {races.map(race => {
          const circuitInfo = circuitsMap.get(race.circuit_key);
          const fullCircuitName = circuitInfo?.name || race.circuit_short_name; // Used for alt text and potentially for image URL construction if different from short_name
          const circuitDisplayName = circuitInfo?.short_name || race.circuit_short_name;
          const countryDisplay = circuitInfo?.country_code || 'N/A'; // Assuming country_code is available on circuitInfo

          // New image URL construction for local SVGs
          const imageUrl = `/circuits/${race.circuit_key}.svg`;
          const altText = circuitInfo ? `Circuit layout for ${circuitInfo.name}` : `Circuit layout for ${race.circuit_short_name}`;

          return (
            <div key={race.session_key} className="race-list-item-card">
              <img
                src={imageUrl}
                alt={altText}
                className="circuit-layout-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextSibling;
                  if (placeholder && placeholder.classList.contains('circuit-image-placeholder')) {
                    placeholder.style.display = 'flex';
                  }
                }}
              />
              <div
                className="circuit-image-placeholder"
                style={{ display: 'none' }} // Initially hidden, shown by onError
              >
                No Image Available
              </div>

              <div className="race-card-details">
                <h4 className="race-card-name">Round {race.round}: {race.meeting_name}</h4>
                <p className="race-card-circuit">
                  {circuitDisplayName} ({countryDisplay})
                </p>
                <p className="race-card-date">
                  Date: {new Date(race.date_start).toLocaleDateString()}
                </p>
                {/* Assuming total_laps might be available on race object in future */}
                <p className="race-card-laps">Laps: {race.total_laps || 'N/A'}</p>
              </div>

              <button onClick={() => handleRaceClick(race)} className="race-card-button">
                View Race Details
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RaceList;
