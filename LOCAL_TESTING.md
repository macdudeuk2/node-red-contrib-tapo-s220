# Local Testing Guide

Step-by-step guide to test the Tapo nodes locally before publishing.

## Prerequisites

- Node-RED installed and running
- Node.js >= 14.0.0
- Your H100 hub IP address
- Tapo account credentials
- At least one device paired with the hub (S220 or T310)

## Step 1: Install Locally

```bash
# Navigate to your Node-RED directory
cd ~/.node-red

# Install the local package
npm install /Users/andy/cursor/node

# Restart Node-RED
node-red-stop
node-red-start
# OR just: node-red-restart
```

**Alternative: Link for Development**

If you're actively developing and want changes to reflect immediately:

```bash
cd ~/.node-red
npm link /Users/andy/cursor/node
node-red-restart
```

With `npm link`, any changes you make to the source files will be reflected after restarting Node-RED (no reinstall needed).

## Step 2: Verify Installation

1. Open Node-RED in your browser: `http://localhost:1880`

2. Check the node palette (left sidebar) under "smart home":
   - ✅ Tapo Hub (config node - won't appear in palette)
   - ✅ Tapo Switch
   - ✅ Tapo Sensor
   - ✅ Tapo S220 (legacy - still there)

3. Check Node-RED logs for any errors:
```bash
# View logs
tail -f ~/.node-red/node-red.log

# OR if running in terminal, check the output
```

## Step 3: Import Example Flows

1. In Node-RED, click the hamburger menu (☰) → Import
2. Click "select a file to import"
3. Browse to: `/Users/andy/cursor/node/example-flows.json`
4. Import to: "new flows"
5. Click "Import"

You should now see two tabs:
- **Tapo Hub Examples (v2.0)** - New architecture
- **Legacy S220 Examples (v1.x)** - Backward compatibility

## Step 4: Configure Hub

### Option A: Using New Architecture (Recommended)

1. Go to the "Tapo Hub Examples (v2.0)" tab
2. Double-click any device node (switch or sensor)
3. Click the pencil icon (✏️) next to the "Hub" dropdown
4. Click "Add new tapo-hub..."
5. Fill in:
   ```
   Name: Test Hub
   Hub IP Address: 192.168.1.100  (your actual H100 IP)
   Tapo Email: your-email@example.com  (LOWERCASE!)
   Tapo Password: your-password
   ```
6. Click "Add"
7. Click "Done" on the node
8. Click "Deploy"

### Option B: Using Legacy Node (For Comparison)

1. Go to the "Legacy S220 Examples (v1.x)" tab
2. Double-click the "Legacy S220 Node"
3. Fill in:
   ```
   Email: your-email@example.com  (LOWERCASE!)
   Password: your-password
   Hub IP: 192.168.1.100  (your H100 IP)
   ```
4. Click "Done"
5. Click "Deploy"

## Step 5: Test Device Discovery

### Test Switches

1. Click the "Discover Switches" inject node
2. Check the debug panel (bug icon on right sidebar)
3. You should see:
   ```javascript
   {
     "success": true,
     "command": "discover",
     "switches": [
       {
         "device_id": "802454...",
         "nickname": "Kitchen Lights",
         "model": "S220",
         "status": "online",
         "device_on": false,
         ...
       }
     ],
     "totalDevices": 8
   }
   ```

### Test Sensors

1. Click the "Discover Sensors" inject node
2. Check the debug panel
3. You should see your T310/T315 sensors:
   ```javascript
   {
     "success": true,
     "command": "discover",
     "sensors": [
       {
         "device_id": "802E50...",
         "nickname": "Boiler Room Sensor",
         "model": "T310",
         "status": "online",
         "raw": {
           "current_temp": 24.5,
           "current_humidity": 66,
           ...
         }
       }
     ]
   }
   ```

**Troubleshooting Discovery:**
- ❌ "Not connected to H100 hub" → Check hub IP and credentials
- ❌ Empty device list → Verify devices are paired in Tapo app
- ❌ "Invalid authentication" → Email must be LOWERCASE!

## Step 6: Test Switch Control

1. From discovery output, copy a switch `device_id`
2. Double-click "Kitchen Switch" node
3. Paste the device ID in "Device ID" field
4. Click "Done" and "Deploy"
5. Click the inject nodes:
   - **Turn ON** → Physical switch should turn ON
   - **Turn OFF** → Physical switch should turn OFF
   - **Toggle** → Switch should toggle
   - **Get Status** → Should show current state

**Watch the node status** (below the node):
- 🟡 "ready" → Configured but idle
- 🔵 "processing..." → Command in progress
- 🟢 "connected" → Command successful
- 🔴 "error" → Something went wrong

## Step 7: Test Temperature Sensor

1. From sensor discovery, copy a T310/T315 `device_id`
2. Double-click "Boiler Room Sensor" node
3. Paste the device ID
4. Click "Done" and "Deploy"
5. Click "Read Sensor" inject node
6. Check debug output:
   ```javascript
   {
     "success": true,
     "command": "read",
     "readings": {
       "temperature": 24.5,
       "humidity": 66,
       "temp_unit": "celsius"
     },
     "device": {
       "nickname": "Boiler Room Sensor",
       "model": "T310",
       "status": "online",
       "battery_low": false,
       "signal_level": 1
     },
     "timestamp": "2025-10-15T14:30:00.000Z"
   }
   ```

**Watch the node status:**
- Should show: `24.5°C / 66%` (your actual readings)

## Step 8: Test Advanced Features

### Temperature Alert

1. Configure "Temperature Monitor" sensor node with a device ID
2. Edit "Check if > 30°C" function node to adjust threshold
3. Click "Check Temp (every 5 min)" inject
4. Should show alert if temp exceeds threshold

### Monitor Mode

Enable the "Monitor (every 5 min)" inject nodes to continuously monitor sensors.

## Common Test Scenarios

### Scenario 1: Multiple Switches

1. Discover switches
2. Note device IDs
3. Add multiple switch nodes
4. Configure each with different device ID
5. Test controlling independently

### Scenario 2: Multiple Sensors

1. Discover sensors
2. Configure multiple sensor nodes
3. Set up monitoring for each
4. Compare readings

### Scenario 3: Mixed Devices

1. Use 2-3 switch nodes
2. Use 1-2 sensor nodes
3. All sharing the same hub config
4. Verify no conflicts

## Verification Checklist

- [ ] Hub config node created successfully
- [ ] Switch discovery works
- [ ] Sensor discovery works
- [ ] Switch ON command works (physical device responds)
- [ ] Switch OFF command works
- [ ] Switch toggle works
- [ ] Switch status query works
- [ ] Sensor reading works
- [ ] Temperature displayed correctly
- [ ] Humidity displayed correctly
- [ ] Node status indicators work
- [ ] Battery low indicator works (if battery is low)
- [ ] Multiple devices can share one hub config
- [ ] Legacy tapo-s220 node still works

## Performance Testing

### Test Hub Connection Sharing

1. Add 5+ device nodes (mix of switches and sensors)
2. All should use the same hub config
3. Send commands simultaneously
4. All should work (shared connection)

### Test Response Time

1. Time how long commands take:
   - Discovery: ~2-5 seconds
   - Switch on/off: ~1-3 seconds
   - Sensor read: ~1-2 seconds
   - Status query: ~1-2 seconds

## Error Testing

### Test Invalid Credentials

1. Create hub config with wrong password
2. Try discovery
3. Should show authentication error
4. Fix credentials, try again

### Test Offline Device

1. Remove batteries from a device
2. Wait for it to show offline in Tapo app
3. Try to control/read it
4. Should show device offline or not found

### Test Invalid Device ID

1. Configure node with fake device ID
2. Try to control it
3. Should show "device not found" error

## Debugging Tips

### Enable Verbose Logging

Check Node-RED logs:
```bash
tail -f ~/.node-red/node-red.log | grep -i tapo
```

### Use Debug Nodes

Add debug nodes everywhere to see data flow:
```
[inject] → [tapo-switch] → [debug: "Before"]
                         → [function] → [debug: "After"]
```

### Check Hub Connection

Create a simple test flow:
```
[inject: "discover"] → [tapo-switch] → [debug]
```

If this works, hub connection is fine.

## Cleanup After Testing

### Uninstall (if needed)

```bash
cd ~/.node-red
npm uninstall node-red-contrib-tapo-s220
node-red-restart
```

### Unlink (if using npm link)

```bash
cd ~/.node-red
npm unlink node-red-contrib-tapo-s220
node-red-restart
```

### Keep for Production

If everything works well:
```bash
# Keep the installation
# Just restart Node-RED
node-red-restart
```

## Next Steps

After successful local testing:

1. ✅ Document any issues found
2. ✅ Test with multiple device types
3. ✅ Verify backward compatibility with old flows
4. ✅ Check battery monitoring works
5. ✅ Test error handling
6. ✅ Ready for production use or publishing!

## Publishing to npm (Future)

When ready to publish:

```bash
cd /Users/andy/cursor/node

# Update version if needed
npm version patch  # or minor, or major

# Publish to npm
npm publish

# Then users can install:
# npm install node-red-contrib-tapo-s220
```

## Need Help?

If you encounter issues:

1. Check Node-RED logs
2. Check debug panel output
3. Verify devices work in Tapo app
4. Try legacy node for comparison
5. Check GitHub issues

