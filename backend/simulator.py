import random
from datetime import datetime

class SensorSimulator:
    def __init__(self):
        self.packet_id = 0
        self.current_temp = round(random.uniform(20.0, 30.0), 2)
        self.current_hum = round(random.uniform(40.0, 60.0), 2)
        self.current_pres = round(random.uniform(1000.0, 1020.0), 2)
        
    def _vary(self, value, max_step, min_val, max_val):
        step = random.uniform(-max_step, max_step)
        new_val = value + step
        # Keep within bounds
        new_val = max(min_val, min(new_val, max_val))
        return round(new_val, 2)

    def generate_sensor_reading(self):
        self.packet_id += 1
        
        # Vary slightly from previous
        self.current_temp = self._vary(self.current_temp, 0.5, 15.0, 40.0)
        self.current_hum = self._vary(self.current_hum, 2.0, 20.0, 90.0)
        self.current_pres = self._vary(self.current_pres, 1.5, 980.0, 1050.0)
        
        packet = {
            "packet_id": self.packet_id,
            "timestamp": datetime.now().isoformat(),
            "temperature": self.current_temp,
            "humidity": self.current_hum,
            "pressure": self.current_pres
        }
        return packet

# Global instance to persist state between requests
simulator = SensorSimulator()

def generate_sensor_reading():
    return simulator.generate_sensor_reading()

def corrupt_reading(reading, corruption_type):
    """
    Corrupts a specific sensor reading to simulate transmission error.
    corruption_type: 'none', 'temperature', 'humidity', 'pressure', 'random'
    Returns: (corrupted_reading_dict, corrupted_sensor_name)
    """
    corrupted = dict(reading)
    
    if corruption_type == 'none':
        return corrupted, None
        
    if corruption_type == 'random':
        corruption_type = random.choice(['temperature', 'humidity', 'pressure'])
        
    if corruption_type == 'temperature':
        # Apply random major variation
        corrupted['temperature'] = round(corrupted['temperature'] + random.uniform(5.0, 15.0) * random.choice([-1, 1]), 2)
    elif corruption_type == 'humidity':
        corrupted['humidity'] = round(corrupted['humidity'] + random.uniform(10.0, 25.0) * random.choice([-1, 1]), 2)
    elif corruption_type == 'pressure':
        corrupted['pressure'] = round(corrupted['pressure'] + random.uniform(20.0, 50.0) * random.choice([-1, 1]), 2)
        
    return corrupted, corruption_type
