# Testing Guide for Tapo S220 Node

This guide will help you test the Tapo S220 Node-RED node with your actual devices.

## Prerequisites

- Node-RED installed and running
- H100 hub set up and connected to your network
- S220 switches paired with the H100 hub
- Tapo account credentials (email and password)
- Devices on the same local network as your Node-RED instance

## Installation for Testing

1. **Link the node to Node-RED:**
   ```bash
   cd /Users/andy/cursor/node
   npm link
   
   cd ~/.node-red
   npm link node-red-contrib-tapo-s220
   ```

2. **Restart Node-RED:**
   ```bash
   node-red-stop
   node-red
   ```

3. **Verify installation:**
   - Open Node-RED editor (usually http://localhost:1880)
   - Look for "Tapo S220" in the "smart home" category

## Test Flows

### Test 1: Device Discovery

**Purpose**: Verify cloud authentication and discover your S220 switches

**Flow:**
```
[Inject] --> [Tapo S220] --> [Debug]
```

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"list"`
   - Inject once

2. **Tapo S220 Node:**
   - Email: Your Tapo account email (lowercase only!)
   - Password: Your Tapo account password
   - Device IP: Leave empty
   - Device Name: Leave empty

3. **Debug Node:**
   - Show complete message object

**Expected Output:**
```json
{
  "payload": {
    "success": true,
    "command": "listDevices",
    "switches": [
      {
        "deviceType": "SMART.KASASWITCH",
        "deviceModel": "S220",
        "deviceName": "Kitchen Switch",
        "deviceId": "...",
        "deviceIp": "192.168.1.100",
        ...
      }
    ],
    "plugs": [...]
  }
}
```

**Troubleshooting:**
- If authentication fails, ensure email is all lowercase
- Check internet connection (cloud auth requires internet)
- Verify credentials in Tapo app

---

### Test 2: Turn Switch On

**Purpose**: Test basic control functionality

**Flow:**
```
[Inject] --> [Tapo S220] --> [Debug]
```

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"on"`

2. **Tapo S220 Node:**
   - Email: Your Tapo account email
   - Password: Your Tapo account password
   - **Device IP**: Enter the IP from Test 1 (e.g., `192.168.1.100`)

3. **Debug Node:**
   - Show complete message object

**Expected Output:**
```json
{
  "payload": {
    "success": true,
    "state": "on",
    "command": "turnOn"
  }
}
```

**Verification:**
- Physical S220 switch should turn ON
- Check switch status in Tapo app

---

### Test 3: Turn Switch Off

**Purpose**: Test off command

**Flow:** Same as Test 2

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"off"`

**Expected Output:**
```json
{
  "payload": {
    "success": true,
    "state": "off",
    "command": "turnOff"
  }
}
```

**Verification:**
- Physical S220 switch should turn OFF

---

### Test 4: Toggle Switch

**Purpose**: Test toggle functionality

**Flow:** Same as Test 2

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"toggle"`

**Expected Behavior:**
- If switch is ON, it turns OFF
- If switch is OFF, it turns ON

**Expected Output:**
```json
{
  "payload": {
    "success": true,
    "state": "on",  // or "off" depending on previous state
    "command": "toggle"
  }
}
```

---

### Test 5: Get Device Status

**Purpose**: Query current device state

**Flow:** Same as Test 2

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"status"`

**Expected Output:**
```json
{
  "payload": {
    "success": true,
    "command": "getInfo",
    "deviceInfo": {
      "device_on": true,
      "nickname": "Kitchen Switch",
      "model": "S220",
      "mac": "...",
      "fw_ver": "...",
      "hw_ver": "...",
      "type": "SMART.KASASWITCH",
      ...
    }
  }
}
```

---

### Test 6: Multiple Commands

**Purpose**: Test multiple inject nodes controlling the same switch

**Flow:**
```
[Inject: "on"] ----\
                    --> [Tapo S220] --> [Debug]
[Inject: "off"] ---/
```

**Expected Behavior:**
- Clicking "on" inject turns switch ON
- Clicking "off" inject turns switch OFF
- Both should work independently

---

### Test 7: Automated Schedule

**Purpose**: Test scheduled automation

**Flow:**
```
[Inject: timestamp - every 1 minute] --> [Function] --> [Tapo S220] --> [Debug]
```

**Function Node Code:**
```javascript
// Get current time
const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();

// Turn on at :00 seconds, off at :30 seconds
const second = now.getSeconds();

if (second < 30) {
    msg.payload = "on";
} else {
    msg.payload = "off";
}

return msg;
```

**Expected Behavior:**
- Switch alternates ON/OFF every 30 seconds

---

### Test 8: Error Handling

**Purpose**: Test error responses

**Test 8a: Invalid Command**

**Configuration:**
1. **Inject Node:**
   - Set `msg.payload` to string: `"invalid"`

**Expected Output:**
```json
{
  "payload": {
    "success": false,
    "error": "Unknown command: invalid",
    "availableCommands": ["on", "off", "toggle", "status", "list"]
  }
}
```

**Test 8b: Missing Device IP**

1. **Tapo S220 Node:**
   - Clear the Device IP field

2. **Inject Node:**
   - Set `msg.payload` to string: `"on"`

**Expected Output:**
```json
{
  "payload": {
    "success": false,
    "error": "Device not connected locally. Provide device IP."
  }
}
```

---

## Advanced Testing

### Test 9: Multiple Devices

**Purpose**: Control multiple S220 switches

**Flow:**
```
[Inject: "on"] --> [Tapo S220 #1: Kitchen] --> [Debug]
[Inject: "on"] --> [Tapo S220 #2: Living Room] --> [Debug]
```

**Configuration:**
- Create two Tapo S220 nodes with different Device IPs
- Test that they control different switches independently

---

### Test 10: Status Monitoring Dashboard

**Purpose**: Create a real-time status display

**Flow:**
```
[Inject: interval 5s] --> [Change: set payload to "status"] --> [Tapo S220] --> [Function: extract state] --> [Dashboard Gauge]
```

**Function Node Code:**
```javascript
if (msg.payload.success && msg.payload.deviceInfo) {
    msg.payload = msg.payload.deviceInfo.device_on ? 1 : 0;
    return msg;
}
return null;
```

**Expected Behavior:**
- Dashboard gauge shows current switch state
- Updates every 5 seconds

---

## Debugging

### Enable Node-RED Debug Logging

```bash
node-red --verbose
```

### Check Node Logs

Monitor the Node-RED console for log messages:
- "Successfully logged into Tapo cloud"
- "Connected to device at [IP]"
- "Device turned ON/OFF"
- "Retrieved device info"

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Invalid authentication" | Ensure email is lowercase, check password |
| "Device not connected" | Verify Device IP is set and correct |
| "Connection failed" | Check network connectivity, device power |
| Commands timeout | Increase timeout, check firewall settings |
| Node shows red | Check Node-RED logs for detailed error |

---

## Performance Testing

### Response Time Test

Measure command response time:

1. Enable timestamp on Debug node
2. Send multiple "on"/"off" commands
3. Check time between inject and response

**Expected:** < 2 seconds for local commands

### Reliability Test

Run automated toggle test for 100 cycles:

```javascript
// In Function node
const count = context.get('count') || 0;
context.set('count', count + 1);

if (count >= 100) {
    node.status({fill: "green", text: "Complete: " + count});
    return null;
}

msg.payload = (count % 2 === 0) ? "on" : "off";
node.status({fill: "blue", text: "Count: " + count});
return msg;
```

**Expected:** 100% success rate

---

## Reporting Issues

If you find bugs or issues:

1. Note the exact error message
2. Check Node-RED console logs
3. Verify device model and firmware version
4. Test with Tapo app to confirm device works
5. Document steps to reproduce

---

## Next Steps

Once testing is complete:

1. Consider publishing to npm
2. Add to Node-RED library
3. Create demo video
4. Write blog post or tutorial
5. Add more device types (P100, L530, etc.)

---

## Test Checklist

- [ ] Device discovery works
- [ ] Turn switch ON works
- [ ] Turn switch OFF works
- [ ] Toggle works correctly
- [ ] Status query returns correct data
- [ ] Multiple devices work independently
- [ ] Error handling works properly
- [ ] Authentication with lowercase email works
- [ ] Node status indicators are correct
- [ ] Commands complete in < 2 seconds
- [ ] No memory leaks after extended use
- [ ] Survives Node-RED restart
- [ ] Works after device power cycle



