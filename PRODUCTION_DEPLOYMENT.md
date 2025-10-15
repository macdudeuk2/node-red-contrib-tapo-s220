# Production Deployment Guide

Safe procedure to update the Tapo nodes on your production Node-RED server from GitHub.

## ⚠️ Important Notes

- **Your existing flows will continue to work** - The legacy `tapo-s220` nodes are unchanged
- **No forced migration** - You can keep using old nodes alongside new ones
- **Backward compatible** - This is v2.0.0 with full backward compatibility
- **New features added** - Hub config node and T310 sensor support

## Pre-Deployment Checklist

Before updating production:

- [ ] Backup your flows (Menu → Export → All flows)
- [ ] Note your current package version (`npm list node-red-contrib-tapo-s220`)
- [ ] Ensure GitHub repository is up-to-date
- [ ] Have rollback plan ready (see below)
- [ ] Optional: Test on a staging/dev instance first

## Deployment Sequence

### Step 1: Backup Current Flows

**SSH into your production server:**

```bash
ssh user@your-production-server
```

**Backup flows:**

```bash
# Navigate to Node-RED directory
cd ~/.node-red

# Backup flows file
cp flows.json flows.json.backup-$(date +%Y%m%d-%H%M%S)

# Backup package.json
cp package.json package.json.backup-$(date +%Y%m%d-%H%M%S)

# Verify backups exist
ls -lh flows.json.backup-* package.json.backup-*
```

### Step 2: Check Current Installation

```bash
cd ~/.node-red

# Check current version
npm list node-red-contrib-tapo-s220

# Should show something like:
# node-red-contrib-tapo-s220@1.0.0
```

### Step 3: Update from GitHub

**Option A: Update via npm (if previously installed from local path)**

```bash
cd ~/.node-red

# Remove old installation
npm uninstall node-red-contrib-tapo-s220

# Reinstall from local path (update the path to match your server)
npm install /path/to/node-red-contrib-tapo-s220

# OR if you've cloned the repo on the server:
npm install ~/node-red-contrib-tapo-s220
```

**Option B: Update via Git (Recommended for production)**

```bash
# Navigate to the package directory
cd ~/node-red-contrib-tapo-s220  # Or wherever you cloned it

# Pull latest changes from GitHub
git pull origin main

# Check what changed
git log -3

# Should show:
# a049397 docs: Update example flows and add local testing guide
# d8ed088 docs: Remove outdated analysis and planning documents
# c8ede82 feat: Add hub config node architecture and T310 sensor support

# Reinstall in Node-RED
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220
```

**Option C: Fresh Clone from GitHub**

```bash
# Navigate to your home or projects directory
cd ~

# Backup old version (if exists)
mv node-red-contrib-tapo-s220 node-red-contrib-tapo-s220.old

# Clone fresh from GitHub
git clone https://github.com/macdudeuk2/node-red-contrib-tapo-s220.git

# Install dependencies
cd node-red-contrib-tapo-s220
npm install

# Install to Node-RED
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220
```

### Step 4: Verify Installation

```bash
cd ~/.node-red

# Check new version
npm list node-red-contrib-tapo-s220

# Should show:
# node-red-contrib-tapo-s220@2.0.0

# Check installed files
ls -la node_modules/node-red-contrib-tapo-s220/

# Should see:
# tapo-s220.js (legacy)
# tapo-hub.js (new)
# tapo-switch.js (new)
# tapo-sensor.js (new)
# + corresponding .html files
```

### Step 5: Restart Node-RED

**Option A: If using systemd service:**

```bash
# Restart Node-RED service
sudo systemctl restart node-red

# Check status
sudo systemctl status node-red

# Watch logs
journalctl -u node-red -f
```

**Option B: If using pm2:**

```bash
# Restart Node-RED
pm2 restart node-red

# Check status
pm2 status node-red

# View logs
pm2 logs node-red
```

**Option C: If running manually:**

```bash
# Stop Node-RED (Ctrl+C if running in terminal)
# Or:
node-red-stop

# Start Node-RED
node-red-start
# Or just:
node-red
```

### Step 6: Verify Node-RED Started Successfully

```bash
# Check Node-RED logs for errors
# Look for these lines:

# [info] Starting flows
# [info] Started flows

# Check for Tapo node registration:
grep -i "tapo" ~/.node-red/node-red.log

# Should see something like:
# [info] Registered type: tapo-s220
# [info] Registered type: tapo-hub
# [info] Registered type: tapo-switch
# [info] Registered type: tapo-sensor
```

### Step 7: Check Node-RED UI

1. **Open Node-RED in browser:**
   ```
   http://your-server-ip:1880
   ```

2. **Check the node palette (left sidebar):**
   - Look under "smart home" category
   - Should see:
     - ✅ Tapo S220 (legacy - still there)
     - ✅ Tapo Switch (new)
     - ✅ Tapo Sensor (new)

3. **Verify existing flows still work:**
   - Check your existing `tapo-s220` nodes
   - They should show normal status (not red error)
   - Deploy button should NOT be red (no config issues)

### Step 8: Test Existing Flows

**Don't change anything yet!** Just verify:

1. Click "Deploy" to reload flows (if needed)
2. Test your existing `tapo-s220` nodes:
   - Send a test "status" command
   - Verify it responds normally
3. Check debug output for any errors

**Expected:** Everything works exactly as before!

### Step 9: Optional - Test New Features

**Only after confirming existing flows work:**

1. Add a new `tapo-sensor` node to test T310 support
2. Create a hub config node
3. Try discovery on the new node
4. Don't change existing working flows yet!

## Post-Deployment Verification

- [ ] Node-RED started successfully
- [ ] All 4 node types registered (s220, hub, switch, sensor)
- [ ] Existing flows work unchanged
- [ ] Existing `tapo-s220` nodes respond normally
- [ ] Can add new nodes from palette
- [ ] No errors in Node-RED logs

## Common Issues & Solutions

### Issue: "Cannot find module"

**Error:**
```
Error: Cannot find module 'node-red-contrib-tapo-s220'
```

**Solution:**
```bash
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220
node-red-restart
```

### Issue: "Old nodes show red triangle"

**Cause:** Package not properly installed or Node-RED didn't restart

**Solution:**
```bash
# Reinstall
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220 --force

# Restart Node-RED
sudo systemctl restart node-red
```

### Issue: "New nodes don't appear in palette"

**Cause:** Node-RED cache or registration issue

**Solution:**
```bash
# Clear Node-RED cache
rm -rf ~/.node-red/.cache

# Restart Node-RED
sudo systemctl restart node-red

# Force reinstall
cd ~/.node-red
npm uninstall node-red-contrib-tapo-s220
npm install ~/node-red-contrib-tapo-s220
sudo systemctl restart node-red
```

### Issue: "Existing flows broken"

**Immediate rollback!** See below.

## Rollback Procedure

If something goes wrong:

### Quick Rollback

```bash
cd ~/.node-red

# Stop Node-RED
sudo systemctl stop node-red

# Restore flows backup
cp flows.json.backup-YYYYMMDD-HHMMSS flows.json

# Uninstall new version
npm uninstall node-red-contrib-tapo-s220

# Reinstall old version (if you kept a backup)
# OR just leave it uninstalled and reinstall from previous source

# Restart Node-RED
sudo systemctl start node-red
```

### Complete Rollback

If you kept the old package directory:

```bash
cd ~/.node-red

# Uninstall current
npm uninstall node-red-contrib-tapo-s220

# Restore old version
cd ~
mv node-red-contrib-tapo-s220.old node-red-contrib-tapo-s220

# Reinstall old version
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220

# Restart
sudo systemctl restart node-red
```

## Best Practices for Production

### Staged Deployment

1. **Dev/Test First:**
   - Test on development instance
   - Verify all functionality
   - Test migration path

2. **Production Second:**
   - Deploy during maintenance window
   - Have rollback plan ready
   - Monitor closely after deployment

### Monitoring After Deployment

```bash
# Watch logs for 5-10 minutes
journalctl -u node-red -f

# Or with pm2:
pm2 logs node-red --lines 100

# Look for:
# ✅ "Started flows" - Good
# ✅ Normal command processing - Good
# ❌ Errors or exceptions - Investigate
# ❌ Repeated reconnection attempts - Check hub config
```

### Gradual Migration Strategy

**Don't migrate everything at once!**

1. **Week 1:** Just deploy v2.0, keep using old nodes
2. **Week 2:** Add one new sensor node (T310)
3. **Week 3:** Create hub config, test with one switch
4. **Week 4+:** Gradually migrate other switches if desired

**Remember:** You never have to migrate! Old nodes work forever.

## Quick Reference Commands

### Check Version
```bash
cd ~/.node-red
npm list node-red-contrib-tapo-s220
```

### Update from GitHub
```bash
cd ~/node-red-contrib-tapo-s220
git pull origin main
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220
sudo systemctl restart node-red
```

### View Logs
```bash
# Systemd:
journalctl -u node-red -f

# PM2:
pm2 logs node-red

# Manual:
tail -f ~/.node-red/node-red.log
```

### Restart Node-RED
```bash
# Systemd:
sudo systemctl restart node-red

# PM2:
pm2 restart node-red

# Manual:
node-red-stop && node-red-start
```

## Summary: Safe Deployment Sequence

```bash
# 1. Backup
cd ~/.node-red
cp flows.json flows.json.backup-$(date +%Y%m%d-%H%M%S)

# 2. Update code from GitHub
cd ~/node-red-contrib-tapo-s220
git pull origin main

# 3. Reinstall
cd ~/.node-red
npm install ~/node-red-contrib-tapo-s220

# 4. Restart
sudo systemctl restart node-red

# 5. Verify
npm list node-red-contrib-tapo-s220  # Should show 2.0.0
journalctl -u node-red -f  # Watch for errors

# 6. Test
# Open Node-RED UI, check existing flows still work
```

That's it! Your production system is updated safely. ✅

