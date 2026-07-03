import serial
from serial.tools import list_ports
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import time
import requests
import json
import os
import math
import re

# GOOGLE SHEETS SETUP
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]

creds = ServiceAccountCredentials.from_json_keyfile_name("key.json", scope)
client = gspread.authorize(creds)
sheet = client.open("FarmData").sheet1

# SERIAL SETUP
SERIAL_PORT = "COM3"
SERIAL_BAUD = 115200
SERIAL_TIMEOUT = 1
RECONNECT_DELAY_SECONDS = 2
DEBUG_RAW_SERIAL = False
SAMPLE_INTERVAL_SECONDS = 5
ANALYSIS_WINDOW_SECONDS = 60
REQUIRED_SAMPLES_PER_WINDOW = max(1, ANALYSIS_WINDOW_SECONDS // SAMPLE_INTERVAL_SECONDS)


def pick_port(preferred):
    ports = list(list_ports.comports())
    if not ports:
        return None, []

    devices = [p.device for p in ports]
    if preferred in devices:
        return preferred, ports

    # Prefer common USB-serial adapters
    priority_tokens = ["USB", "CH340", "CP210", "UART", "Silicon Labs", "Arduino"]
    for p in ports:
        desc = f"{p.device} {p.description} {p.manufacturer or ''}"
        if any(tok.lower() in desc.lower() for tok in priority_tokens):
            return p.device, ports

    return ports[0].device, ports


def connect_serial():
    while True:
        try:
            selected_port, ports = pick_port(SERIAL_PORT)
            if ports:
                print("Available COM ports:")
                for p in ports:
                    print(f"  - {p.device}: {p.description}")
            if not selected_port:
                print("No COM ports found. Connect receiver board and retry...")
                time.sleep(RECONNECT_DELAY_SECONDS)
                continue

            s = serial.Serial(selected_port, SERIAL_BAUD, timeout=SERIAL_TIMEOUT)
            s.reset_input_buffer()
            print(f"Serial connected on {selected_port} @ {SERIAL_BAUD}")
            return s
        except serial.SerialException as e:
            print(f"Serial open failed: {e}. Retrying in {RECONNECT_DELAY_SECONDS}s...")
            print("Tip: Close Arduino Serial Monitor. Only one app can hold the COM port at a time.")
            time.sleep(RECONNECT_DELAY_SECONDS)


ser = connect_serial()
print("System Started...")

# VARIABLES
batch_data = []
log_path = "log.json"

# Parse receiver human-readable block output
current_block = {
    "temp": None,
    "hum": None,
    "soil": None,
    "rain": None,
}
last_serial_seen_time = time.time()
last_emitted_sample = None
last_emitted_time = 0.0


def append_log_entry(entry):
    existing = []
    if os.path.exists(log_path):
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                if not isinstance(existing, list):
                    existing = []
        except Exception:
            existing = []

    existing.append(entry)
    existing = existing[-1000:]

    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)


def to_float_or_nan(text_value):
    try:
        return float(text_value)
    except Exception:
        return float("nan")


def safe_number(value):
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return "NaN"
    return round(value, 2)


def sample_is_valid(sample):
    temp, hum, _, _ = sample
    if math.isnan(temp) or math.isnan(hum):
        return False
    return True


def is_duplicate_sample(sample, now_ts):
    global last_emitted_sample, last_emitted_time
    if last_emitted_sample is None:
        return False
    if now_ts - last_emitted_time > 3:
        return False
    try:
        same = (
            abs(sample[0] - last_emitted_sample[0]) < 0.01 and
            abs(sample[1] - last_emitted_sample[1]) < 0.01 and
            int(sample[2]) == int(last_emitted_sample[2]) and
            abs(sample[3] - last_emitted_sample[3]) < 0.01
        )
        return same
    except Exception:
        return False


def try_extract_sample_from_line(line):
    global current_block

    # Preferred machine-readable format from receiver:
    # SENSOR_DATA:31.50,59.60,0,5
    if line.startswith("SENSOR_DATA:"):
        payload = line.replace("SENSOR_DATA:", "", 1).strip()
        parts = [p.strip() for p in payload.split(",")]
        if len(parts) == 4:
            try:
                return [float(parts[0]), float(parts[1]), int(float(parts[2])), float(parts[3])]
            except Exception:
                return None

    if ("RECEIVED FIELD DATA" in line) or ("CAPTURING FIELD DATA" in line):
        current_block = {"temp": None, "hum": None, "soil": None, "rain": None}
        return None

    m_temp = re.search(r"Temperature[^0-9a-zA-Z+-]*([-+]?\d*\.?\d+|nan)", line, flags=re.IGNORECASE)
    if m_temp:
        current_block["temp"] = to_float_or_nan(m_temp.group(1))
        return None

    m_hum = re.search(r"Humidity[^0-9a-zA-Z+-]*([-+]?\d*\.?\d+|nan)", line, flags=re.IGNORECASE)
    if m_hum:
        current_block["hum"] = to_float_or_nan(m_hum.group(1))
        return None

    m_soil = re.search(r"Soil\s*Status[^a-zA-Z]*(DRY|WET)", line, flags=re.IGNORECASE)
    if m_soil:
        current_block["soil"] = 1 if m_soil.group(1).upper() == "DRY" else 0
        return None

    m_rain = re.search(r"Rain\s*Level[^0-9a-zA-Z+-]*([-+]?\d*\.?\d+)", line, flags=re.IGNORECASE)
    if m_rain:
        current_block["rain"] = float(m_rain.group(1))
        return None

    # Receiver prints this line; sender may not always have it in sequence.
    if "Transmission Status" in line:
        if None not in current_block.values():
            sample = [
                float(current_block["temp"]),
                float(current_block["hum"]),
                int(current_block["soil"]),
                float(current_block["rain"]),
            ]
            current_block = {"temp": None, "hum": None, "soil": None, "rain": None}
            return sample

    # Be flexible: as soon as we have all 4 fields, emit sample.
    if None not in current_block.values():
        sample = [
            float(current_block["temp"]),
            float(current_block["hum"]),
            int(current_block["soil"]),
            float(current_block["rain"]),
        ]
        current_block = {"temp": None, "hum": None, "soil": None, "rain": None}
        return sample

    return None


while True:
    try:
        line = ser.readline().decode(errors="ignore").strip()
        if not line:
            # Heartbeat every ~10s if nothing arrives, so we know script is alive.
            now = time.time()
            if now - last_serial_seen_time > 10:
                print("Waiting for serial data... (check COM port and close Arduino Serial Monitor)")
                last_serial_seen_time = now
            continue

        last_serial_seen_time = time.time()
        if DEBUG_RAW_SERIAL:
            print("RAW:", line)

        sample = try_extract_sample_from_line(line)
        if sample is not None:
            if not sample_is_valid(sample):
                print("Skipped invalid sample (NaN from sensor):", sample)
                continue

            now_ts = time.time()
            if is_duplicate_sample(sample, now_ts):
                continue
            last_emitted_sample = sample
            last_emitted_time = now_ts

            print(
                "Parsed sample -> "
                f"Temperature: {sample[0]} C, "
                f"Humidity: {sample[1]} %, "
                f"Soil: {'DRY' if int(sample[2]) == 1 else 'WET'}, "
                f"Rain: {sample[3]} %"
            )
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            values = [safe_number(v) for v in sample]
            row = [timestamp] + [str(v) for v in values]
            sheet.append_row(row)
            print("Saved sample to Sheet", row)

            batch_data.append(row)
            finite_vals = [v for v in sample if not (math.isnan(v) or math.isinf(v))]
            farm_wealth = round(sum(finite_vals) / len(finite_vals), 2) if finite_vals else "NaN"

            log_entry = {
                "timestamp": timestamp,
                "window_seconds": 5,
                "samples_count": 1,
                "average": {
                    "temperature": values[0],
                    "humidity": values[1],
                    "soil": values[2],
                    "rain": values[3],
                },
                "farm_wealth": farm_wealth,
            }
            append_log_entry(log_entry)
            print("Logged sample to log.json", log_entry)

        # Send one suggestion for each full 1-minute window of samples.
        if len(batch_data) >= REQUIRED_SAMPLES_PER_WINDOW:
            print("\nSending 1-minute data to AI...")
            try:
                response = requests.post(
                    "http://localhost:3000/sensor-analysis",
                    json={"readings": batch_data},
                    timeout=15,
                )
                result = response.json().get("result", "No response")
                print("AI RESULT:")
                print(result)
                print("----------------------\n")
            except Exception as e:
                print("AI ERROR:", e)

            batch_data.clear()

    except serial.SerialException as e:
        print(f"Serial read error: {e}")
        try:
            if ser and ser.is_open:
                ser.close()
        except Exception:
            pass
        time.sleep(RECONNECT_DELAY_SECONDS)
        ser = connect_serial()

    except Exception as e:
        print("Error:", e)
        time.sleep(0.5)
