import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RaceResults({ selectedRace }) { // selectedRace is an object like { year, round, raceName, ... }
  const [raceDetails, setRaceDetails] = useState(null);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedRace || typeof selectedRace.year === 'undefined' || typeof selectedRace.round === 'undefined') {
      setRaceDetails(null);
      setResults([]);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    axios.get(`/api/results/${selectedRace.year}/${selectedRace.round}`)
      .then(response => {
        if (response.data) {
          setRaceDetails(response.data.raceInfo);
          setResults(response.data.results || []);
        } else {
          setRaceDetails(null);
          setResults([]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(`Error fetching results for race ${selectedRace.raceName}:`, err);
        setError(`Failed to load results for ${selectedRace.raceName}.`);
        setRaceDetails(null);
        setResults([]);
        setIsLoading(false);
      });
  }, [selectedRace]); // Re-run effect when selectedRace changes

  if (!selectedRace) {
    return <p>Select a race from the list to see its results.</p>;
  }

  if (isLoading) {
    return <p>Loading results for {selectedRace.raceName}...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!raceDetails) {
    // This can happen briefly if selectedRace is set but data hasn't loaded,
    // or if API call fails and error is not yet set, or API returns no raceInfo.
    // The isLoading check should ideally cover most cases.
    // Consider if a specific "No details found" is needed or if error/loading covers it.
    return <p>No details available for the selected race.</p>;
  }

  return (
    <div>
      <h2>Results for {raceDetails.raceName} ({raceDetails.year})</h2>
      <p><strong>Circuit:</strong> {raceDetails.circuitName} ({raceDetails.circuitLocality}, {raceDetails.circuitCountry})</p>
      <p><strong>Date:</strong> {raceDetails.date} {raceDetails.raceTime || ''}</p>

      <h4>Standings:</h4>
      {results.length > 0 ? (
        <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Driver</th>
              <th>Constructor</th>
              <th>Laps</th>
              <th>Grid</th>
              <th>Time/Status</th>
              <th>Points</th>
              <th>Fastest Lap</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={result.driverId || index}> {/* Use driverId or index as key */}
                <td>{result.position}</td>
                <td>{result.driverGivenName} {result.driverFamilyName} {result.driverCode ? `(${result.driverCode})` : ''}</td>
                <td>{result.constructorName}</td>
                <td>{result.laps}</td>
                <td>{result.grid}</td>
                <td>{result.resultTime || result.status}</td>
                <td>{result.points}</td>
                <td>{result.fastestLapTime || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No results available for this race.</p>
      )}
    </div>
  );
}

export default RaceResults;
