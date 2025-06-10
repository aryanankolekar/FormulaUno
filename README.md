# F1 Data Analysis Frontend

This project is a frontend application for displaying Formula 1 data, sourced directly from the [OpenF1 API](https://openf1.org). It allows users to explore F1 seasons, races within those seasons, and the results of individual races.

The application was previously built with a Python/Flask backend and a local SQLite database, but has been refactored to use the OpenF1 API directly from the frontend, simplifying the architecture.

## Features

*   Select a season (year) to view its races.
*   View a list of races for the selected season, including meeting name, circuit, and date.
*   Select a specific race to view its detailed results, including driver standings, team names, laps completed, and fastest lap information.

## Technology Stack

*   **Frontend:** React (with Vite)
*   **Data Source:** [OpenF1 API](https://api.openf1.org/v1/)
*   **HTTP Client:** Axios
*   **Styling:** Basic CSS

## Project Structure

*   `/frontend`: Contains the React application.
    *   `/frontend/src`: Source files for the React app.
        *   `/frontend/src/components`: Reusable React components.
        *   `/frontend/src/apiConfig.js`: Configuration for the OpenF1 API base URL.
        *   `/frontend/src/App.jsx`: Main application component.
        *   `/frontend/src/main.jsx`: Entry point for the React application.
        *   `/frontend/src/index.css`: Global styles.
    *   `/frontend/public`: Static assets.
    *   `frontend/package.json`: Frontend dependencies and scripts.
    *   `frontend/vite.config.js`: Vite configuration.
*   _The `backend/`, `scripts/`, and `data/` directories related to the previous Python backend have been removed._

## Setup and Running the Frontend

1.  **Prerequisites:**
    *   Node.js and npm (or yarn) must be installed.

2.  **Navigate to the Frontend Directory:**
    ```bash
    cd frontend
    ```

3.  **Install Dependencies:**
    If you haven't already, or if `node_modules` is missing, install the necessary packages:
    ```bash
    npm install
    ```
    *(Note: If you encountered issues with `npm install` in a restricted sandbox environment, ensure you run this in your local development environment where npm can execute correctly.)*

4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```

5.  **Access the Application:**
    *   Open your web browser and navigate to the URL provided by Vite (typically `http://localhost:5173` or a similar port).
    *   You should see the "F1 Data Analysis" application.

## How to Use

1.  **Select a Season:** Use the dropdown menu to choose a year. The application will then fetch and display available races for that season from the OpenF1 API.
2.  **Select a Race:** From the list of races, click the "View Results" button for the race you are interested in.
3.  **View Results:** The detailed results for the selected race will be displayed, including driver standings, team names, laps completed, and fastest lap information.

---

This README reflects the current state of the project, focusing on its React frontend and direct OpenF1 API integration.
