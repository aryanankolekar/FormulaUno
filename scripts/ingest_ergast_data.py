#!/usr/bin/env python3

import sqlite3
import requests
import os
import json # Added for loading local JSON

DB_PATH = 'data/f1_data.db'
SAMPLE_DATA_PATH = 'data/sample_ergast_data.json'

def create_tables(conn):
    """Creates the necessary tables in the F1 database if they don't already exist."""
    cursor = conn.cursor()
    # Circuits Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS circuits (
            circuitId TEXT PRIMARY KEY,
            circuitName TEXT,
            country TEXT,
            locality TEXT,
            url TEXT
        )
    ''')
    # Constructors Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS constructors (
            constructorId TEXT PRIMARY KEY,
            constructorName TEXT,
            nationality TEXT,
            url TEXT
        )
    ''')
    # Drivers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drivers (
            driverId TEXT PRIMARY KEY,
            givenName TEXT,
            familyName TEXT,
            nationality TEXT,
            dateOfBirth TEXT,
            permanentNumber TEXT,
            code TEXT,
            url TEXT
        )
    ''')
    # Races Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS races (
            raceId INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER,
            round INTEGER,
            circuitId TEXT,
            raceName TEXT,
            date TEXT,
            time TEXT,
            url TEXT,
            FOREIGN KEY (circuitId) REFERENCES circuits(circuitId)
        )
    ''')
    # Status Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS status (
            statusId TEXT PRIMARY KEY,
            status TEXT
        )
    ''')
    # Results Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            resultId INTEGER PRIMARY KEY AUTOINCREMENT,
            raceId INTEGER,
            driverId TEXT,
            constructorId TEXT,
            position INTEGER,
            points REAL,
            statusId TEXT,
            grid INTEGER,
            laps INTEGER,
            time TEXT,
            fastestLapTime TEXT,
            fastestLapSpeed TEXT,
            FOREIGN KEY (raceId) REFERENCES races(raceId),
            FOREIGN KEY (driverId) REFERENCES drivers(driverId),
            FOREIGN KEY (constructorId) REFERENCES constructors(constructorId),
            FOREIGN KEY (statusId) REFERENCES status(statusId)
        )
    ''')
    conn.commit()
    print("Tables checked/created successfully with updated schemas.")

def fetch_season_results(year):
    """
    Fetches all results for a given F1 season from the Ergast API.
    Falls back to a local sample JSON file if the API request fails.
    """
    url = f"http://ergast.com/api/f1/{year}/results.json?limit=1000"
    print(f"Attempting to fetch data from API: {url}")
    try:
        response = requests.get(url, timeout=10) # Shorter timeout for faster fallback
        response.raise_for_status()
        print(f"API request successful, status code: {response.status_code}")
        return response.json()
    except (requests.exceptions.RequestException, requests.exceptions.HTTPError) as e:
        print(f"API request failed: {e}. Attempting to load from local file: {SAMPLE_DATA_PATH}")
        try:
            with open(SAMPLE_DATA_PATH, 'r') as f:
                print(f"Successfully loaded data from {SAMPLE_DATA_PATH}")
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: Local sample data file not found at {SAMPLE_DATA_PATH}.")
            return None
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {SAMPLE_DATA_PATH}.")
            return None
        except Exception as local_e:
            print(f"An unexpected error occurred while loading local file: {local_e}")
            return None

# --- Insertion Functions (assumed unchanged from previous step, for brevity) ---
def insert_circuit(cursor, circuit_data):
    sql = '''INSERT OR IGNORE INTO circuits (circuitId, circuitName, locality, country, url)
             VALUES (?, ?, ?, ?, ?)'''
    try:
        cursor.execute(sql, (
            circuit_data.get('circuitId'),
            circuit_data.get('circuitName'),
            circuit_data.get('Location', {}).get('locality'),
            circuit_data.get('Location', {}).get('country'),
            circuit_data.get('url')
        ))
    except sqlite3.Error as e:
        print(f"Error inserting circuit {circuit_data.get('circuitId')}: {e}")

def insert_driver(cursor, driver_data):
    sql = '''INSERT OR IGNORE INTO drivers (driverId, givenName, familyName, nationality, dateOfBirth, permanentNumber, code, url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'''
    try:
        cursor.execute(sql, (
            driver_data.get('driverId'),
            driver_data.get('givenName'),
            driver_data.get('familyName'),
            driver_data.get('nationality'),
            driver_data.get('dateOfBirth'),
            driver_data.get('permanentNumber'),
            driver_data.get('code'),
            driver_data.get('url')
        ))
    except sqlite3.Error as e:
        print(f"Error inserting driver {driver_data.get('driverId')}: {e}")

def insert_constructor(cursor, constructor_data):
    sql = '''INSERT OR IGNORE INTO constructors (constructorId, constructorName, nationality, url)
             VALUES (?, ?, ?, ?)'''
    try:
        cursor.execute(sql, (
            constructor_data.get('constructorId'),
            constructor_data.get('name'),
            constructor_data.get('nationality'),
            constructor_data.get('url')
        ))
    except sqlite3.Error as e:
        print(f"Error inserting constructor {constructor_data.get('constructorId')}: {e}")

def insert_status(cursor, status_id, status_text):
    sql = '''INSERT OR IGNORE INTO status (statusId, status)
             VALUES (?, ?)'''
    try:
        cursor.execute(sql, (status_id, status_text))
    except sqlite3.Error as e:
        print(f"Error inserting status {status_id}: {e}")


def insert_race(cursor, race_data, year, circuit_id):
    sql = '''INSERT INTO races (year, round, circuitId, raceName, date, time, url)
             VALUES (?, ?, ?, ?, ?, ?, ?)'''
    # Ensure 'year' from race_data (if available) or target_year is used consistently.
    # The API provides 'season' in race_data, which should map to 'year'.
    current_year = race_data.get('season', year)
    try:
        cursor.execute(sql, (
            current_year, # Use year from race data
            race_data.get('round'),
            circuit_id,
            race_data.get('raceName'),
            race_data.get('date'),
            race_data.get('time'),
            race_data.get('url')
        ))
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"Error inserting race {race_data.get('raceName')} for year {current_year}: {e}")
        return None

def insert_result(cursor, result_data, race_id, driver_id, constructor_id, status_id):
    sql = '''INSERT INTO results (raceId, driverId, constructorId, position, points, statusId,
                                grid, laps, time, fastestLapTime, fastestLapSpeed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'''
    try:
        finish_time = result_data.get('Time', {}).get('time') if 'Time' in result_data else None
        fastest_lap_data = result_data.get('FastestLap', {})
        fastest_lap_time = fastest_lap_data.get('Time', {}).get('time') if fastest_lap_data else None
        fastest_lap_speed = fastest_lap_data.get('AverageSpeed', {}).get('speed') if fastest_lap_data else None

        cursor.execute(sql, (
            race_id,
            driver_id,
            constructor_id,
            result_data.get('position'),
            result_data.get('points'),
            status_id,
            result_data.get('grid'),
            result_data.get('laps'),
            finish_time,
            fastest_lap_time,
            fastest_lap_speed
        ))
    except sqlite3.Error as e:
        print(f"Error inserting result for race {race_id}, driver {driver_id}: {e}")

def verify_data_insertion(conn):
    """Connects to the DB and executes SELECT queries to verify data insertion."""
    print("\n--- Verifying Data Insertion ---")
    cursor = conn.cursor()

    try:
        print("\n-- Races --")
        cursor.execute("SELECT raceId, year, round, raceName, circuitId FROM races")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Drivers (First 5) --")
        cursor.execute("SELECT driverId, givenName, familyName, nationality FROM drivers LIMIT 5")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Constructors (First 5) --")
        cursor.execute("SELECT constructorId, constructorName, nationality FROM constructors LIMIT 5")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Circuits (First 5) --")
        cursor.execute("SELECT circuitId, circuitName, country FROM circuits LIMIT 5")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Status (First 5) --")
        cursor.execute("SELECT statusId, status FROM status LIMIT 5")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Results (First 5) --")
        cursor.execute("SELECT resultId, raceId, driverId, constructorId, position, points, statusId FROM results LIMIT 5")
        for row in cursor.fetchall():
            print(row)

        print("\n-- Count of rows in Results --")
        cursor.execute("SELECT COUNT(*) FROM results")
        print(cursor.fetchone()[0])

    except sqlite3.Error as e:
        print(f"An error occurred during data verification: {e}")
    print("--- End of Verification ---")


if __name__ == '__main__':
    target_year = 2023 # This will be used if API data doesn't specify season for a race.
                       # The sample data has "season":"2023" within each race object.

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        print(f"Successfully connected to database at {DB_PATH}")

        create_tables(conn)

        # Clear tables before inserting from sample to ensure clean test
        # For a real scenario, you might not do this or have smarter updates
        print("Clearing existing data for a clean test run with sample data...")
        for table in ["results", "races", "circuits", "drivers", "constructors", "status"]:
            cursor.execute(f"DELETE FROM {table}")
        conn.commit()
        print("Existing data cleared.")

        season_data = fetch_season_results(target_year) # target_year is mainly for API URL

        if season_data and 'MRData' in season_data and 'RaceTable' in season_data['MRData'] and 'Races' in season_data['MRData']['RaceTable']:
            races_list = season_data['MRData']['RaceTable']['Races']
            # Determine year from data if possible, else use target_year
            # The sample data's RaceTable has a "season" field.
            actual_year_for_data = season_data['MRData']['RaceTable'].get('season', str(target_year))
            print(f"Processing data for season: {actual_year_for_data}. Found {len(races_list)} races.")

            races_processed = 0
            results_processed = 0
            # ... (counters for inserted items)
            initial_driver_count = cursor.execute("SELECT COUNT(*) FROM drivers").fetchone()[0]
            initial_constructor_count = cursor.execute("SELECT COUNT(*) FROM constructors").fetchone()[0]
            initial_circuit_count = cursor.execute("SELECT COUNT(*) FROM circuits").fetchone()[0]
            initial_status_count = cursor.execute("SELECT COUNT(*) FROM status").fetchone()[0]


            for race_info in races_list:
                circuit_data = race_info.get('Circuit')
                if circuit_data:
                    insert_circuit(cursor, circuit_data)

                # Pass the season from the race_info itself to insert_race
                db_race_id = insert_race(cursor, race_info, race_info.get('season', actual_year_for_data), circuit_data.get('circuitId') if circuit_data else None)
                if db_race_id is None:
                    print(f"Skipping results for race {race_info.get('raceName')} due to insertion error.")
                    continue
                races_processed += 1

                for result_entry in race_info.get('Results', []):
                    driver_data = result_entry.get('Driver')
                    if driver_data:
                        insert_driver(cursor, driver_data)

                    constructor_data = result_entry.get('Constructor')
                    if constructor_data:
                        insert_constructor(cursor, constructor_data)

                    status_text = result_entry.get('status')
                    if status_text:
                        insert_status(cursor, status_text, status_text)

                    insert_result(cursor, result_entry, db_race_id,
                                  driver_data.get('driverId') if driver_data else None,
                                  constructor_data.get('constructorId') if constructor_data else None,
                                  status_text)
                    results_processed += 1

            conn.commit()
            print("All data processing and insertion finished.")

            drivers_inserted = cursor.execute("SELECT COUNT(*) FROM drivers").fetchone()[0] - initial_driver_count
            constructors_inserted = cursor.execute("SELECT COUNT(*) FROM constructors").fetchone()[0] - initial_constructor_count
            circuits_inserted = cursor.execute("SELECT COUNT(*) FROM circuits").fetchone()[0] - initial_circuit_count
            status_entries_inserted = cursor.execute("SELECT COUNT(*) FROM status").fetchone()[0] - initial_status_count

            print(f"\n--- Summary for {actual_year_for_data} (from sample data) ---")
            print(f"Races processed and inserted: {races_processed}")
            print(f"Results processed and inserted: {results_processed}")
            print(f"New unique drivers inserted: {drivers_inserted}")
            print(f"New unique constructors inserted: {constructors_inserted}")
            print(f"New unique circuits inserted: {circuits_inserted}")
            print(f"New unique status entries inserted: {status_entries_inserted}")

            verify_data_insertion(conn) # Call verification function

        else:
            print(f"Failed to fetch or parse data (even from local sample). No data processed.")
            if season_data:
                 print(f"Data structure snippet: {str(season_data)[:200]}")

    except sqlite3.Error as e:
        print(f"Database error occurred: {e}")
        if conn: conn.rollback()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if conn: conn.rollback()
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")
