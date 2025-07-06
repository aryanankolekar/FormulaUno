import React, { useState, useEffect, useRef } from "react";
import SeasonSelector from "./components/SeasonSelector";
import RaceList from "./components/RaceList";
import RaceResults from "./components/RaceResults";
import PaceAnalysisChart from "./components/PaceAnalysisChart";
import DriverGapChart from "./components/DriverGapChart";
import DriverTelemetryChart from "./components/DriverTelemetryChart";
import axios from "axios";
import { OPENF1_BASE_URL } from "./apiConfig";
import Navbar from "./components/Navbar";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
      setAllSessionDrivers([]);
      axios
        .get(
          `${OPENF1_BASE_URL}/drivers?session_key=${selectedRace.session_key}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            setAllSessionDrivers(response.data);
          } else {
            console.error(
              "Fetched drivers data is not an array:",
              response.data
            );
            setAllSessionDrivers([]);
          }
          setIsLoadingDrivers(false);
        })
        .catch((error) => {
          console.error("Error fetching session drivers:", error);
          setAllSessionDrivers([]);
          setIsLoadingDrivers(false);
        });
    } else {
      setAllSessionDrivers([]);
      setIsLoadingDrivers(false);
    }
  }, [selectedRace?.session_key]);

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
                selectedDrivers={selectedDrivers}
                telemetrySettings={telemetrySettings}
                setTelemetrySettings={setTelemetrySettings}
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
