# Migration Guide: v1.x to v2.0

This guide helps you migrate from the legacy `tapo-s220` node to the new hub config architecture.

## Should You Migrate?

### ✅ Keep Using Legacy (`tapo-s220`)

You can continue using `tapo-s220` if:
- Your current flows work fine
- You only have 1-2 switches
- You don't plan to add sensors
- You prefer not to change working configurations

**The legacy node will continue to work!** No forced migration required.

### ⭐ Migrate to New Architecture

Consider migrating if you want:
- **Sensor support** - Add T310/T315 temperature/humidity sensors
- **Better credential management** - Configure once, use everywhere
- **Multiple devices** - Easier to manage many switches
- **Better performance** - Shared hub connection
- **Future features** - New device types (T100 motion, S200 buttons)

## Migration Path

You have two options:

### Option A: Keep Old, Add New (Recommended)

**Best for:** Production systems, gradual migration

1. Leave existing `tapo-s220` nodes untouched
2. Create new `tapo-hub` config for new devices
3. Add new `tapo-sensor` nodes for temperature sensors
4. Optionally migrate `tapo-s220` → `tapo-switch` one by one

**Benefit:** Zero downtime, zero risk

### Option B: Full Migration

**Best for:** Clean setups, new deployments

1. Create `tapo-hub` config node
2. Replace all `tapo-s220` with `tapo-switch`
3. Add `tapo-sensor` nodes as needed
4. Test everything before deleting old nodes

**Benefit:** Clean, consistent architecture

## Step-by-Step Migration

### Part 1: Create Hub Config Node

#### 1. Open Node-RED

Navigate to your Node-RED editor.

#### 2. Add a Device Node

Drag any new Tapo node onto the canvas:
- `tapo-switch` (for switches), or
- `tapo-sensor` (for sensors)

#### 3. Create Hub Config

1. Double-click the node to open configuration
2. Click the pencil icon next to the "Hub" dropdown
3. Click "Add new tapo-hub..."
4. Fill in the configuration:

```
Name: My H100 Hub (optional friendly name)
Hub IP Address: 192.168.1.100 (your H100 IP)
Tapo Email: your-email@example.com (lowercase!)
Tapo Password: ••••••••
```

5. Click "Add"

**💡 Tip:** Copy these values from your existing `tapo-s220` node configuration.

#### 4. Save

The hub config is now created and can be reused by all device nodes.

---

### Part 2: Migrate a Switch (Example)

Let's migrate one `tapo-s220` node to `tapo-switch`.

#### Before (Legacy):

```
[inject: "on"] --> [tapo-s220: Kitchen] --> [debug]
```

**tapo-s220 configuration:**
- Email: user@example.com
- Password: ••••••••
- Hub IP: 192.168.1.100
- Device ID: 80245406DDDF7D9FDBE28B8FDBE779AF23D5AC4901
- Device Name: Kitchen Lights

#### Migration Steps:

1. **Note the Device ID** from the old node
   - Copy: `80245406DDDF7D9FDBE28B8FDBE779AF23D5AC4901`

2. **Add new `tapo-switch` node** next to the old one

3. **Configure the new node:**
   ```
   Name: Kitchen
   Hub: [Select: My H100 Hub]
   Device ID: 80245406DDDF7D9FDBE28B8FDBE779AF23D5AC4901
   Device Name: Kitchen Lights (optional)
   ```

4. **Rewire the flow:**
   - Disconnect wires from old node
   - Connect to new node

5. **Deploy and test:**
   - Deploy the flow
   - Send test commands
   - Verify it works

6. **Delete old node** (when satisfied)

#### After (New):

```
[inject: "on"] --> [tapo-switch: Kitchen] --> [debug]
                   (uses: My H100 Hub config)
```

**Benefits:**
- Credentials stored in hub config (reusable)
- Cleaner node configuration
- Same functionality

---

### Part 3: Add Sensors (New Capability)

Now you can add temperature sensors!

#### 1. Discover Sensors

Create a temporary flow:

```
[inject: "discover"] --> [tapo-sensor] --> [debug]
```

Configure the sensor node:
- Hub: [Select: My H100 Hub]
- Leave Device ID empty

Deploy, trigger inject, check debug output.

#### 2. Copy Sensor Device ID

From the debug output, find your sensor:

```javascript
{
    "sensors": [
        {
            "device_id": "802E50108CFA822A5354D2B2A0BB4E622440FE53",
            "nickname": "Boiler Room Sensor",
            "model": "T310",
            "status": "online",
            ...
        }
    ]
}
```

Copy the `device_id`.

#### 3. Configure Sensor Node

Edit the sensor node:
- Hub: [Select: My H100 Hub]
- Device ID: `802E50108CFA822A5354D2B2A0BB4E622440FE53`
- Name: Boiler Room

#### 4. Read Temperature

Create your monitoring flow:

```
[inject: every 5 min, payload: "read"] --> [tapo-sensor: Boiler Room] --> [debug]
```

Deploy and enjoy temperature/humidity data!

---

## Full Migration Example

### Before (v1.x - Legacy):

```
Flow: Kitchen Automation

[inject: "discover"] --> [tapo-s220: Config1] --> [debug]
                         Email: user@example.com
                         Password: ••••••••
                         Hub IP: 192.168.1.100
                         (no device ID)

[inject: "on"] --> [tapo-s220: Kitchen] --> [debug]
                   Email: user@example.com
                   Password: ••••••••
                   Hub IP: 192.168.1.100
                   Device ID: 8024...4901

[inject: "off"] --> [tapo-s220: Parking] --> [debug]
                    Email: user@example.com
                    Password: ••••••••
                    Hub IP: 192.168.1.100
                    Device ID: 8024...4900
```

**Problems:**
- Credentials duplicated 3 times
- 3 separate hub connections
- Can't read temperature sensors

### After (v2.0 - New Architecture):

```
Hub Config: "My H100 Hub"
  Email: user@example.com
  Password: ••••••••
  Hub IP: 192.168.1.100

Flow: Kitchen Automation

[inject: "discover"] --> [tapo-switch] --> [debug]
                         Hub: My H100 Hub

[inject: "on"] --> [tapo-switch: Kitchen] --> [debug]
                   Hub: My H100 Hub
                   Device ID: 8024...4901

[inject: "off"] --> [tapo-switch: Parking] --> [debug]
                    Hub: My H100 Hub
                    Device ID: 8024...4900

[inject: every 5 min, "read"] --> [tapo-sensor: Boiler] --> [debug]
                                  Hub: My H100 Hub
                                  Device ID: 802E...FE53
```

**Benefits:**
- Credentials configured once
- Single hub connection (shared)
- Temperature sensor added
- Easier to maintain

---

## Common Migration Scenarios

### Scenario 1: One Switch, Add Sensors

**Current:**
- 1 x `tapo-s220` controlling a switch

**Migration:**
1. Keep the `tapo-s220` node (it works!)
2. Create `tapo-hub` config
3. Add `tapo-sensor` nodes for temperature sensors
4. Optionally migrate switch later

**Result:** Old and new nodes coexist happily.

---

### Scenario 2: Multiple Switches

**Current:**
- 5 x `tapo-s220` nodes (same credentials duplicated)

**Migration:**
1. Create `tapo-hub` config (one time)
2. Add one `tapo-switch` node
3. Test it works
4. Gradually replace other `tapo-s220` nodes
5. Delete old nodes when all migrated

**Result:** Cleaner, more maintainable setup.

---

### Scenario 3: Different Hubs

**Current:**
- Switches on two different H100 hubs

**Migration:**
1. Create `tapo-hub` config for Hub 1
2. Create `tapo-hub` config for Hub 2
3. Assign switches to appropriate hub config

**Result:** Multiple hubs supported, each with its own config.

---

## Troubleshooting Migration

### "No hub config" Error

**Problem:** Node shows red status "no hub config"

**Solution:**
- You forgot to select a hub config
- Edit node, select hub from dropdown
- If dropdown is empty, create a hub config first

### "Device not found" Error

**Problem:** Commands fail with device not found

**Solution:**
- Device ID might be incorrect
- Send "discover" command to get fresh device IDs
- Copy/paste carefully (device IDs are long!)

### Credentials Not Working

**Problem:** Hub config can't authenticate

**Solution:**
- Email must be lowercase (common issue!)
- Password copied correctly?
- Internet connection active? (cloud auth required)

### Old and New Nodes Conflict?

**Problem:** Worried about running both simultaneously

**Solution:**
- No conflict! They can run together
- Both connect to same hub (hub handles it)
- Migrate at your own pace

---

## Rollback Plan

If you need to rollback:

### If You Kept Old Nodes

1. Delete new nodes
2. Reconnect old `tapo-s220` nodes
3. Deploy

**Done!** You're back to v1.x behavior.

### If You Deleted Old Nodes

1. Recreate `tapo-s220` nodes
2. Copy credentials from hub config
3. Copy device IDs from new nodes
4. Deploy

Old configuration will work again.

---

## Checklist

Use this checklist for migration:

- [ ] **Backup** - Export your flows before starting
- [ ] **Note credentials** - Email, password, hub IP
- [ ] **Note device IDs** - Copy from existing nodes
- [ ] **Create hub config** - Configure once
- [ ] **Test discovery** - Verify hub connection works
- [ ] **Migrate one node** - Test before doing more
- [ ] **Verify functionality** - Ensure commands work
- [ ] **Add sensors** (optional) - If you have T310/T315
- [ ] **Migrate remaining** - When comfortable
- [ ] **Delete old nodes** - When fully tested
- [ ] **Update documentation** - Update your notes/docs

---

## Need Help?

If you encounter issues during migration:

1. **Check the logs** - Node-RED debug panel
2. **Read error messages** - Usually helpful
3. **Try discovery** - Verify hub connection
4. **Test in Tapo app** - Ensure devices work there first
5. **Open an issue** - GitHub issues for this project

---

## Summary

**Migration is optional!** Your existing `tapo-s220` nodes will continue to work.

**Why migrate?**
- Better architecture
- Sensor support
- Easier management
- Future features

**How to migrate?**
1. Create hub config
2. Replace nodes one by one
3. Test as you go
4. No rush!

**Safe migration:**
- Keep old nodes during testing
- Migrate gradually
- Can rollback anytime
- Old and new work together

Good luck with your migration! 🚀

