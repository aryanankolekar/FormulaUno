import sqlite3
from flask import Flask, jsonify, g
from flask_cors import CORS # Import CORS

DATABASE = '../data/f1_data.db' # Relative path to the database

app = Flask(__name__)
# Initialize CORS for the app, allowing requests from the Vite dev server
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row # Access columns by name
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def dict_from_row(row):
    """Converts a sqlite3.Row object to a dictionary."""
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}

@app.route('/api/hello')
def hello():
    return jsonify(message="Hello from F1 Data API!")

@app.route('/api/seasons')
def get_seasons():
    try:
        db = get_db()
        cursor = db.execute("SELECT DISTINCT year FROM races ORDER BY year DESC;")
        rows = cursor.fetchall()
        seasons = [row['year'] for row in rows]
        return jsonify(seasons=seasons)
    except sqlite3.Error as e:
        print(f"Database error in /api/seasons: {e}")
        return jsonify(error=f"Database error: {str(e)}"), 500
    except Exception as e:
        print(f"Unexpected error in /api/seasons: {e}")
        return jsonify(error=f"An unexpected error occurred: {str(e)}"), 500

@app.route('/api/races/<int:year>')
def get_races_by_year(year):
    try:
        db = get_db()
        query = """
            SELECT r.round, r.raceName, r.date, r.time, r.url as raceUrl,
                   c.circuitName, c.url as circuitUrl
            FROM races r
            JOIN circuits c ON r.circuitId = c.circuitId
            WHERE r.year = ?
            ORDER BY r.round ASC;
        """
        cursor = db.execute(query, (year,))
        rows = cursor.fetchall()

        if not rows:
            return jsonify(error=f"No races found for the year {year}."), 404

        races_list = [dict_from_row(row) for row in rows]
        return jsonify(races=races_list)
    except sqlite3.Error as e:
        print(f"Database error in /api/races/{year}: {e}")
        return jsonify(error=f"Database error: {str(e)}"), 500
    except Exception as e:
        print(f"Unexpected error in /api/races/{year}: {e}")
        return jsonify(error=f"An unexpected error occurred: {str(e)}"), 500

@app.route('/api/results/<int:year>/<int:round_num>')
def get_race_results(year, round_num):
    try:
        db = get_db()

        race_query = """
            SELECT r.raceId, r.year, r.round, r.raceName, r.date, r.time AS raceTime, r.url AS raceUrl,
                   c.circuitId, c.circuitName, c.locality AS circuitLocality, c.country AS circuitCountry, c.url AS circuitUrl
            FROM races r
            JOIN circuits c ON r.circuitId = c.circuitId
            WHERE r.year = ? AND r.round = ?;
        """
        race_cursor = db.execute(race_query, (year, round_num))
        race_row = race_cursor.fetchone()

        if race_row is None:
            return jsonify(error=f"Race not found for year {year}, round {round_num}."), 404

        race_details_dict = dict_from_row(race_row)
        race_id = race_row['raceId']

        results_query = """
            SELECT
                res.position, res.points, res.grid, res.laps, res.time AS resultTime,
                res.fastestLapTime, res.fastestLapSpeed,
                d.driverId, d.givenName AS driverGivenName, d.familyName AS driverFamilyName, d.code AS driverCode, d.nationality AS driverNationality,
                con.constructorId, con.name AS constructorName, con.nationality AS constructorNationality,
                s.status
            FROM results res
            JOIN drivers d ON res.driverId = d.driverId
            JOIN constructors con ON res.constructorId = con.constructorId
            JOIN status s ON res.statusId = s.statusId
            WHERE res.raceId = ?
            ORDER BY res.position ASC;
        """
        results_cursor = db.execute(results_query, (race_id,))
        results_rows = results_cursor.fetchall()
        results_list = [dict_from_row(row) for row in results_rows]

        return jsonify({
            'raceInfo': race_details_dict,
            'results': results_list
        })
    except sqlite3.Error as e:
        print(f"Database error in /api/results/{year}/{round_num}: {e}")
        return jsonify(error=f"Database error: {str(e)}"), 500
    except Exception as e:
        print(f"Unexpected error in /api/results/{year}/{round_num}: {e}")
        return jsonify(error=f"An unexpected error occurred: {str(e)}"), 500

@app.route('/api/drivers')
def get_all_drivers():
    try:
        db = get_db()
        query = """
            SELECT driverId, givenName, familyName, code, permanentNumber, dateOfBirth, nationality, url
            FROM drivers
            ORDER BY familyName ASC, givenName ASC;
        """
        cursor = db.execute(query)
        rows = cursor.fetchall()

        drivers_list = [dict_from_row(row) for row in rows]

        return jsonify(drivers=drivers_list)
    except sqlite3.Error as e:
        print(f"Database error in /api/drivers: {e}")
        return jsonify(error=f"Database error: {str(e)}"), 500
    except Exception as e:
        print(f"Unexpected error in /api/drivers: {e}")
        return jsonify(error=f"An unexpected error occurred: {str(e)}"), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
