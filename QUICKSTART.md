# Quick Start Guide

Get your Tapo S220 switch working with Node-RED in 5 minutes!

## ⚠️ Important: Hub-Based Architecture

**S220 switches do NOT have IP addresses!** They communicate with the H100 hub via sub-GHz radio. You need to configure the hub IP, not the switch IP.

## 1. Install the Node

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

## 2. Find Your H100 Hub IP

- Check your router's connected devices
- Or check the Tapo app → Hub settings
- Example: `192.168.1.100`

**Note:** This is the hub IP, NOT the S220 switch!

## 3. Configure the Node

1. Open Node-RED editor: http://localhost:1880
2. Find "Tapo S220" in the "smart home" category
3. Drag it onto the canvas
4. Double-click to configure:
   - **Email**: your@email.com (must be lowercase!)
   - **Password**: your Tapo password
   - **H100 Hub IP**: 192.168.1.100 (your hub's IP)
   - Leave Device ID empty for now
5. Click "Done"
6. Click "Deploy"

## 4. Discover Your S220 Switches

Create this simple flow:

```
[inject] --> [tapo-s220] --> [debug]
```

1. Add an **Inject** node
2. Set `msg.payload` to string: `"discover"`
3. Connect: Inject → Tapo S220 → Debug
4. Click the inject button
5. Open the debug panel (right side)

You'll see output like:
```json
{
  "switches": [
    {
      "device_id": "abc123...",
      "nickname": "Kitchen Switch",
      "model": "S220",
      "device_on": false
    }
  ]
}
```

6. **Copy the `device_id`** of your switch

## 5. Add Device ID

1. Double-click the "Tapo S220" node again
2. Paste the Device ID you copied
3. Click "Done"
4. Click "Deploy"

## 6. Test It!

Now add these inject nodes:

```
[inject: "on"] --\
                  --> [tapo-s220] --> [debug]
[inject: "off"] -/
```

Click the buttons:
- **"on"** button → Switch turns ON ✅
- **"off"** button → Switch turns OFF ✅

## 🎉 Success!

Your S220 switch is now controlled by Node-RED!

## Next Steps

### Toggle Command

```
[inject: "toggle"] --> [tapo-s220] --> [debug]
```

### Status Query

```
[inject: "status"] --> [tapo-s220] --> [debug]
```

### Scheduled Automation

```
[inject: cron "0 7 * * *", payload:"on"] --> [tapo-s220]
[inject: cron "0 23 * * *", payload:"off"] --> [tapo-s220]
```

## 🐛 Troubleshooting

### "Invalid authentication"
→ Make sure email is all lowercase

### "Hub not found"
→ Check the H100 hub IP address is correct

### "No switches discovered"
→ Verify S220 is paired with H100 in Tapo app

### "Device not responding"
→ Check S220 battery level and signal strength

## 💡 Tips

- Keep batteries fresh in S220 switches
- Keep hub within range of switches
- Hub needs internet for initial auth
- Commands go through hub (slightly slower than WiFi devices)

## 📚 More Info

See **README.md** for complete documentation  
See **TESTING.md** for comprehensive testing guide

Happy automating! 🎉
