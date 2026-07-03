# Quick Start Guide

## ⚡ Get Started in 5 Minutes

### 1️⃣ Clone & Setup

```bash
# Clone repository
git clone https://github.com/yourusername/smart-farming-project.git
cd smart-farming-project

# Install Node.js dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Add your Groq API key (get from https://console.groq.com)
nano .env
```

### 2️⃣ Start Backend Server

```bash
npm start
# Server will be available at http://localhost:3000
```

### 3️⃣ Flash Arduino Code (ESP32)

**Hardware Setup:**
1. Connect DHT11 to GPIO4, GND, 3.3V
2. Connect Moisture Sensor to GPIO34
3. Connect other sensors as per [HARDWARE_SETUP.md](docs/HARDWARE_SETUP.md)
4. Connect ESP32 via USB to computer

**Upload Code:**
1. Open Arduino IDE
2. Open: `arduino/sender_esp32_dht11.ino`
3. Tools → Board → ESP32 Dev Module
4. Tools → Port → Select COM port
5. Upload (Ctrl+U)

### 4️⃣ Configure WiFi (Arduino)

Edit these lines in sender code:
```cpp
const char* SSID = "YOUR_WIFI_NAME";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://192.168.x.x:3000/api/sensor-data";
```

### 5️⃣ Access Dashboard

Open browser: **http://localhost:3000**

---

## 📋 What Next?

- [ ] Register a farmer account
- [ ] Add your farm details
- [ ] Select your crops
- [ ] Monitor real-time sensor data
- [ ] Get AI recommendations
- [ ] Check troubleshooting guide

---

## 🔧 Troubleshooting

**ESP32 not uploading?**
- Check USB cable is connected
- Select correct COM port
- Install CH340 drivers

**No sensor data appearing?**
- Check WiFi connection in Serial Monitor
- Verify server URL is correct
- Check firewall allows port 3000

**API errors?**
- Make sure backend is running (`npm start`)
- Check .env file has Groq API key
- Verify JSON payload format

---

## 📚 Learn More

- [Full Hardware Guide](docs/HARDWARE_SETUP.md)
- [Arduino Setup](docs/ARDUINO_GUIDE.md)
- [API Reference](docs/API_DOCUMENTATION.md)
- [Complete README](README.md)

---

**Need help?** Open an issue on GitHub or check [CONTRIBUTING.md](CONTRIBUTING.md)
