import sqlite3
import os

DB_PATH = 'database/sensor.db'

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS packets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            packet_id INTEGER,
            timestamp TEXT,
            temperature_original REAL,
            humidity_original REAL,
            pressure_original REAL,
            temperature_received REAL,
            humidity_received REAL,
            pressure_received REAL,
            original_crc INTEGER,
            calculated_crc INTEGER,
            status TEXT,
            corrupted_sensor TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_packet(p):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO packets (
            packet_id, timestamp,
            temperature_original, humidity_original, pressure_original,
            temperature_received, humidity_received, pressure_received,
            original_crc, calculated_crc, status, corrupted_sensor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        p['packet_id'], p['timestamp'],
        p['temperature_original'], p['humidity_original'], p['pressure_original'],
        p['temperature_received'], p['humidity_received'], p['pressure_received'],
        p['original_crc'], p['calculated_crc'], p['status'], p['corrupted_sensor']
    ))
    conn.commit()
    conn.close()

def get_all_packets():
    conn = get_db_connection()
    packets = conn.execute('SELECT * FROM packets ORDER BY packet_id DESC LIMIT 500').fetchall()
    conn.close()
    return [dict(row) for row in packets]

def get_packet_by_id(packet_id):
    conn = get_db_connection()
    packet = conn.execute('SELECT * FROM packets WHERE packet_id = ?', (packet_id,)).fetchone()
    conn.close()
    return dict(packet) if packet else None

def get_statistics():
    conn = get_db_connection()
    stats = conn.execute('''
        SELECT 
            COUNT(*) as total_packets,
            SUM(CASE WHEN status = 'VALID' THEN 1 ELSE 0 END) as valid_packets,
            SUM(CASE WHEN status = 'CORRUPTED' THEN 1 ELSE 0 END) as corrupted_packets,
            AVG(temperature_original) as avg_temp,
            AVG(humidity_original) as avg_hum,
            AVG(pressure_original) as avg_pres,
            MIN(temperature_original) as min_temp,
            MAX(temperature_original) as max_temp,
            MIN(humidity_original) as min_hum,
            MAX(humidity_original) as max_hum,
            MIN(pressure_original) as min_pres,
            MAX(pressure_original) as max_pres
        FROM packets
    ''').fetchone()
    conn.close()
    
    result = dict(stats) if stats and stats['total_packets'] else {
        'total_packets': 0, 'valid_packets': 0, 'corrupted_packets': 0,
        'avg_temp': 0, 'avg_hum': 0, 'avg_pres': 0,
        'min_temp': 0, 'max_temp': 0, 'min_hum': 0, 'max_hum': 0, 'min_pres': 0, 'max_pres': 0
    }
    
    for key in result:
        if result[key] is None:
            result[key] = 0

    total = result.get('total_packets', 0)
    corrupt = result.get('corrupted_packets', 0)
    result['corruption_rate'] = (corrupt / total * 100) if total > 0 else 0
    return result

def get_sensor_corruptions():
    conn = get_db_connection()
    data = conn.execute('''
        SELECT corrupted_sensor, COUNT(*) as count 
        FROM packets 
        WHERE status = 'CORRUPTED' AND corrupted_sensor IS NOT NULL
        GROUP BY corrupted_sensor
    ''').fetchall()
    conn.close()
    return [dict(row) for row in data]
