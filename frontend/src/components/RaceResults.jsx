import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OPENF1_BASE_URL } from '../apiConfig';

function RaceResults({ selectedRace }) {
  const [displayResults, setDisplayResults] = useState([]);
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [circuitName, setCircuitName] = useState('');
  const [fastestLapInfo, setFastestLapInfo] = useState(null);
  const [raceWeather, setRaceWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedRace || !selectedRace.session_key) {
      setDisplayResults([]);
      setRaceName('');
      setRaceDate('');
      setCircuitName('');
      setFastestLapInfo(null);
      setRaceWeather(null);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    setRaceName(selectedRace.meeting_name || 'Race');
    setRaceDate(selectedRace.date_start ? new Date(selectedRace.date_start).toLocaleDateString() : '');
    setCircuitName(selectedRace.circuit_short_name || '');
    setFastestLapInfo(null);
    setRaceWeather(null);
    setDisplayResults([]);

    Promise.all([
      axios.get(`${OPENF1_BASE_URL}/position?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`),
      axios.get(`${OPENF1_BASE_URL}/weather?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/stints?session_key=${selectedRace.session_key}`),
      axios.get(`${OPENF1_BASE_URL}/intervals?session_key=${selectedRace.session_key}`) // Added intervals call
    ])
    .then(([positionResponse, driversResponse, lapsResponse, weatherResponse, stintsResponse, intervalsResponse]) => {
      const positionsData = positionResponse.data;
      const driversData = driversResponse.data;
      const lapsData = lapsResponse.data;
      const weatherData = weatherResponse.data;
      const stintsData = stintsResponse.data;
      const intervalsData = intervalsResponse.data; // New data

      if (!Array.isArray(positionsData) || !Array.isArray(driversData) || !Array.isArray(lapsData) ||
          !Array.isArray(weatherData) || !Array.isArray(stintsData) || !Array.isArray(intervalsData)) {
        console.error("Unexpected data format from OpenF1 API for one or more results components.",
          {positionsData, driversData, lapsData, weatherData, stintsData, intervalsData}
        );
        setError('Failed to parse some race results data components from OpenF1.');
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

      const lapsByDriver = new Map(); // Stores max lap_number completed
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

      if (weatherData.length > 0 && selectedRace.date_start) {
        const raceStartTime = new Date(selectedRace.date_start).getTime();
        let closestWeather = weatherData[0];
        // ... (weather processing logic - unchanged)
        for (const weatherEntry of weatherData) { // More robust iteration
            if (Math.abs(new Date(weatherEntry.date).getTime() - raceStartTime) < Math.abs(new Date(closestWeather.date).getTime() - raceStartTime)) {
                closestWeather = weatherEntry;
            }
        }
        setRaceWeather({
          airTemp: closestWeather.air_temperature,
          trackTemp: closestWeather.track_temperature,
          humidity: closestWeather.humidity,
          rainfall: closestWeather.rainfall > 0,
        });
      }

      const stintsByDriver = new Map();
      stintsData.forEach(stint => {
        if (!stintsByDriver.has(stint.driver_number)) {
          stintsByDriver.set(stint.driver_number, { compounds: [], stopCount: 0 });
        }
        const driverStints = stintsByDriver.get(stint.driver_number);
        driverStints.compounds.push(stint.compound.charAt(0));
      });
       stintsByDriver.forEach((data, driverNumber) => {
        const driverStints = stintsData.filter(s => s.driver_number === driverNumber);
        data.stopCount = Math.max(0, driverStints.length - 1);
      });

      // Process Interval Data
      const finalIntervalsMap = new Map();
      if (intervalsData) { // Check if intervalsData is not null/undefined
        intervalsData.forEach(interval => {
            const driverMaxLap = lapsByDriver.get(interval.driver_number) || 0;
            // We want the interval at the driver's last completed lap
            if (interval.lap_number === driverMaxLap) {
                // Prefer gap_to_leader, fallback to interval_to_position_ahead
                let displayInterval = '';
                if (interval.gap_to_leader !== null && typeof interval.gap_to_leader !== 'undefined') {
                    displayInterval = `+${interval.gap_to_leader.toFixed(3)}s`;
                } else if (interval.interval_to_position_ahead !== null && typeof interval.interval_to_position_ahead !== 'undefined') {
                    // This is interval to car ahead, so might need context or be less useful for overall results
                    displayInterval = `+${interval.interval_to_position_ahead.toFixed(3)} (to car ahead)`;
                }
                finalIntervalsMap.set(interval.driver_number, displayInterval);
            }
        });
      }


      const combinedResults = [];
      driversMap.forEach((driver, driverNumber) => {
        const stintInfo = stintsByDriver.get(driverNumber) || { compounds: [], stopCount: 0 };
        const position = finalPositions.get(driverNumber);
        let intervalString = finalIntervalsMap.get(driverNumber) || '';
        if (position === 1) {
            intervalString = 'Finished'; // Leader finishes, no gap.
        } else if (!intervalString && position && position !== 'N/C') {
            // If no specific interval found but driver finished, mark as Laps Down if not on lead lap
            const leaderLaps = lapsByDriver.get(driversData.find(d => finalPositions.get(d.driver_number) === 1)?.driver_number) || 0;
            const driverLaps = lapsByDriver.get(driverNumber) || 0;
            if (leaderLaps > 0 && driverLaps < leaderLaps) {
                intervalString = `+${leaderLaps - driverLaps} Lap(s)`;
            }
        }


        combinedResults.push({
          driver_number: driverNumber,
          fullName: driver.full_name || `Driver ${driverNumber}`,
          countryCode: driver.country_code || '',
          teamName: driver.team_name || 'N/A',
          position: position || 'N/C',
          lapsCompleted: lapsByDriver.get(driverNumber) || 0,
          tyreStints: stintInfo.compounds.join('-'),
          stops: stintInfo.stopCount,
          interval: intervalString
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
      setRaceWeather(null);
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
      {raceWeather && (
        <p>
          <strong>Weather:</strong> Air {raceWeather.airTemp}°C, Track {raceWeather.trackTemp}°C,
          Humidity {raceWeather.humidity}%, {raceWeather.rainfall ? 'Wet Race' : 'Dry Race'}
        </p>
      )}

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
                <th>Stops</th>
                <th>Tyres</th>
                <th>Interval/Gap</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result) => (
                <tr key={result.driver_number}>
                  <td>{result.position}</td>
                  <td>{result.fullName} {result.countryCode ? `(${result.countryCode})` : ''}</td>
                  <td>{result.teamName}</td>
                  <td>{result.lapsCompleted}</td>
                  <td>{result.stops}</td>
                  <td>{result.tyreStints}</td>
                  <td>{result.interval}</td>
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
