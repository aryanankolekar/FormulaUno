import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig'; // Import from config

// const OPENF1_BASE_URL = 'https://api.openf1.org/v1'; // Removed

function RaceResults({ selectedRace }) {
  const [displayResults, setDisplayResults] = useState([]);
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [circuitName, setCircuitName] = useState('');
  const [fastestLapInfo, setFastestLapInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedRace || !selectedRace.session_key) {
      setDisplayResults([]);
      setRaceName('');
      setRaceDate('');
      setCircuitName('');
      setFastestLapInfo(null);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    setRaceName(selectedRace.meeting_name || 'Race');
    setRaceDate(selectedRace.date_start ? new Date(selectedRace.date_start).toLocaleDateString() : '');
    setCircuitName(selectedRace.circuit_short_name || '');

    Promise.all([
      axios.get(`${OPENF1_BASE_URL}/position?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`)
    ])
    .then(([positionResponse, driversResponse, lapsResponse]) => {
      const positionsData = positionResponse.data;
      const driversData = driversResponse.data;
      const lapsData = lapsResponse.data;

      if (!Array.isArray(positionsData) || !Array.isArray(driversData) || !Array.isArray(lapsData)) {
        console.error("Unexpected data format from OpenF1 API for race results components.", {positionsData, driversData, lapsData});
        setError('Failed to parse race results data from OpenF1.');
        setDisplayResults([]);
        setFastestLapInfo(null);
        setIsLoading(false);
        return;
      }

      const driversMap = new Map();
      driversData.forEach(d => driversMap.set(d.driver_number, d));

      const finalPositions = new Map();
      const latestPositionsByDriver = new Map();
      positionsData.forEach(p => {
        const existing = latestPositionsByDriver.get(p.driver_number);
        if (!existing || new Date(p.date) > new Date(existing.date)) {
          latestPositionsByDriver.set(p.driver_number, p);
        }
      });
      latestPositionsByDriver.forEach(p => {
        finalPositions.set(p.driver_number, p.position);
      });

      const lapsByDriver = new Map();
      let overallFastestLap = { duration: Infinity, driver_number: null, lap_number: null };

      lapsData.forEach(lap => {
        const currentMaxLapNumber = lapsByDriver.get(lap.driver_number) || 0;
        if (lap.lap_number > currentMaxLapNumber) {
          lapsByDriver.set(lap.driver_number, lap.lap_number);
        }
        if (lap.lap_duration && lap.lap_duration < overallFastestLap.duration) {
          overallFastestLap = {
            duration: lap.lap_duration,
            driver_number: lap.driver_number,
            lap_number: lap.lap_number
          };
        }
      });

      let flInfo = null;
      if (overallFastestLap.driver_number && driversMap.has(overallFastestLap.driver_number)) {
        const driver = driversMap.get(overallFastestLap.driver_number);
        flInfo = {
          driverName: driver.full_name || `Driver ${overallFastestLap.driver_number}`,
          time: overallFastestLap.duration.toFixed(3) + 's',
          lap: overallFastestLap.lap_number
        };
      }
      setFastestLapInfo(flInfo);

      const combinedResults = [];
      driversMap.forEach((driver, driverNumber) => {
        combinedResults.push({
          driver_number: driverNumber,
          fullName: driver.full_name || `Driver ${driverNumber}`,
          teamName: driver.team_name || 'N/A',
          position: finalPositions.get(driverNumber) || 'N/C',
          lapsCompleted: lapsByDriver.get(driverNumber) || 0
        });
      });

      combinedResults.sort((a, b) => {
        if (a.position === 'N/C' && b.position !== 'N/C') return 1;
        if (b.position === 'N/C' && a.position !== 'N/C') return -1;
        if (a.position === 'N/C' && b.position === 'N/C') return (b.lapsCompleted || 0) - (a.lapsCompleted || 0);
        return (a.position || Infinity) - (b.position || Infinity);
      });

      setDisplayResults(combinedResults);
      setIsLoading(false);
    })
    .catch(err => {
      console.error(`Error fetching detailed results for session ${selectedRace.session_key}:`, err);
      if (err.response) {
        setError(`Failed to load results for ${selectedRace.meeting_name}. OpenF1 API responded with status ${err.response.status}.`);
      } else if (err.request) {
        setError(`Failed to load results for ${selectedRace.meeting_name}. No response from OpenF1 API. Check network.`);
      } else {
        setError(`Failed to load results for ${selectedRace.meeting_name}. Error setting up request to OpenF1 API.`);
      }
      setDisplayResults([]);
      setFastestLapInfo(null);
      setIsLoading(false);
    });

  }, [selectedRace]);

  if (!selectedRace || !selectedRace.session_key) {
    return <p>Select a race from the list to see its results.</p>;
  }

  if (isLoading) {
    return <p>Loading results for {raceName}...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Results for {raceName} ({selectedRace.year})</h2>
      {circuitName && <p><strong>Circuit:</strong> {circuitName}</p>}
      {raceDate && <p><strong>Date:</strong> {raceDate}</p>}

      {displayResults.length > 0 ? (
        <>
          <h4>Standings:</h4>
          <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th>Laps</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result) => (
                <tr key={result.driver_number}>
                  <td>{result.position}</td>
                  <td>{result.fullName}</td>
                  <td>{result.teamName}</td>
                  <td>{result.lapsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
         !isLoading && <p>No results data processed for {raceName}. The API might not have detailed standings or data is still processing.</p>
      )}
      {fastestLapInfo && (
        <p><strong>Fastest Lap:</strong> {fastestLapInfo.time} by {fastestLapInfo.driverName} (Lap {fastestLapInfo.lap})</p>
      )}
    </div>
  );
}

export default RaceResults;
