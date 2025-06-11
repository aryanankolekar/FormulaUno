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
      // Removed axios.get for /intervals
    ])
    .then(([positionResponse, driversResponse, lapsResponse, weatherResponse, stintsResponse]) => { // Removed intervalsResponse
      const positionsData = positionResponse.data;
      const driversData = driversResponse.data;
      const lapsData = lapsResponse.data;
      const weatherData = weatherResponse.data;
      const stintsData = stintsResponse.data;
      // Removed intervalsData

      if (!Array.isArray(positionsData) || !Array.isArray(driversData) || !Array.isArray(lapsData) ||
          !Array.isArray(weatherData) || !Array.isArray(stintsData) ) { // Removed check for intervalsData
        console.error("Unexpected data format from OpenF1 API for one or more results components.",
          {positionsData, driversData, lapsData, weatherData, stintsData} // Removed intervalsData from log
        );
        setError('Failed to parse some race results data components from OpenF1.');
        setIsLoading(false);
        return;
      }

      const driversMap = new Map();
      driversData.forEach(d => driversMap.set(d.driver_number, {
        ...d,
        team_colour: d.team_colour ? `#${d.team_colour}` : '#808080'
      }));

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

      const driverLapInfoMap = new Map(); // Renamed from lapsByDriver for clarity
      let overallFastestLap = { duration: Infinity, driver_number: null, lap_number: null };
      lapsData.forEach(lap => {
        const currentMaxLapNumber = driverLapInfoMap.get(lap.driver_number) || 0;
        if (lap.lap_number > currentMaxLapNumber) {
          driverLapInfoMap.set(lap.driver_number, lap.lap_number); // Storing laps completed
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
          lap: overallFastestLap.lap_number,
          driver_number: overallFastestLap.driver_number
        };
      }
      setFastestLapInfo(flInfo);

      if (weatherData.length > 0 && selectedRace.date_start) {
        const raceStartTime = new Date(selectedRace.date_start).getTime();
        let closestWeather = weatherData[0];
        for (const weatherEntry of weatherData) {
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
        driverStints.compounds.push(typeof stint.compound === 'string' ? stint.compound.charAt(0) : '?');
      });
       stintsByDriver.forEach((data, driverNumber) => {
        const driverStints = stintsData.filter(s => s.driver_number === driverNumber);
        data.stopCount = Math.max(0, driverStints.length - 1);
      });

      // Removed finalIntervalsMap and its processing logic

      let winnerLapsCompleted = 0;
      let winnerDriverNumber = null;
      finalPositions.forEach((pos, driverNum) => {
        if (pos === 1) {
          winnerDriverNumber = driverNum;
        }
      });
      if (winnerDriverNumber) {
        winnerLapsCompleted = driverLapInfoMap.get(winnerDriverNumber) || 0;
      }


      const combinedResults = [];
      driversMap.forEach((driver, driverNumber) => {
        const stintInfo = stintsByDriver.get(driverNumber) || { compounds: [], stopCount: 0 };
        const currentDriverPosition = finalPositions.get(driverNumber); // Can be number or 'N/C'
        const currentDriverLaps = driverLapInfoMap.get(driverNumber) || 0;

        const lastPositionData = latestPositionsByDriver.get(driverNumber);
        let intervalOrGap = "N/A"; // Default

        if (currentDriverPosition === 1) {
          intervalOrGap = "Finished";
        } else if (lastPositionData && typeof currentDriverPosition === 'number') {
          if (currentDriverLaps === winnerLapsCompleted && lastPositionData.gap_to_leader_seconds !== undefined && lastPositionData.gap_to_leader_seconds !== null) {
            // On the same lap as the winner, show time gap
            intervalOrGap = `+${parseFloat(lastPositionData.gap_to_leader_seconds).toFixed(3)}s`;
          } else if (currentDriverLaps > 0 && currentDriverLaps < winnerLapsCompleted) {
            // Laps down
            const lapsDown = winnerLapsCompleted - currentDriverLaps;
            intervalOrGap = `+${lapsDown} Lap${lapsDown > 1 ? 's' : ''}`;
          } else if (currentDriverLaps === 0 ) {
             intervalOrGap = "DNF";
          } else {
             // Other cases, e.g. did not start but has position, or other anomalies
             intervalOrGap = "N/A";
          }
        } else if (currentDriverPosition === 'N/C') { // Not classified
          intervalOrGap = "DNF"; // Or "N/C" if preferred
        }
        // Ensure DNF if laps are 0 but somehow got a numeric position (should be caught by N/C)
        if (currentDriverLaps === 0 && typeof currentDriverPosition === 'number' && currentDriverPosition !== 1) {
            intervalOrGap = "DNF";
        }


        combinedResults.push({
          driver_number: driverNumber,
          fullName: driver.full_name || `Driver ${driverNumber}`,
          countryCode: driver.country_code || '',
          teamName: driver.team_name || 'N/A',
          teamColour: driver.team_colour || '#808080',
          position: currentDriverPosition || 'N/C',
          lapsCompleted: currentDriverLaps,
          tyreStints: stintInfo.compounds.join('-'),
          stops: stintInfo.stopCount,
          interval: intervalOrGap // Using the new intervalOrGap logic
        });
      });

      combinedResults.sort((a, b) => {
        if (a.position === 'N/C' && b.position !== 'N/C') return 1;
        if (b.position === 'N/C' && a.position !== 'N/C') return -1;
        if (a.position === 'N/C' && b.position === 'N/C') {
             // If both N/C, sort by laps completed descending
            if ((b.lapsCompleted || 0) !== (a.lapsCompleted || 0) ) {
                return (b.lapsCompleted || 0) - (a.lapsCompleted || 0);
            }
            // If laps are also same for N/C (e.g. both 0), maintain original order or use driver number as tie breaker
            return a.driver_number - b.driver_number;
        }
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
    return <p className="results-placeholder">Select a race from the list to see its results.</p>;
  }

  if (isLoading) {
    return <p className="loading-message">Loading results for {raceName}...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="race-results-container">
      <h2>Results for {raceName} ({selectedRace.year})</h2>
      <div className="race-meta-info">
        {circuitName && <p><strong>Circuit:</strong> {circuitName}</p>}
        {raceDate && <p><strong>Date:</strong> {raceDate}</p>}
        {raceWeather && (
          <p className="weather-info">
            <strong>Weather:</strong> Air {raceWeather.airTemp}°C, Track {raceWeather.trackTemp}°C,
            Humidity {raceWeather.humidity}%, {raceWeather.rainfall ? 'Wet Race' : 'Dry Race'}
          </p>
        )}
      </div>

      {displayResults.length > 0 ? (
        <>
          <h4>Standings:</h4>
          <table className="results-table">
            <thead>
              <tr>
                <th className="col-pos">Pos</th>
                <th className="col-driver">Driver</th>
                <th className="col-team">Team</th>
                <th className="col-laps">Laps</th>
                <th className="col-stops">Stops</th>
                <th className="col-tyres">Tyres</th>
                <th className="col-interval">Interval/Gap</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((result) => (
                <tr key={result.driver_number} className={result.position === 1 ? 'race-winner' : ''}>
                  <td className="col-pos">{result.position}</td>
                  <td
                    className="col-driver driver-cell"
                    style={{ '--team-color': result.teamColour }} // Keep this if .driver-cell uses it for a border
                  >
                    <div className="driver-info-wrapper"> {/* New wrapper for flex layout */}
                      <span className="team-color-strip" style={{ backgroundColor: result.teamColour }}></span>
                      {result.countryCode && (
                        <img
                          src={`https://flagcdn.com/w20/${result.countryCode.toLowerCase()}.png`}
                          alt={`${result.countryCode} flag`}
                          className="driver-country-flag"
                          title={result.countryCode} // Show country code on hover
                        />
                      )}
                      <span className="driver-name">{result.fullName}</span>
                      {/* Country code text can be removed if flag is present, or kept: */}
                      {/* <span className="driver-country">({result.countryCode})</span> */}
                    </div>
                  </td>
                  <td className="col-team">{result.teamName}</td>
                  <td className="col-laps">{result.lapsCompleted}</td>
                  <td className="col-stops">{result.stops}</td>
                  <td className="col-tyres">{result.tyreStints}</td>
                  <td className="col-interval">{result.interval}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
         !isLoading && <p className="results-placeholder">No results data processed for {raceName}. The API might not have detailed standings or data is still processing.</p>
      )}
      {fastestLapInfo && (
        <p className={`fastest-lap ${fastestLapInfo.driver_number ? 'driver-' + fastestLapInfo.driver_number : ''}`}>
          <strong>Fastest Lap:</strong> {fastestLapInfo.time} by {fastestLapInfo.driverName} (Lap {fastestLapInfo.lap})
        </p>
      )}
    </div>
  );
}

export default RaceResults;
