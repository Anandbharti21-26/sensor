import zlib

def calculate_crc(temperature, humidity, pressure):
    """
    Convert sensor values to a deterministic string and calculate CRC-32.
    Example string format: 28.45,64.32,1012.45
    """
    data_string = f"{temperature:.2f},{humidity:.2f},{pressure:.2f}"
    # zlib.crc32 returns an unsigned 32-bit integer when masked with 0xFFFFFFFF
    return zlib.crc32(data_string.encode('utf-8')) & 0xFFFFFFFF
