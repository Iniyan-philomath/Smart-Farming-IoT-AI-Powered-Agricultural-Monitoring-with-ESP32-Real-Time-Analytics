# 🌾 Smart Farming Project

A comprehensive IoT-based agricultural monitoring system that collects real-time sensor data from farmlands and provides intelligent analysis using AI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-ESP32%20|%20Node.js%20|%20Python-orange)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Hardware Requirements](#hardware-requirements)
- [Software Requirements](#software-requirements)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Project Overview

Smart Farming Project is an intelligent agricultural monitoring system that helps farmers optimize crop yield and health by providing real-time sensor data analysis and AI-powered recommendations. The system consists of:

1. **Sender ESP32**: Collects data from multiple agricultural sensors
2. **Receiver ESP32**: Receives and relays data to the backend
3. **Backend**: Node.js API server with AI analysis (using Groq API)
4. **Frontend**: Web interface for farmers to view data and get recommendations
5. **Data Pipeline**: Python-based data processing and storage

---

## ✨ Features

### Hardware Monitoring
- ✓ **Temperature & Humidity** (DHT11 Sensor)
- ✓ **Soil Moisture** (Capacitive Soil Sensor)
- ✓ **Rainfall Detection** (Raindrop Sensor)
- ✓ **Light Intensity** (LDR - Light Dependent Resistor)
- ✓ **Soil pH Level** (pH Sensor Module)
- ✓ **Battery Monitoring** (Voltage Detection)

### AI Features
- 🤖 **Groq AI Integration** for intelligent crop analysis
- 🎯 **Crop Disease Detection** based on sensor readings
- 💡 **Personalized Recommendations** for farmers
- 📊 **Historical Data Analysis** and trend tracking
- 🌐 **Multi-language Support** (English, Hindi, etc.)

### Web Interface
- 📱 Responsive design for mobile and desktop
- 📈 Real-time data visualization
- 🔔 Alert notifications for critical conditions
- 👨‍🌾 Farmer profile management
- 📊 Sensor data history and analytics

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      SMART FARMING SYSTEM               │
└─────────────────────────────────────────────────────────┘
                               
        ┌──────────────┐    ┌──────────────┐
        │ Sender ESP32 │───▶│ Receiver     │
        │ (Multi-sensor)   │ ESP32        │
        └──────────────┘    │ (WiFi)       │
        DHT11, Moisture,    └──────────────┘
        Rain, pH, Light               │
                                      │ WiFi/HTTP
                                      ▼
                        ┌─────────────────────┐
                        │   Backend Server    │
                        │ (Node.js + Express) │
                        │  Port: 3000         │
                        └─────────────────────┘
                        ├─ AI Analysis (Groq)
                        ├─ Data Logging
                        ├─ WebSocket Updates
                        └─ REST API
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
           Frontend      Python Backend   Database
          (Web Browser)   (FastAPI)      (JSON/DB)
           Port: 3000    Port: 8000
```

---

## 🔧 Hardware Requirements

### Components List

| Component | Quantity | Purpose | Pins (ESP32) |
|-----------|----------|---------|--------------|
| ESP32 DevKit | 2 | Main microcontroller (Sender + Receiver) | - |
| DHT11 Sensor | 1 | Temperature & Humidity | GPIO4 |
| Soil Moisture Sensor | 1 | Soil water content | GPIO34 (ADC) |
| Raindrop Sensor | 1 | Rain detection | GPIO35 (ADC) |
| LDR + 10K Resistor | 1 | Light intensity | GPIO32 (ADC) |
| pH Sensor Module | 1 | Soil pH measurement | GPIO33 (ADC) |
| Battery/Power Supply | 1 | Power source | 5V Input |
| USB Cable | 1 | Programming & Power | USB-C |
| Jumper Wires | Multiple | Connections | - |
| Breadboard | 1 | Circuit assembly | - |

### Sensor Pinout (ESP32)

```
ESP32 Pin Configuration:
├─ GPIO4   : DHT11 Data
├─ GPIO34  : Moisture Sensor (ADC)
├─ GPIO35  : Raindrop Sensor (ADC)
├─ GPIO32  : Light Sensor LDR (ADC)
├─ GPIO33  : pH Sensor (ADC)
├─ GPIO36  : Battery Voltage (ADC)
├─ 3.3V    : DHT11 VCC & Sensor VCC
└─ GND     : Common Ground
```

---

## 💻 Software Requirements

### Backend
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Python** 3.8+ (for data pipeline)

### Frontend
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

### APIs
- **Groq API Key** (for AI analysis) - [Get Key](https://console.groq.com)
- **Azure Speech Services** (optional) - for voice support

### Arduino IDE
- **Arduino IDE** v2.0+
- **Board**: ESP32 DevKit C
- **Libraries**: DHT Sensor, ArduinoJson

---

## 📦 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/smart-farming-project.git
cd smart-farming-project
```

### Step 2: Backend Setup (Node.js)

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

**Required environment variables:**
```
GROQ_API_KEY=your_groq_api_key_here
AZURE_SPEECH_KEY=your_azure_key_here (optional)
AZURE_SPEECH_REGION=your_region_here (optional)
NODE_ENV=development
PORT=3000
```

### Step 3: Python Backend Setup (Optional)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Arduino Setup (ESP32)

1. **Install Arduino IDE**
   - Download from: https://www.arduino.cc/en/software

2. **Install ESP32 Board Support**
   - Go to: Tools → Board Manager
   - Search for "ESP32"
   - Install "esp32 by Espressif Systems"

3. **Install Required Libraries**
   - Sketch → Include Library → Manage Libraries
   - Search and install:
     - "DHT sensor library" by Adafruit
     - "ArduinoJson" by Benoit Blanchon
     - "HTTPClient" (built-in)

4. **Upload Sender Code**
   - Open: `arduino/sender_esp32_dht11.ino`
   - Connect ESP32 via USB
   - Select: Tools → Board → ESP32 Dev Module
   - Select correct COM port
   - Click Upload

5. **Upload Receiver Code**
   - Open: `arduino/receiver_esp32.ino`
   - Upload following same steps as sender

---

## ⚙️ Configuration

### 1. WiFi Configuration (Arduino)

Edit these lines in `sender_esp32_dht11.ino`:

```cpp
const char* SSID = "YOUR_SSID";        // Your WiFi name
const char* PASSWORD = "YOUR_PASSWORD"; // Your WiFi password
```

### 2. Server URL Configuration

Update server address in Arduino code:

```cpp
const char* SERVER_URL = "http://192.168.x.x:3000/api/sensor-data";
const char* RECEIVER_ESP_IP = "192.168.x.x";
```

### 3. Sensor Calibration

**Moisture Sensor Calibration** (in Arduino code):

```cpp
const int MOISTURE_DRY = 800;   // Value when sensor is dry
const int MOISTURE_WET = 400;   // Value when sensor is wet
```

To calibrate:
1. Place sensor in completely dry soil → note the ADC value
2. Place sensor in wet soil → note the ADC value
3. Update constants with these values

**pH Sensor Calibration**:

```cpp
float phValue = voltage * 4.24;  // Adjust multiplier based on your sensor
```

### 4. Backend Configuration

Edit `main.js` for any custom settings:

```javascript
const SENSOR_READ_INTERVAL = 30000;    // How often to read sensors (ms)
const SERVER_SEND_INTERVAL = 60000;    // How often to send data (ms)
```

---

## 🚀 Usage

### Starting the Backend Server

```bash
# Terminal 1 - Start Node.js server
npm start
# Server runs on http://localhost:3000

# Terminal 2 (Optional) - Start Python backend
python main.py
# Server runs on http://localhost:8000
```

### Accessing the Web Interface

1. Open browser and navigate to:
   ```
   http://localhost:3000
   ```

2. Register a new farmer account
   - Fill in farm details
   - Add farmer information
   - Select crops

3. Monitor sensor data
   - View real-time data dashboard
   - Check historical trends
   - Get AI recommendations

### Arduino Serial Monitor

1. Open Arduino IDE
2. Tools → Serial Monitor (or Ctrl+Shift+M)
3. Set baud rate to 115200
4. Watch sensor readings and WiFi connection status

---

## 📡 API Endpoints

### Sensor Data Endpoints

```
POST /api/sensor-data
├─ Body: { temperature, humidity, soil_moisture, rainfall, light_intensity, soil_ph, battery_voltage }
└─ Returns: { status: "success", message: "Data received" }

GET /api/sensor-data/:farmerId
├─ Returns: Array of sensor readings with timestamps
└─ Query params: ?limit=100&offset=0

GET /api/sensor-data/:farmerId/latest
└─ Returns: Latest sensor reading for a farm
```

### AI Analysis Endpoints

```
POST /api/diagnose
├─ Body: { farmer_id, crop, issue_description, sensor_data }
└─ Returns: { diagnosis, recommendations, severity }

POST /api/chat
├─ Body: { farmer_id, message, language }
└─ Returns: { response, audio_url (optional) }

GET /api/farmer/:farmerId
└─ Returns: Farmer details and farm information
```

### Notifications

```
POST /api/notifications
├─ Body: { farmer_id, type, message, severity }
└─ Returns: { notification_id, timestamp }

GET /api/notifications/:farmerId
└─ Returns: List of notifications for a farmer
```

---

## 📂 File Structure

```
smart-farming-project/
├── arduino/
│   ├── sender_esp32_dht11.ino      # Main sender ESP32 code
│   ├── receiver_esp32.ino          # Receiver ESP32 code
│   └── sensor_calibration.ino      # Calibration utility
│
├── frontend/
│   ├── index.html                  # Main dashboard page
│   ├── registration.html           # Farmer registration
│   ├── styles.css                  # Styling
│   └── js/
│       ├── dashboard.js            # Dashboard logic
│       ├── charts.js               # Data visualization
│       └── api.js                  # Frontend API calls
│
├── backend/
│   ├── main.js                     # Node.js express server
│   ├── main.py                     # Python FastAPI server (optional)
│   └── routes/
│       ├── sensor.js               # Sensor data routes
│       ├── farmer.js               # Farmer management
│       └── ai.js                   # AI analysis routes
│
├── public/
│   ├── charts/                     # Chart images/data
│   └── uploads/                    # User uploads
│
├── docs/
│   ├── HARDWARE_SETUP.md          # Detailed hardware guide
│   ├── SENSOR_CALIBRATION.md      # Calibration procedures
│   └── API_DOCUMENTATION.md       # Complete API reference
│
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── package.json                    # Node.js dependencies
├── requirements.txt                # Python dependencies
├── README.md                       # This file
└── LICENSE                         # MIT License
```

---

## 🔍 Troubleshooting

### WiFi Connection Issues

**Problem**: ESP32 can't connect to WiFi
```
Solution:
1. Check SSID and password in code (no typos)
2. Verify WiFi 2.4GHz band (ESP32 doesn't support 5GHz)
3. Check WiFi signal strength near ESP32
4. Restart WiFi router
5. Check firewall settings on network
```

### Sensor Not Reading Data

**Problem**: DHT11 returns NaN values
```
Solution:
1. Check wiring (GPIO4 connection)
2. Verify DHT library is installed
3. Check 3.3V power supply
4. Add delay between reads (DHT needs 2 seconds)
```

**Problem**: Moisture sensor shows 0 or 100%
```
Solution:
1. Calibrate sensor values (MOISTURE_DRY, MOISTURE_WET)
2. Check ADC voltage range (0-3.3V)
3. Verify GPIO34 connection
4. Check for soil contact with sensor
```

### Server Connection Issues

**Problem**: ESP32 can't reach backend server
```
Solution:
1. Verify server URL is correct (check IP address)
2. Check firewall allows port 3000
3. Ensure backend server is running (npm start)
4. Check ESP32 and server are on same network
5. Test with curl: curl http://192.168.x.x:3000/
```

### Battery/Power Issues

**Problem**: ESP32 keeps restarting or losing power
```
Solution:
1. Use proper power supply (5V, 2A minimum)
2. Check USB cable quality
3. Add capacitor near power input
4. Check for short circuits
5. Monitor battery voltage reading
```

---

## 📖 Documentation

Complete documentation available in `docs/` folder:

- [Hardware Setup Guide](docs/HARDWARE_SETUP.md)
- [Sensor Calibration](docs/SENSOR_CALIBRATION.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Arduino Guide](docs/ARDUINO_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/smart-farming-project.git

# Create development branch
git checkout -b develop

# Make changes and test locally
npm start

# Commit with descriptive messages
git commit -m "feat: Add new sensor support"
```

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Smart Farming Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/smart-farming-project/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/smart-farming-project/discussions)
- **Email**: support@smartfarming.local

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - AI API provider
- [Arduino Community](https://arduino.cc) - Embedded systems support
- [Adafruit](https://adafruit.com) - Sensor libraries and tutorials
- All farmers and agricultural experts who provided feedback

---

## 📊 Project Statistics

- **Lines of Code**: 5000+
- **Sensors Supported**: 6+
- **API Endpoints**: 20+
- **Hardware Platforms**: ESP32
- **Backend Languages**: JavaScript, Python
- **Frontend**: HTML5, CSS3, JavaScript

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Cloud integration (AWS/Azure)
- [ ] More sensor types (CO2, NPK)
- [ ] Predictive analytics with ML
- [ ] IoT gateway support
- [ ] LoRaWAN/NB-IoT support
- [ ] Multi-language voice interface
- [ ] Offline mode support

---

## 🎓 Learning Resources

- [Arduino IoT Guide](https://docs.arduino.cc/)
- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/)
- [Node.js Best Practices](https://nodejs.org/en/docs/)
- [Agriculture IoT Papers](https://scholar.google.com/)

---

**Made with ❤️ for farmers and agriculture technology enthusiasts**

Last Updated: 2024
Version: 1.0.0
