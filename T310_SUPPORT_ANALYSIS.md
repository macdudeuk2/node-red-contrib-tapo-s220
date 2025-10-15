# T310 Temperature & Humidity Sensor Support - Analysis

## Overview

Adding T310 support to this Node-RED implementation is **straightforward** since:
1. T310 sensors are already discovered by the existing hub connection
2. They communicate via the same H100 hub using sub-GHz radio
3. The underlying `tapo-hub-connect.js` wrapper already supports them

## T310 Device Characteristics

From your discovery response, T310 sensors provide:

```javascript
{
  "device_id": "802E50108CFA822A5354D2B2A0BB4E622440FE53",
  "category": "subg.trigger.temp-hmdt-sensor",
  "type": "SMART.TAPOSENSOR",
  "model": "T310",
  "hw_ver": "1.0",
  "fw_ver": "1.5.0 Build 230105 Rel.150707",
  "nickname": "Boiler Room Sensor",
  "status": "online",
  
  // Temperature & Humidity Data
  "temp_unit": "celsius",
  "current_temp": 24.5,
  "current_humidity": 66,
  "current_temp_exception": 0,
  "current_humidity_exception": 6,
  
  // Battery & Signal Info
  "at_low_battery": false,
  "rssi": -82,
  "signal_level": 1,
  "jamming_rssi": -121,
  "jamming_signal_level": 1,
  
  // Reporting
  "report_interval": 16
}
```

## Key Differences from S220

| Feature | S220 Switch | T310 Sensor |
|---------|-------------|-------------|
| **Type** | Actuator (controllable) | Sensor (read-only) |
| **Category** | `subg.plugswitch.switch` | `subg.trigger.temp-hmdt-sensor` |
| **Commands** | on, off, toggle, status | status/read only |
| **Data Points** | device_on, led_off | current_temp, current_humidity |
| **Battery** | Yes (coin cell) | Yes (coin cell) |
| **Control** | Bidirectional | Read-only |

## Implementation Plan

### 1. Create New Node Files

**tapo-t310.js** - Node implementation
- Reuse hub connection logic from S220
- Remove control commands (on/off/toggle)
- Add sensor-specific commands:
  - `discover` - Find T310/T315 sensors
  - `status` / `read` - Get current temperature/humidity
  - `get_readings` - Alias for status
- Parse temperature/humidity data
- Handle temperature units (celsius/fahrenheit)

**tapo-t310.html** - Node UI
- Similar to S220 but adapted for sensors
- Remove control-related help text
- Add sensor-specific documentation
- Show example temperature/humidity output
- Change icon to thermometer/sensor icon
- Category: "smart home" or "sensors"

### 2. Reuse Existing Infrastructure

**tapo-hub-connect.js** - No changes needed!
- Already supports `getChildDevices()` which returns T310 data
- Already supports `controlChildDevice()` for get_device_info
- Caching works for sensors too

**package.json** - No changes needed
- `homebridge-kasa-hub` already supports sensors
- No additional dependencies required

### 3. Node Commands

```javascript
// Discover all temperature sensors
msg.payload = "discover";
// Returns: List of T310/T315 sensors

// Get current readings
msg.payload = "read";
// OR
msg.payload = "status";
// Returns: { temp: 24.5, humidity: 66, unit: "celsius", ... }

// Get specific device info
msg.payload = {
  command: "read",
  deviceId: "802E50108CFA822A5354D2B2A0BB4E622440FE53"
};
```

### 4. Output Format

```javascript
{
  "success": true,
  "command": "read",
  "deviceId": "802E50108CFA822A5354D2B2A0BB4E622440FE53",
  "readings": {
    "temperature": 24.5,
    "humidity": 66,
    "temp_unit": "celsius",
    "temp_exception": 0,
    "humidity_exception": 6
  },
  "device": {
    "nickname": "Boiler Room Sensor",
    "model": "T310",
    "status": "online",
    "battery_low": false,
    "signal_level": 1,
    "rssi": -82,
    "report_interval": 16
  },
  "timestamp": "2025-10-15T10:30:00.000Z"
}
```

### 5. Discovery Filter

Update discovery to recognize temperature sensors:

```javascript
// In tapo-t310.js
const sensors = allDevices.filter(d => 
    d.category && d.category.includes('temp-hmdt-sensor') ||
    d.model && (d.model.includes('T310') || d.model.includes('T315'))
);
```

## Effort Estimate

**Low Complexity** - Approximately 2-3 hours

1. ✅ **Copy & Adapt S220 files** (30 min)
   - Copy `tapo-s220.js` → `tapo-t310.js`
   - Copy `tapo-s220.html` → `tapo-t310.html`
   - Remove control logic, add sensor reading logic

2. ✅ **Update Discovery Logic** (15 min)
   - Filter for temp-hmdt-sensor category
   - Parse temperature/humidity fields

3. ✅ **Implement Read Command** (30 min)
   - Extract current_temp, current_humidity
   - Format response with timestamp
   - Handle missing data gracefully

4. ✅ **Update HTML UI** (45 min)
   - Change labels and help text
   - Update examples for sensor readings
   - Add temperature/humidity output examples

5. ✅ **Testing** (1 hour)
   - Test discovery
   - Test reading from your "Boiler Room Sensor"
   - Test with offline sensor
   - Test battery low alerts

6. ✅ **Documentation** (30 min)
   - Update README
   - Add T310-specific examples
   - Document sensor data fields

## Testing with Your Sensors

You have these T310/T315 sensors available:

1. **Boiler Room Sensor** (T310)
   - Status: online
   - Temp: 24.5°C
   - Humidity: 66%
   - Signal: -82 RSSI (level 1)
   - Battery: OK

2. **Study Temperature Sensor** (T315)
   - Status: online
   - Temp: 22.1°C
   - Humidity: 75%
   - Signal: -60 RSSI (level 3)
   - Battery: 50%

3. **Bedroom Temperature Sensor** (T310)
   - Status: **offline** (good for offline testing)
   - Battery: low

## Potential Challenges

### 1. Temperature Unit Conversion (Easy)
Some users may want Fahrenheit. Simple conversion:
```javascript
const fahrenheit = (celsius * 9/5) + 32;
```

### 2. Exception Values (Unknown)
- `current_temp_exception`: 0, 0, 2.7 in your data
- `current_humidity_exception`: 6, 15, 0 in your data
- **Unknown meaning** - might be threshold/alert values
- Need to test or research what these mean

### 3. Humidity Exception Values
Your data shows:
- Exception 6 at 66% humidity
- Exception 15 at 75% humidity
- Exception 0 at 59% humidity

This might be deviation from comfort range or alert thresholds.

### 4. Report Interval
All devices show `report_interval: 16` (seconds?)
- Might be useful for users to know update frequency
- Could add "last updated" timestamp

## Additional Features to Consider

### Phase 2 Enhancements
- [ ] **Temperature alerts** - Trigger when temp exceeds threshold
- [ ] **Humidity alerts** - Trigger when humidity too high/low
- [ ] **Battery monitoring** - Alert when battery low
- [ ] **Signal strength monitoring** - Alert on weak signal
- [ ] **Historical data** - Store readings in context
- [ ] **Comfort index** - Calculate based on temp + humidity
- [ ] **Trend detection** - Rising/falling temperature

### Multi-Sensor Support
- [ ] **Average readings** - From multiple sensors
- [ ] **Compare sensors** - Show differences
- [ ] **Zone monitoring** - Group sensors by location

## Recommendation

**Proceed with implementation!** The T310 support is:
- ✅ **Technically feasible** - Hub already communicates with them
- ✅ **Low effort** - Mostly copy/adapt from S220
- ✅ **Testable** - You have 3 sensors available
- ✅ **Valuable** - Adds sensor capability to Node-RED

The main work is:
1. Adapting the S220 node to be read-only
2. Parsing temperature/humidity fields
3. Creating appropriate output format
4. Updating documentation

No changes needed to core hub connection code.

## Next Steps

If you want to proceed:
1. I can create the `tapo-t310.js` and `tapo-t310.html` files
2. Test with your "Boiler Room Sensor"
3. Debug any issues
4. Document the new node
5. Update package.json to register the new node

Would you like me to implement T310 support now?

