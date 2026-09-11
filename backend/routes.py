from flask import Blueprint, jsonify, request
from backend.simulator import generate_sensor_reading, corrupt_reading
from backend.crc import calculate_crc
from backend.database import save_packet, get_all_packets, get_statistics, get_packet_by_id, get_sensor_corruptions
import random

api = Blueprint('api', __name__)

@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@api.route('/sensor', methods=['GET'])
def get_sensor():
    try:
        return jsonify({"success": True, "packet": generate_sensor_reading()}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api.route('/packet', methods=['GET'])
def get_packet():
    try:
        reading = generate_sensor_reading()
        crc = calculate_crc(reading['temperature'], reading['humidity'], reading['pressure'])
        packet = {
            "packet_id": reading['packet_id'],
            "timestamp": reading['timestamp'],
            "temperature_original": reading['temperature'],
            "humidity_original": reading['humidity'],
            "pressure_original": reading['pressure'],
            "temperature_received": reading['temperature'],
            "humidity_received": reading['humidity'],
            "pressure_received": reading['pressure'],
            "original_crc": crc,
            "calculated_crc": crc,
            "status": "VALID",
            "corrupted_sensor": None
        }
        save_packet(packet)
        return jsonify({"success": True, "packet": packet}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api.route('/simulate', methods=['POST'])
def simulate_packet():
    try:
        data = request.get_json() or {}
        corruption_type = data.get('corruption', 'none')
        probability = float(data.get('probability', 100))
        
        # 1. Generate original reading
        original_reading = generate_sensor_reading()
        # 2. Calculate original CRC BEFORE corruption
        original_crc = calculate_crc(original_reading['temperature'], original_reading['humidity'], original_reading['pressure'])
        
        # Apply probability check
        actual_corruption = corruption_type
        if corruption_type != 'none':
            if random.uniform(0, 100) > probability:
                actual_corruption = 'none'

        # 3. Simulate transmission corruption
        received_reading, corrupted_sensor = corrupt_reading(original_reading, actual_corruption)
        
        # 4. Calculate received CRC
        calculated_crc = calculate_crc(received_reading['temperature'], received_reading['humidity'], received_reading['pressure'])
        
        # 5. Compare CRC
        status = "VALID" if original_crc == calculated_crc else "CORRUPTED"
        
        packet = {
            "packet_id": original_reading['packet_id'],
            "timestamp": original_reading['timestamp'],
            "temperature_original": original_reading['temperature'],
            "humidity_original": original_reading['humidity'],
            "pressure_original": original_reading['pressure'],
            "temperature_received": received_reading['temperature'],
            "humidity_received": received_reading['humidity'],
            "pressure_received": received_reading['pressure'],
            "original_crc": original_crc,
            "calculated_crc": calculated_crc,
            "status": status,
            "corrupted_sensor": corrupted_sensor
        }
        save_packet(packet)
        
        return jsonify({"success": True, "packet": packet}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api.route('/packets', methods=['GET'])
def get_packets():
    try:
        return jsonify({"success": True, "packets": get_all_packets()}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
@api.route('/packets/<int:packet_id>', methods=['GET'])
def get_single_packet(packet_id):
    try:
        packet = get_packet_by_id(packet_id)
        if packet:
            return jsonify({"success": True, "packet": packet}), 200
        return jsonify({"success": False, "error": "Not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api.route('/statistics', methods=['GET'])
def statistics():
    try:
        stats = get_statistics()
        corruptions = get_sensor_corruptions()
        return jsonify({
            "success": True, 
            "statistics": stats,
            "corruptions": corruptions
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
