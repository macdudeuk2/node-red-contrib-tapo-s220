# Safe Node-RED Upgrade Guide

How to safely upgrade Node-RED and Node.js on your production server.

## Pre-Upgrade Checklist

Before upgrading anything:

- [ ] **Backup everything** (see BACKUP_GUIDE.md)
- [ ] Check current versions
- [ ] Review Node-RED release notes
- [ ] Check Node.js compatibility
- [ ] Plan maintenance window
- [ ] Have rollback plan ready

## Check Current Versions

```bash
# SSH into your server
ssh user@your-server

# Check Node-RED version
node-red --version
# Example output: 3.1.0

# Check Node.js version
node --version
# Example output: v18.19.0

# Check npm version
npm --version
# Example output: 10.2.3

# List installed Node-RED nodes
cd ~/.node-red
npm list --depth=0
```

## Upgrade Strategies

### Strategy 1: Safe Incremental Upgrade (Recommended)

Upgrade Node-RED without touching Node.js (safest).

#### Step 1: Create Full Backup

```bash
# Create backup
cd ~
tar -czf nodered-backup-before-upgrade-$(date +%Y%m%d).tar.gz \
    --exclude='node_modules' \
    --exclude='.npm' \
    --exclude='*.log' \
    .node-red/

# Download to local machine (from local machine)
scp user@remote-server:~/nodered-backup-before-upgrade-*.tar.gz ~/backups/
```

#### Step 2: Stop Node-RED

```bash
# Stop the service
sudo systemctl stop node-red

# Verify it's stopped
sudo systemctl status node-red
```

#### Step 3: Upgrade Node-RED

```bash
# Upgrade Node-RED globally
sudo npm install -g --unsafe-perm node-red

# Check new version
node-red --version
```

#### Step 4: Upgrade Node-RED Packages

```bash
# Navigate to Node-RED directory
cd ~/.node-red

# Update package.json dependencies
npm outdated  # See what can be updated

# Update all packages (careful!)
npm update

# Or update specific packages only
npm update node-red-dashboard
npm update node-red-contrib-tapo-s220
```

#### Step 5: Test and Start

```bash
# Start Node-RED
sudo systemctl start node-red

# Watch logs for errors
journalctl -u node-red -f

# Press Ctrl+C when satisfied

# Check status
sudo systemctl status node-red
```

#### Step 6: Verify in Browser

1. Open Node-RED: `http://your-server:1880`
2. Check all flows load correctly
3. Deploy (to reload everything)
4. Test critical flows
5. Check for any warnings/errors

---

### Strategy 2: Complete Upgrade (Node.js + Node-RED)

Upgrade both Node.js and Node-RED (more risk, better long-term).

#### Check Compatibility

Node-RED version requirements:
- **Node-RED 3.x** requires Node.js **14.x, 16.x, 18.x, or 20.x**
- **Node-RED 2.x** requires Node.js **12.x or 14.x**

Check [Node-RED requirements](https://nodered.org/docs/faq/node-versions)

#### Step 1: Backup (Critical!)

```bash
# Full backup
cd ~
tar -czf nodered-backup-before-major-upgrade-$(date +%Y%m%d).tar.gz \
    --exclude='node_modules' \
    --exclude='.npm' \
    .node-red/

# Download to local
# (from local machine)
scp user@remote-server:~/nodered-backup-*.tar.gz ~/backups/
```

#### Step 2: Stop Node-RED

```bash
sudo systemctl stop node-red
```

#### Step 3: Upgrade Node.js

**Option A: Using NodeSource (Recommended)**

```bash
# For Node.js 20.x LTS (current recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version
```

**Option B: Using nvm (More flexible)**

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
```

#### Step 4: Reinstall Node-RED

```bash
# Reinstall Node-RED with new Node.js version
sudo npm install -g --unsafe-perm node-red

# Verify
node-red --version
```

#### Step 5: Rebuild Native Modules

```bash
# Some packages have native components that need rebuilding
cd ~/.node-red
npm rebuild

# Or reinstall everything from scratch
rm -rf node_modules package-lock.json
npm install
```

#### Step 6: Start and Test

```bash
# Start Node-RED
sudo systemctl start node-red

# Monitor logs
journalctl -u node-red -f
```

---

## Upgrading Specific Nodes (e.g., Tapo Nodes)

### Update to Latest Version from GitHub

```bash
# Stop Node-RED
sudo systemctl stop node-red

# Backup flows
cd ~/.node-red
cp flows.json flows.json.backup
cp flows_cred.json flows_cred.json.backup

# Update the Tapo node
npm uninstall node-red-contrib-tapo-s220
npm install https://github.com/macdudeuk2/node-red-contrib-tapo-s220.git

# Verify installation
npm list node-red-contrib-tapo-s220

# Start Node-RED
sudo systemctl start node-red
```

### Update All Custom Nodes

```bash
cd ~/.node-red

# See what's outdated
npm outdated

# Update all (careful - test first!)
npm update

# Or update one by one
npm update node-red-dashboard
npm update node-red-contrib-tapo-s220
```

---

## Rollback Procedures

### If Upgrade Fails

#### Quick Rollback - Restore Flows Only

```bash
# Stop Node-RED
sudo systemctl stop node-red

# Restore flows from backup
cd ~/.node-red
cp flows.json.backup flows.json
cp flows_cred.json.backup flows_cred.json

# Start
sudo systemctl start node-red
```

#### Full Rollback - Restore Everything

```bash
# Stop Node-RED
sudo systemctl stop node-red

# Remove current installation
cd ~
rm -rf .node-red

# Restore from backup
tar -xzf nodered-backup-before-upgrade-YYYYMMDD.tar.gz

# Reinstall packages
cd ~/.node-red
npm install

# Start
sudo systemctl start node-red
```

#### Rollback Node.js Version (if using nvm)

```bash
# List installed versions
nvm list

# Switch back to previous version
nvm use 18  # or whatever version you had

# Reinstall Node-RED for that version
sudo npm install -g --unsafe-perm node-red

# Rebuild modules
cd ~/.node-red
npm rebuild
```

---

## Testing After Upgrade

### Quick Test Checklist

- [ ] Node-RED starts without errors
- [ ] All flows appear in editor
- [ ] No red triangles (missing nodes)
- [ ] Deploy works
- [ ] Critical flows execute
- [ ] Tapo nodes work (discover, control)
- [ ] Credentials still work
- [ ] No errors in logs

### Detailed Testing

```bash
# Watch logs during testing
journalctl -u node-red -f
```

**Test these functions:**

1. **Flow deployment**
   - Click Deploy
   - Check for errors
   - Verify success message

2. **Tapo nodes**
   - Test discovery
   - Test switch control
   - Test sensor reading
   - Verify credentials work

3. **Critical flows**
   - Trigger each important flow
   - Verify output
   - Check debug panel

4. **Dashboard (if used)**
   - Open dashboard
   - Check all widgets
   - Test interactions

---

## Common Issues and Solutions

### Issue: "Module not found" after upgrade

**Solution:**
```bash
cd ~/.node-red
npm install
sudo systemctl restart node-red
```

### Issue: Native modules fail to load

**Solution:**
```bash
cd ~/.node-red
npm rebuild
sudo systemctl restart node-red
```

### Issue: Flows won't deploy

**Cause:** Incompatible node versions

**Solution:**
```bash
# Check for outdated nodes
cd ~/.node-red
npm outdated

# Update problematic nodes
npm update node-red-contrib-problematic-node

# Or reinstall
npm uninstall node-red-contrib-problematic-node
npm install node-red-contrib-problematic-node
```

### Issue: Credentials lost/not working

**Cause:** Missing `flows_cred.json` or wrong `credentialSecret`

**Solution:**
```bash
# Restore from backup
cd ~/.node-red
cp flows_cred.json.backup flows_cred.json

# Check settings.js has correct credentialSecret
cat settings.js | grep credentialSecret
```

### Issue: Service won't start after Node.js upgrade

**Cause:** systemd service pointing to old Node.js path

**Solution:**
```bash
# Check service file
sudo systemctl cat node-red

# If needed, edit service
sudo systemctl edit --full node-red

# Update ExecStart path if needed
# Then reload
sudo systemctl daemon-reload
sudo systemctl restart node-red
```

---

## Best Practices

### 1. Test in Development First

If possible:
- Create a test VM/container
- Install same versions as production
- Restore production backup
- Test upgrade process
- Verify everything works
- Then upgrade production

### 2. Schedule Maintenance Window

- Choose low-usage time
- Notify users (if applicable)
- Allow 1-2 hours for upgrade + testing
- Have rollback plan ready

### 3. Incremental Upgrades

Don't skip major versions:
- ❌ Don't: Node-RED 2.0 → 3.1 in one jump
- ✅ Do: Node-RED 2.0 → 2.2 → 3.0 → 3.1

### 4. Keep Notes

Document:
- What you upgraded
- When you upgraded
- Any issues encountered
- How you resolved them

### 5. Monitor After Upgrade

```bash
# Watch logs for 24 hours
journalctl -u node-red -f

# Check for memory leaks
top -u your-username

# Monitor disk usage
df -h
du -sh ~/.node-red/
```

---

## Upgrade Command Reference

### Check Versions
```bash
node-red --version
node --version
npm --version
cd ~/.node-red && npm list --depth=0
```

### Backup
```bash
tar -czf ~/nodered-backup-$(date +%Y%m%d).tar.gz --exclude='node_modules' ~/.node-red/
```

### Upgrade Node-RED Only
```bash
sudo systemctl stop node-red
sudo npm install -g --unsafe-perm node-red
sudo systemctl start node-red
```

### Upgrade Node.js (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Rebuild Modules
```bash
cd ~/.node-red
npm rebuild
```

### Restore from Backup
```bash
sudo systemctl stop node-red
cd ~ && rm -rf .node-red
tar -xzf nodered-backup-YYYYMMDD.tar.gz
cd ~/.node-red && npm install
sudo systemctl start node-red
```

---

## Recommended Upgrade Schedule

- **Minor updates** (e.g., 3.1.0 → 3.1.1): Monthly
- **Major updates** (e.g., 3.0 → 3.1): Quarterly
- **Node.js LTS updates**: When new LTS released
- **Security patches**: Immediately

---

## Quick Upgrade Script (Conservative)

```bash
#!/bin/bash
# Safe Node-RED upgrade script
# Run on remote server

set -e

echo "=== Safe Node-RED Upgrade ==="

# Backup
echo "Creating backup..."
cd ~
tar -czf nodered-backup-before-upgrade-$(date +%Y%m%d-%H%M%S).tar.gz \
    --exclude='node_modules' \
    --exclude='.npm' \
    .node-red/

# Stop
echo "Stopping Node-RED..."
sudo systemctl stop node-red

# Upgrade
echo "Upgrading Node-RED..."
sudo npm install -g --unsafe-perm node-red

# Update packages
echo "Updating packages..."
cd ~/.node-red
npm update

# Start
echo "Starting Node-RED..."
sudo systemctl start node-red

# Wait a bit
sleep 5

# Check status
echo "Checking status..."
sudo systemctl status node-red --no-pager

echo "=== Upgrade Complete ==="
echo "Check logs with: journalctl -u node-red -f"
```

---

## Summary

**Safest Upgrade Path:**
1. ✅ Backup everything
2. ✅ Upgrade Node-RED only (not Node.js)
3. ✅ Update packages conservatively
4. ✅ Test thoroughly
5. ✅ Have rollback plan ready

**When to Upgrade Node.js:**
- Only when needed for new Node-RED version
- Or when security patches required
- Always with full backup and testing plan

**Remember:**
- Backup before EVERY upgrade
- Test in development if possible
- Monitor logs after upgrade
- Keep rollback plan ready

Good luck! 🚀

