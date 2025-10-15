# Node-RED Tapo Devices for H100 Hub

Node-RED nodes for controlling TP-Link Tapo devices connected via H100 hub - smart switches (S220/S210) and temperature/humidity sensors (T310/T315).

## 🔧 Architecture

**Important:** Tapo S220 switches and T310 sensors communicate via **sub-GHz radio** to the H100 hub, NOT via WiFi. They do not have IP addresses. These nodes connect to your H100 hub, which then controls/reads the devices wirelessly.

```
[Node-RED] <--> [H100 Hub] <--(sub-GHz radio)--> [S220 Switch]
                                              └--> [T310 Sensor]
     WiFi/LAN        Has IP                         No IP
```

## ✨ Features

### Version 2.0 - New Hub Config Architecture
- **Hub config node** - Configure credentials once, use everywhere
- **Switch control** - S220/S210 switches (on/off/toggle/status)
- **Temperature sensors** - T310/T315 (read temperature/humidity)
- **Device discovery** - Find all devices on your hub
- **Shared connection** - Multiple device nodes share single hub connection
- **Battery monitoring** - Monitor battery levels and signal strength
- **Backward compatible** - Legacy tapo-s220 node still works

## 📦 Installation

### Development Installation

```bash
# Install dependencies
cd /Users/andy/cursor/node
npm install

# Install to Node-RED (no sudo required!)
cd ~/.node-red
npm install /Users/andy/cursor/node

# Restart Node-RED
node-red-stop
node-red
```

### Production Installation (once published)

```bash
cd ~/.node-red
npm install node-red-contrib-tapo-s220
```

## 🚀 Quick Start

### Step 1: Create Hub Configuration

1. **Find your H100 Hub IP** - Check your router or Tapo app
2. **Add a Tapo Hub config node**:
   - In Node-RED, add any Tapo device node (switch or sensor)
   - Click the pencil icon next to "Hub" dropdown
   - Click "Add new tapo-hub..."
   - Enter your Tapo account email (must be lowercase)
   - Enter your Tapo account password
   - Enter your H100 hub IP address
   - Click "Add"

### Step 2: Discover Your Devices

```
[inject: "discover"] --> [tapo-switch] --> [debug]
```

1. Send `msg.payload = "discover"`
2. Check the debug output for your devices
3. Copy the `device_id` of the device you want to use

### Step 3: Configure Device Nodes

1. Edit the device node (switch or sensor)
2. Select your hub config from the dropdown
3. Paste the Device ID
4. Redeploy

### Step 4: Use Your Devices!

**Switches:**
```
[inject: "on"] --> [tapo-switch] --> [debug]
[inject: "off"] --> [tapo-switch] --> [debug]
```

**Sensors:**
```
[inject: "read"] --> [tapo-sensor] --> [debug]
```

## 📝 Node Types

### Tapo Hub (Config Node)

Configuration node that manages the H100 hub connection. All device nodes reference this config.

**Configuration:**
- Email - Your Tapo account email (lowercase)
- Password - Your Tapo account password
- Hub IP - IP address of your H100 hub

### Tapo Switch

Controls S220/S210 smart switches.

**Commands:**
- `"discover"` - Find all switches on the hub
- `"on"` - Turn switch ON
- `"off"` - Turn switch OFF
- `"toggle"` - Toggle switch state
- `"status"` - Get current device info

**Example:**
```javascript
// Turn on
msg.payload = "on";

// Control specific device
msg.payload = {
    command: "on",
    deviceId: "802454..."
};
```

**Response:**
```javascript
{
    success: true,
    state: "on",
    command: "turnOn",
    deviceId: "..."
}
```

### Tapo Sensor

Reads temperature and humidity from T310/T315 sensors.

**Commands:**
- `"discover"` - Find all sensors on the hub
- `"read"` - Get current temperature/humidity readings
- `"status"` - Alias for read

**Example:**
```javascript
// Read sensor
msg.payload = "read";
```

**Response:**
```javascript
{
    success: true,
    command: "read",
    deviceId: "802E50...",
    readings: {
        temperature: 24.5,
        humidity: 66,
        temp_unit: "celsius",
        temp_exception: 0,
        humidity_exception: 6
    },
    device: {
        nickname: "Boiler Room Sensor",
        model: "T310",
        status: "online",
        battery_low: false,
        signal_level: 1,
        rssi: -82
    },
    timestamp: "2025-10-15T10:30:00.000Z"
}
```

## 📚 Example Flows

### Temperature Monitoring

```
[inject: every 5 min] --> [tapo-sensor: read] --> [function: check temp] --> [alert]
```

### Scheduled Switch Control

```
[inject: daily 7am, "on"] --> [tapo-switch: Kitchen]
[inject: daily 11pm, "off"] --> [tapo-switch: Kitchen]
```

### Multi-Device Dashboard

```
[tapo-hub config: My H100]
    ├── [tapo-switch: Kitchen Lights] --> [ui-switch]
    ├── [tapo-switch: Parking Lights] --> [ui-switch]
    └── [tapo-sensor: Boiler Room] --> [ui-gauge: temp/humidity]
```

## 🔍 Supported Devices

| Device | Model | Type | Status |
|--------|-------|------|--------|
| Smart Switch (Dual) | S220 | Switch | ✅ Tested |
| Smart Switch (Single) | S210 | Switch | ✅ Compatible |
| Smart Button | S200 | Button | ⚠️ Untested |
| Temp/Humidity Sensor | T310 | Sensor | ✅ Tested |
| Temp/Humidity Display | T315 | Sensor | ✅ Tested |
| Motion Sensor | T100 | Sensor | ⚠️ Not implemented |

## 🔄 Migration from v1.x (Legacy tapo-s220)

### Do I Need to Migrate?

**No!** The legacy `tapo-s220` node still works and will continue to work. Migration is optional.

### Why Migrate?

**Benefits of new architecture:**
- Configure credentials once (not per device)
- Add sensor support (T310/T315)
- Better performance (shared hub connection)
- Easier to manage multiple devices

### How to Migrate

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for step-by-step instructions.

**TL;DR:**
1. Create a `tapo-hub` config node with your credentials
2. Replace `tapo-s220` nodes with `tapo-switch` nodes
3. Select the hub config in each node
4. Copy device IDs from old nodes
5. Test and redeploy

You can migrate gradually - old and new nodes work side-by-side!

## 🛠️ Technical Details

### How It Works

1. **Hub Config Node** manages connection to H100 hub
2. **Device Nodes** reference the hub config
3. Hub authenticates with Tapo cloud using your credentials
4. Hub retrieves list of child devices
5. Device nodes send commands/queries through hub
6. Hub translates to sub-GHz radio signals
7. Devices respond via hub

### Protocol Support

- **KLAP protocol** (newer firmware)
- **Passthrough protocol** (older firmware)
- **Cloud authentication** for credentials
- **Local hub control** for fast commands
- **Sub-GHz communication** between hub and devices

### Requirements

- Node.js >= 14.0.0
- Node-RED >= 1.0.0
- Tapo account with registered devices
- H100 hub connected to your network
- Devices paired with H100 hub

## 🐛 Troubleshooting

### Authentication Errors

**Problem**: "Invalid authentication" error

**Solutions**:
- Ensure email is all lowercase (capital letters cause issues)
- Verify password is correct
- Check internet connection (cloud authentication required)

### Hub Not Found

**Problem**: Cannot connect to H100 hub

**Solutions**:
- Verify H100 hub IP address is correct
- Ensure hub is powered on and connected to network
- Check hub is on same network as Node-RED
- Try pinging the hub IP from your Node-RED machine

### No Devices Discovered

**Problem**: "discover" command returns empty list

**Solutions**:
- Verify devices are paired with H100 in Tapo app
- Check devices have batteries and are powered on
- Ensure devices show as "online" in Tapo app
- Try refreshing discovery with force refresh

### Sensor Reading Errors

**Problem**: Can't read temperature/humidity

**Solutions**:
- Check sensor is online in Tapo app
- Verify sensor battery level
- Check signal strength (move hub closer if needed)
- Ensure you're using `"read"` or `"status"` command

### Device Offline

**Problem**: Device shows as offline

**Solutions**:
- Check device battery level
- Verify signal strength (move hub closer if needed)
- Re-pair device with hub in Tapo app
- Replace batteries if low

## 📋 Known Limitations

- Hub must have internet access for initial authentication
- Devices require batteries (monitor battery level)
- Sub-GHz range limited (keep hub within range)
- Commands take slightly longer than WiFi devices
- Cannot control devices without hub connection
- Temperature unit (C/F) set in Tapo app, not changeable via API

## 🏗️ Development

### Project Structure

```
.
├── tapo-hub.js            # Hub config node (NEW)
├── tapo-hub.html          # Hub config UI (NEW)
├── tapo-switch.js         # Switch device node (NEW)
├── tapo-switch.html       # Switch UI (NEW)
├── tapo-sensor.js         # Sensor device node (NEW)
├── tapo-sensor.html       # Sensor UI (NEW)
├── tapo-s220.js           # Legacy node (backward compatibility)
├── tapo-s220.html         # Legacy UI
├── tapo-hub-connect.js    # Hub communication wrapper
├── package.json           # Node configuration
└── node_modules/
    └── homebridge-kasa-hub/  # Core hub communication library
```

### Based On

This implementation is based on:
- [homebridge-kasa-hub](https://github.com/zmx264/homebridge-kasa-hub) - Hub communication
- [home-assistant-tapo-p100](https://github.com/petretiandrea/home-assistant-tapo-p100) - Architecture inspiration

### Contributing

Contributions welcome! Please:
1. Test thoroughly with actual devices
2. Document any new device support
3. Follow existing code style
4. Submit pull requests with clear descriptions

## 📖 References

- [TP-Link Tapo Official Site](https://www.tapo.com/)
- [homebridge-kasa-hub](https://github.com/zmx264/homebridge-kasa-hub)
- [Node-RED Documentation](https://nodered.org/docs/)
- [Home Assistant Tapo Integration](https://github.com/petretiandrea/home-assistant-tapo-p100)

## 📄 License

Apache-2.0

## ⚠️ Disclaimer

This is an unofficial integration. TP-Link and Tapo are trademarks of TP-Link Technologies Co., Ltd. This project is not affiliated with, endorsed by, or sponsored by TP-Link.

The code reverse-engineers the Tapo protocol for home automation purposes only. Use at your own risk.

## 🎯 Roadmap

- [x] S220 switch support
- [x] Hub config node architecture
- [x] T310/T315 temperature sensor support
- [ ] T100 motion sensor support
- [ ] S200 button support
- [ ] Multiple hub support
- [ ] Automatic hub discovery
- [ ] Temperature unit conversion
- [ ] Alert thresholds for sensors
