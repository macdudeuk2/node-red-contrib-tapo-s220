# Node-RED Tapo S220 Switch Controller

A Node-RED node for controlling TP-Link Tapo S220 smart switches connected via H100 hub.

## 🔧 Architecture

**Important:** S220 switches communicate via **sub-GHz radio** to the H100 hub, NOT via WiFi. They do not have IP addresses. This node connects to your H100 hub, which then controls the S220 switches wirelessly.

```
[Node-RED] <--> [H100 Hub] <--(sub-GHz radio)--> [S220 Switch]
     WiFi/LAN        Has IP                         No IP
```

## ✨ Features

- Control S220/S210 switches via H100 hub
- Discover all switches connected to your hub
- Turn switches on/off/toggle
- Query device status
- Support for multiple switches
- Cloud authentication (Tapo credentials)

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

### Step 1: Find Your H100 Hub IP

Check your router or Tapo app to find the IP address of your H100 hub (not the S220!).

### Step 2: Configure the Node

1. Add the "Tapo S220" node to your flow
2. Double-click to configure:
   - **Email**: Your Tapo account email (must be lowercase)
   - **Password**: Your Tapo account password
   - **H100 Hub IP**: IP address of your H100 hub (e.g., `192.168.1.100`)
   - Leave Device ID empty initially

3. Deploy the flow

### Step 3: Discover Your Switches

```
[inject: "discover"] --> [tapo-s220] --> [debug]
```

1. Send `msg.payload = "discover"`
2. Check the debug output for your S220 switches
3. Copy the `device_id` of the switch you want to control

### Step 4: Configure Device ID

1. Edit the tapo-s220 node
2. Paste the Device ID
3. Redeploy

### Step 5: Control Your Switch!

```
[inject: "on"] --> [tapo-s220] --> [debug]
[inject: "off"] --> [tapo-s220] --> [debug]
```

## 📝 Usage

### Available Commands

Send commands via `msg.payload`:

#### Discovery

```javascript
// Discover all S220 switches on the hub
msg.payload = "discover";
```

#### Control Commands

```javascript
// Turn on
msg.payload = "on";

// Turn off  
msg.payload = "off";

// Toggle
msg.payload = "toggle";

// Control specific device
msg.payload = {
    command: "on",
    deviceId: "your-device-id-here"
};
```

#### Query Commands

```javascript
// Get device status
msg.payload = "status";
```

### Response Format

#### Discover Response
```javascript
{
    success: true,
    command: "discover",
    switches: [
        {
            device_id: "...",
            nickname: "Kitchen Switch",
            model: "S220",
            category: "...",
            status: "online",
            device_on: true,
            at_low_battery: false,
            signal_level: 3
        }
    ],
    allDevices: [...],
    totalDevices: 5
}
```

#### Control Response
```javascript
{
    success: true,
    state: "on",
    command: "turnOn",
    deviceId: "..."
}
```

#### Status Response
```javascript
{
    success: true,
    command: "getInfo",
    deviceInfo: {
        device_id: "...",
        nickname: "Kitchen Switch",
        model: "S220",
        device_on: true,
        status: "online",
        battery_percentage: 85,
        signal_level: 3
    }
}
```

#### Error Response
```javascript
{
    success: false,
    error: "Error message"
}
```

## 📚 Example Flows

### Simple On/Off Control

```
[inject: "on"] --> [tapo-s220] --> [debug]
[inject: "off"] --> [tapo-s220] --> [debug]
```

### Scheduled Control

```
[inject: daily at 7am, payload:"on"] --> [tapo-s220]
[inject: daily at 11pm, payload:"off"] --> [tapo-s220]
```

### Status Monitoring

```
[inject: every 5 minutes, payload:"status"] --> [tapo-s220] --> [function: extract state] --> [dashboard]
```

## 🔍 Supported Devices

- **S220**: Tapo Smart Switch (via H100 hub) ✅
- **S210**: Tapo Smart Switch (via H100 hub) ✅  
- **S200B**: Tapo Smart Button (via H100 hub) - may work

Other hub-connected devices may also work but are untested.

## 🛠️ Technical Details

### How It Works

1. Node connects to H100 hub via WiFi/LAN (hub has IP address)
2. Authenticates with Tapo cloud using your credentials
3. Retrieves list of child devices from hub
4. Sends control commands to hub using `control_child` method
5. Hub translates commands to sub-GHz radio signals
6. S220 switch receives and executes commands

### Protocol Support

- **KLAP protocol** (newer firmware)
- **Passthrough protocol** (older firmware)
- **Cloud authentication** for credentials
- **Local hub control** for fast commands
- **Sub-GHz communication** between hub and switches

### Requirements

- Node.js >= 14.0.0
- Node-RED >= 1.0.0
- Tapo account with registered devices
- H100 hub connected to your network
- S220 switches paired with H100 hub

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

### No Switches Discovered

**Problem**: "discover" command returns empty list

**Solutions**:
- Verify S220 switches are paired with H100 in Tapo app
- Check switches have batteries and are powered on
- Ensure switches show as "online" in Tapo app
- Try refreshing discovery with `forceRefresh: true`

### Commands Not Working

**Problem**: Commands don't control the device

**Solutions**:
- Verify Device ID is configured correctly
- Check device is online (use "discover" command)
- Ensure device shows in Tapo app
- Try manually controlling in Tapo app first

### Device Offline

**Problem**: Device shows as offline

**Solutions**:
- Check S220 battery level
- Verify signal strength (move hub closer if needed)
- Re-pair device with hub in Tapo app
- Replace batteries if low

## 📋 Known Limitations

- Hub must have internet access for initial authentication
- S220 switches require batteries (monitor battery level)
- Sub-GHz range limited (keep hub within range)
- Commands take slightly longer than WiFi devices
- Cannot control devices without hub connection

## 🏗️ Development

### Project Structure

```
.
├── tapo-s220.js           # Node runtime logic
├── tapo-s220.html         # Node editor UI
├── tapo-hub-connect.js    # Hub communication wrapper
├── package.json           # Node configuration
├── README.md             # This file
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
