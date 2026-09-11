# IoT Sensor CRC Monitor

## Project Title
IoT Sensor Packet Corruption Detection System

## Project Description
A fully functional web application that simulates IoT sensor packets (Temperature, Humidity, Pressure) and detects data corruption during transmission using CRC-32 (Cyclic Redundancy Check) analysis.

## Features
- **Real-Time Simulation**: Simulates IoT packets with sequential IDs and fluctuating realistic values.
- **CRC-32 Integrity Check**: Deterministically computes original CRC-32 and recalculates upon receipt to verify payload integrity.
- **Controlled Corruption**: Simulates payload corruption targeting specific or random sensors to demonstrate CRC mismatch logic.
- **Live Interactive Dashboard**: Displays sensor data, packet health, live statistics, and packet history dynamically without page reloads.
- **Database Storage**: Utilizes SQLite to securely persist packet history and corruption statuses.
- **Analytics & Data Visualization**: Integrates `Chart.js` for plotting trendlines and tracking the corruption rate.
- **Data Export**: Facilitates one-click export of packet history to CSV files.

## Technology Stack
- **Backend**: Python 3, Flask, SQLite3, zlib (for CRC-32 calculation)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js

## Project Structure
```text
iot-crc-monitor/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── README.md               # Project documentation
├── backend/                # Server-side logic modules
│   ├── __init__.py
│   ├── routes.py           # REST API endpoints
│   ├── crc.py              # CRC-32 computation
│   ├── simulator.py        # Realistic sensor value generation & corruption
│   └── database.py         # SQLite connection and queries
├── templates/
│   └── index.html          # Dashboard user interface
├── static/
│   ├── css/style.css       # Custom styles
│   └── js/app.js           # Interactive frontend logic
└── database/               # Automatically created folder for sensor.db
```

## Installation
1. Clone the repository or navigate to the project directory.
2. Set up your virtual environment:
   `python3 -m venv venv`
   `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
3. Install dependencies:
   `pip install -r requirements.txt`

## How to Run
Start the Flask application using:
`python app.py`

Navigate to `http://127.0.0.1:5000` in your web browser.

## How to Use
- **Manual Control**: Use the "Simulation Controls" section to generate Valid or Corrupted packets.
- **Real-time Engine**: Configure the corruption probability and interval, then click "Start Simulation" to stream data continuously.
- **Inspection**: Click any row in the "Packet History" table to open a detailed modal comparing Original vs. Received payloads.
- **Search & Filter**: Search packets by ID or filter by "Valid"/"Corrupted".
- **Download**: Use the "Export CSV" button in the sidebar.

## API Endpoints
- `GET /api/health` -> Standard backend check.
- `GET /api/sensor` -> Fetches an independent payload.
- `GET /api/packet` -> Fetches a clean full packet with CRC.
- `POST /api/simulate` -> Generates a packet applying specified corruption (Body: `{"corruption": "type", "probability": 20}`).
- `GET /api/packets` -> Fetches full packet history from the DB.
- `GET /api/statistics` -> Fetches aggregate application metrics.
- `GET /api/packets/<id>` -> Fetches a specific packet by ID.

## CRC and Packet Corruption Explanation
1. **Creation**: When a sensor payload is generated, it is cast to a deterministic string `temp,hum,pres`.
2. **Hash**: The system calculates the `zlib.crc32` of the string.
3. **Simulation**: Based on UI or backend probability, a value in the payload may undergo random extreme drift.
4. **Verification**: A new CRC is calculated from the 'received' payload and compared against the original hash. If `calc != orig`, the packet is marked as `CORRUPTED`.

## Testing Instructions
1. Restart the server and verify database initialization.
2. Monitor `/api/health` connectivity.
3. Use manual buttons targeting Temperature, Humidity, and Pressure explicitly. Confirm visual validation.
4. Verify SQLite correctly registers CRC mismatches.

## Future Improvements
- Implement automated unit tests (e.g., `pytest`).
- Introduce 16-bit CRC models or custom polynomial configurations.
- Allow configuration of bounds/drift per sensor element.
