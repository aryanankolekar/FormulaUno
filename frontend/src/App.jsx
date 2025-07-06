import React, { useState, useEffect, useRef } from "react";
import SeasonSelector from "./components/SeasonSelector";
import RaceList from "./components/RaceList";
import RaceResults from "./components/RaceResults";
import PaceAnalysisChart from "./components/PaceAnalysisChart";
import DriverGapChart from "./components/DriverGapChart";
import DriverTelemetryChart from "./components/DriverTelemetryChart";
import TireStrategyGraph from "./components/TireStrategyGraph"; // Import TireStrategyGraph
import axios from "axios";
import { OPENF1_BASE_URL } from "./apiConfig";
import Navbar from "./components/Navbar";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react"; // Import useMemo
import HomePage from "./pages/HomePage";
import DriversPage from "./pages/DriversPage";
import StatsPage from "./pages/StatsPage";

function App() {
  const [currentSeason, setCurrentSeason] = useState(
    () => localStorage.getItem("season") || ""
  );
  const [selectedRace, setSelectedRace] = useState(() => {
    const race = localStorage.getItem("race");
    return race ? JSON.parse(race) : null;
  });
  const [selectedDrivers, setSelectedDrivers] = useState(() => {
    const drivers = localStorage.getItem("drivers");
    return drivers ? JSON.parse(drivers) : [];
  });
  const [telemetrySettings, setTelemetrySettings] = useState(() => {
    const telemetry = localStorage.getItem("telemetry");
    return telemetry ? JSON.parse(telemetry) : {};
  });
  const [viewMode, setViewMode] = useState("selectRace");

  const [allSessionDrivers, setAllSessionDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [raceStintData, setRaceStintData] = useState(null); // New state for stint data
  const [isLoadingStints, setIsLoadingStints] = useState(false); // Loading state for stints
  const [raceLapData, setRaceLapData] = useState(null); // New state for lap data
  const [racePositionData, setRacePositionData] = useState(null); // New state for position data

  const [activeChart, setActiveChart] = useState("pace"); // 'pace', 'gap', 'telemetry'

  const detailsViewRef = useRef(null);

  // Persist state to localStorage on change
  useEffect(() => {
    localStorage.setItem("season", currentSeason);
  }, [currentSeason]);
  useEffect(() => {
    if (selectedRace)
      localStorage.setItem("race", JSON.stringify(selectedRace));
  }, [selectedRace]);
  useEffect(() => {
    localStorage.setItem("drivers", JSON.stringify(selectedDrivers));
  }, [selectedDrivers]);
  useEffect(() => {
    localStorage.setItem("telemetry", JSON.stringify(telemetrySettings));
  }, [telemetrySettings]);

  // Navigation helpers
  const navigate = useNavigate();
  const location = useLocation();

  // Navbar navigation handler
  const handleNav = (path) => {
    navigate(path);
  };

  const handleSeasonSelected = (season) => {
    setCurrentSeason(season);
    setSelectedRace(null);
    setAllSessionDrivers([]);
    setViewMode("selectRace");
    setActiveChart("pace"); // Reset active chart
    console.log("Selected season in App:", season);
  };

  const handleRaceSelected = (race) => {
    setSelectedRace(race);
    setViewMode("viewRaceDetails");
    setActiveChart("pace"); // Reset active chart
    console.log("Selected race in App:", race);
  };

  const handleBackToRaceList = () => {
    setSelectedRace(null);
    setAllSessionDrivers([]);
    setViewMode("selectRace");
    setActiveChart("pace"); // Reset active chart
  };

  useEffect(() => {
    if (
      viewMode === "viewRaceDetails" &&
      selectedRace &&
      detailsViewRef.current
    ) {
      detailsViewRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedRace, viewMode]);

  useEffect(() => {
    if (selectedRace && selectedRace.session_key) {
      setIsLoadingDrivers(true);
      setIsLoadingStints(true);
      setAllSessionDrivers([]);
      setRaceStintData(null);
      setRaceLapData(null);
      setRacePositionData(null);

      // Fetch drivers
      axios
        .get(
          `${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            // Drivers will get their finishing positions from position data later
            setAllSessionDrivers(response.data);
          } else {
            console.error(
              "Fetched drivers data is not an array:",
              response.data
            );
            setAllSessionDrivers([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching session drivers:", error);
          setAllSessionDrivers([]);
        })
        .finally(() => {
          setIsLoadingDrivers(false);
        });

      // Fetch stints
      axios
        .get(
          `${OPENF1_BASE_URL}/stints?session_key=${selectedRace.session_key}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            console.log("Raw stint data from API:", response.data);
            console.log("Sample stint object:", response.data[0]);
            console.log(
              "Available fields in stint:",
              response.data[0] ? Object.keys(response.data[0]) : []
            );
            setRaceStintData(response.data);
          } else {
            console.error(
              "Fetched stints data is not an array:",
              response.data
            );
            setRaceStintData([]); // Use empty array on error to avoid null issues
          }
        })
        .catch((error) => {
          console.error("Error fetching stint data:", error);
          setRaceStintData([]); // Use empty array on error
        })
        .finally(() => {
          setIsLoadingStints(false);
        });

      // Fetch laps for total lap count fallback
      axios
        .get(
          `${OPENF1_BASE_URL}/laps?session_key=${selectedRace.session_key}&lap_duration>0`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            console.log("Raw lap data from API:", response.data.length, "laps");
            setRaceLapData(response.data);
          } else {
            console.error("Fetched laps data is not an array:", response.data);
            setRaceLapData([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching lap data:", error);
          setRaceLapData([]);
        });

      // Fetch position data for finishing positions
      axios
        .get(
          `${OPENF1_BASE_URL}/position?session_key=${selectedRace.session_key}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            console.log(
              "Raw position data from API:",
              response.data.length,
              "positions"
            );
            setRacePositionData(response.data);
          } else {
            console.error(
              "Fetched position data is not an array:",
              response.data
            );
            setRacePositionData([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching position data:", error);
          setRacePositionData([]);
        });
    } else {
      setAllSessionDrivers([]);
      setRaceStintData(null);
      setRaceLapData(null);
      setRacePositionData(null);
      setIsLoadingDrivers(false);
      setIsLoadingStints(false);
    }
  }, [selectedRace?.session_key]);

  const processedDriversForGraph = useMemo(() => {
    if (!allSessionDrivers || !raceStintData || !selectedRace) {
      console.log("processedDriversForGraph: Missing required data", {
        allSessionDrivers: allSessionDrivers?.length,
        raceStintData: raceStintData?.length,
        selectedRace: !!selectedRace,
      });
      return [];
    }

    console.log("processedDriversForGraph: Processing data", {
      driversCount: allSessionDrivers.length,
      stintsCount: raceStintData.length,
      sampleStint: raceStintData[0],
    });

    // Calculate actual finishing positions from position data
    const finalPositions = new Map();
    if (racePositionData && racePositionData.length > 0) {
      // Get the latest position for each driver
      const latestPositionsByDriver = new Map();
      racePositionData.forEach((p) => {
        const existing = latestPositionsByDriver.get(p.driver_number);
        if (!existing || new Date(p.date) > new Date(existing.date)) {
          latestPositionsByDriver.set(p.driver_number, p);
        }
      });
      latestPositionsByDriver.forEach((p) => {
        finalPositions.set(p.driver_number, p.position);
      });
    }

    // Calculate total laps from stint data
    const maxLapFromStints = Math.max(
      ...raceStintData.map((stint) =>
        parseInt(stint.lap_end || stint.end_lap || 0, 10)
      ),
      0
    );
    console.log("Total laps from stints:", maxLapFromStints);

    return allSessionDrivers.map((driver) => {
      const stintsForDriver = raceStintData
        .filter((stint) => stint.driver_number === driver.driver_number)
        .map((stint) => ({
          lapStart: parseInt(stint.lap_start || stint.start_lap || 0, 10),
          lapEnd: parseInt(stint.lap_end || stint.end_lap || 0, 10),
          compound: stint.compound,
        }));

      // Get actual finishing position or use driver number as fallback
      const actualFinishingPosition =
        finalPositions.get(driver.driver_number) || driver.driver_number;

      console.log(
        `Driver ${driver.driver_number} stints:`,
        stintsForDriver,
        `position: ${actualFinishingPosition}`
      );

      return {
        ...driver, // Includes driver_number, name_acronym, etc.
        id: driver.driver_number,
        name: driver.name_acronym || `Driver ${driver.driver_number}`,
        finishingPosition: actualFinishingPosition, // Use actual finishing position
        stints: stintsForDriver,
      };
    });
  }, [allSessionDrivers, raceStintData, racePositionData, selectedRace]);

  // Calculate total laps for the race
  const raceTotalLaps = useMemo(() => {
    // First try to get from stint data
    if (raceStintData && raceStintData.length > 0) {
      const maxLapFromStints = Math.max(
        ...raceStintData.map((stint) =>
          parseInt(stint.lap_end || stint.end_lap || 0, 10)
        ),
        0
      );
      if (maxLapFromStints > 0) {
        console.log("Race total laps from stints:", maxLapFromStints);
        return maxLapFromStints;
      }
    }

    // Fallback to lap data
    if (raceLapData && raceLapData.length > 0) {
      const maxLapFromLaps = Math.max(
        ...raceLapData.map((lap) => parseInt(lap.lap_number || 0, 10)),
        0
      );
      if (maxLapFromLaps > 0) {
        console.log("Race total laps from laps:", maxLapFromLaps);
        return maxLapFromLaps;
      }
    }

    // Final fallback to race object
    const fallbackLaps =
      selectedRace?.laps_completed || selectedRace?.total_laps || 0;
    console.log("Race total laps from race object:", fallbackLaps);
    return fallbackLaps;
  }, [raceStintData, raceLapData, selectedRace]);

  return (
    <div style={{ background: "var(--f1-bg)", minHeight: "100vh" }}>
      <Navbar onNavigate={handleNav} />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2em 1em" }}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                currentSeason={currentSeason}
                setCurrentSeason={setCurrentSeason}
              />
            }
          />
          <Route
            path="/races"
            element={
              <RaceList season={currentSeason} onRaceSelect={setSelectedRace} />
            }
          />
          <Route
            path="/drivers"
            element={
              <DriversPage
                selectedDrivers={selectedDrivers}
                setSelectedDrivers={setSelectedDrivers}
              />
            }
          />
          <Route
            path="/stats"
            element={
              <StatsPage
                selectedRace={selectedRace}
                raceSessionDrivers={allSessionDrivers} // Pass allSessionDrivers instead of selectedDrivers
                raceStintData={raceStintData}
                isLoadingDrivers={isLoadingDrivers}
                isLoadingStints={isLoadingStints}
                // telemetrySettings={telemetrySettings} // Keep if StatsPage uses it elsewhere
                // setTelemetrySettings={setTelemetrySettings} // Keep if StatsPage uses it elsewhere
              />
            }
          />
        </Routes>

        <header className="app-header">
          <h1>F1 Data Analysis</h1>
        </header>

        <div className="selectors-container">
          <SeasonSelector onSeasonSelect={handleSeasonSelected} />
        </div>

        {viewMode === "selectRace" && (
          <div className="race-list-view">
            {currentSeason ? (
              <RaceList
                season={currentSeason}
                onRaceSelect={handleRaceSelected}
              />
            ) : (
              <p className="initial-prompt">Please select a season to begin.</p>
            )}
          </div>
        )}

        {viewMode === "viewRaceDetails" && selectedRace && (
          <div className="race-details-view" ref={detailsViewRef}>
            <button onClick={handleBackToRaceList} className="back-button">
              &larr; Back to Race List
            </button>
            <div className="race-summary-section">
              <RaceResults selectedRace={selectedRace} />
            </div>

            {!isLoadingDrivers && allSessionDrivers.length > 0 && (
              <div className="chart-controls">
                <button
                  onClick={() => setActiveChart("pace")}
                  className={activeChart === "pace" ? "active" : ""}
                >
                  Pace Analysis
                </button>
                <button
                  onClick={() => setActiveChart("gap")}
                  className={activeChart === "gap" ? "active" : ""}
                >
                  Driver Gap
                </button>
                <button
                  onClick={() => setActiveChart("telemetry")}
                  className={activeChart === "telemetry" ? "active" : ""}
                >
                  Telemetry
                </button>
                <button
                  onClick={() => setActiveChart("tireStrategy")}
                  className={activeChart === "tireStrategy" ? "active" : ""}
                >
                  Tire Strategy
                </button>
              </div>
            )}

            <div className="charts-display-area">
              {/* Conditional rendering based on activeChart */}
              {activeChart === "pace" &&
                selectedRace &&
                allSessionDrivers.length > 0 && (
                  <section
                    className="pace-analysis-section"
                    aria-labelledby="pace-analysis-heading"
                  >
                    <h4 id="pace-analysis-heading">Pace Analysis</h4>
                    <PaceAnalysisChart
                      selectedRace={selectedRace}
                      allSessionDrivers={allSessionDrivers}
                    />
                  </section>
                )}
              {activeChart === "gap" &&
                selectedRace &&
                allSessionDrivers.length > 0 && (
                  <section
                    className="driver-gap-chart-section"
                    aria-labelledby="driver-gap-heading"
                  >
                    <h4 id="driver-gap-heading">Driver Gap Analysis</h4>
                    <DriverGapChart
                      selectedRace={selectedRace}
                      allSessionDrivers={allSessionDrivers}
                    />
                  </section>
                )}
              {activeChart === "telemetry" &&
                selectedRace &&
                allSessionDrivers.length > 0 && (
                  <section
                    className="driver-telemetry-chart-section"
                    aria-labelledby="driver-telemetry-heading"
                  >
                    <h4 id="driver-telemetry-heading">Driver Telemetry</h4>
                    <DriverTelemetryChart
                      selectedRace={selectedRace}
                      allSessionDrivers={allSessionDrivers}
                    />
                  </section>
                )}
              {activeChart === "tireStrategy" &&
                selectedRace &&
                allSessionDrivers.length > 0 &&
                raceStintData && ( // Ensure stint data is loaded
                  <section
                    className="tire-strategy-section" // Added a class for potential specific styling
                    aria-labelledby="tire-strategy-heading"
                  >
                    <h4 id="tire-strategy-heading">Tire Strategy Analysis</h4>
                    {/* Props for TireStrategyGraph will be handled in the next step */}
                    <TireStrategyGraph
                      raceData={{
                        totalLaps: raceTotalLaps,
                        name:
                          selectedRace.meeting_name ||
                          selectedRace.race_name ||
                          "Race",
                      }}
                      driverData={processedDriversForGraph} // This will be defined in the next step
                    />
                  </section>
                )}

              {/* Informative messages */}
              {selectedRace &&
                allSessionDrivers.length === 0 &&
                !isLoadingDrivers && (
                  <p className="results-placeholder">
                    No driver data available for this session to display charts.
                  </p>
                )}
              {isLoadingDrivers && (
                <p className="loading-message">
                  Loading driver data for charts...
                </p>
              )}
              {/* Prompt to select a chart if a race is selected, drivers are loaded, but no chart is active (though default is 'pace') */}
              {/* This might be less relevant now with a default active chart */}
              {selectedRace &&
                allSessionDrivers.length > 0 &&
                !isLoadingDrivers &&
                !activeChart && (
                  <p className="initial-prompt chart-area-prompt">
                    Select a chart type to display.
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
