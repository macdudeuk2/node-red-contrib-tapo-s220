# Node-RED Complete Backup Guide

Comprehensive backup strategy for Node-RED installations on remote servers.

## What Needs to Be Backed Up

Your Node-RED installation consists of several critical components:

### 1. Flow Files
- `flows.json` - Your actual flows
- `flows_cred.json` - Encrypted credentials (passwords, API keys, etc.)

### 2. Configuration
- `settings.js` - Node-RED settings and configuration
- `.config.json` - Runtime configuration

### 3. Installed Packages
- `package.json` - List of installed nodes
- `node_modules/` - Actual installed packages (large!)

### 4. Context Data (if used)
- `context/` - Persistent context storage
- `.config.nodes.json` - Node configurations

### 5. Custom Files
- Custom nodes you've created
- Static files served by Node-RED
- Certificates/keys for HTTPS

## Backup Strategies

### **Strategy 1: Full ~/.node-red Backup (Recommended)**

Backs up everything except node_modules (which can be reinstalled).

#### Manual Backup

```bash
# On remote server
cd ~

# Create timestamped backup
BACKUP_NAME="nodered-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# Backup everything except node_modules
tar -czf "$BACKUP_NAME" \
    --exclude='node_modules' \
    --exclude='.npm' \
    --exclude='*.log' \
    .node-red/

# Download to local machine (from your local machine)
scp user@remote-server:~/$BACKUP_NAME ~/backups/

# Or keep on server
mkdir -p ~/backups
mv "$BACKUP_NAME" ~/backups/
```

#### Automated Backup Script

Create `/usr/local/bin/backup-nodered.sh`:

```bash
#!/bin/bash
# Node-RED Backup Script

# Configuration
BACKUP_DIR="/home/yourusername/backups/nodered"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="nodered-backup-${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup (exclude node_modules - can be reinstalled)
cd /home/yourusername
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" \
    --exclude='node_modules' \
    --exclude='.npm' \
    --exclude='*.log' \
    --exclude='.cache' \
    .node-red/

# Verify backup was created
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo "$(date): Backup created successfully: ${BACKUP_FILE}"
    
    # Delete old backups (older than RETENTION_DAYS)
    find "$BACKUP_DIR" -name "nodered-backup-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    echo "$(date): Old backups cleaned up (kept last ${RETENTION_DAYS} days)"
else
    echo "$(date): ERROR: Backup failed!" >&2
    exit 1
fi
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/backup-nodered.sh
```

#### Schedule with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-nodered.sh >> /var/log/nodered-backup.log 2>&1

# Or weekly on Sundays at 3 AM
0 3 * * 0 /usr/local/bin/backup-nodered.sh >> /var/log/nodered-backup.log 2>&1
```

---

### **Strategy 2: Git-Based Backup (Best Practice)**

Version control your flows with Git.

#### Initial Setup

```bash
# On remote server
cd ~/.node-red

# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Exclude large/temporary files
node_modules/
.npm/
*.log
.cache/

# Exclude OS files
.DS_Store
Thumbs.db

# Keep these files private (optional - encrypt if pushing to remote)
# flows_cred.json
# settings.js
EOF

# Add files
git add flows.json flows_cred.json package.json settings.js

# Initial commit
git commit -m "Initial Node-RED backup"

# Optional: Push to private remote repository
git remote add origin git@your-git-server:username/nodered-backup.git
git push -u origin main
```

#### Daily Auto-Commit

Create `/usr/local/bin/backup-nodered-git.sh`:

```bash
#!/bin/bash
# Git-based Node-RED backup

cd /home/yourusername/.node-red

# Check if there are changes
if [ -n "$(git status --porcelain)" ]; then
    # Add all tracked files
    git add -u
    
    # Commit with timestamp
    git commit -m "Auto-backup: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Optional: Push to remote
    # git push origin main
    
    echo "$(date): Changes committed to git"
else
    echo "$(date): No changes to backup"
fi
```

Add to cron:
```bash
# Backup every 6 hours
0 */6 * * * /usr/local/bin/backup-nodered-git.sh >> /var/log/nodered-git-backup.log 2>&1
```

---

### **Strategy 3: Cloud Sync Backup**

Sync to cloud storage (Dropbox, Google Drive, S3, etc.)

#### Using rclone (AWS S3, Google Drive, Dropbox, etc.)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone (interactive)
rclone config

# Create backup script
cat > /usr/local/bin/backup-nodered-cloud.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEMP_BACKUP="/tmp/nodered-backup-${TIMESTAMP}.tar.gz"

# Create backup
cd /home/yourusername
tar -czf "$TEMP_BACKUP" \
    --exclude='node_modules' \
    --exclude='.npm' \
    --exclude='*.log' \
    .node-red/

# Upload to cloud
rclone copy "$TEMP_BACKUP" mycloud:nodered-backups/

# Cleanup
rm "$TEMP_BACKUP"

echo "$(date): Backup uploaded to cloud"
EOF

chmod +x /usr/local/bin/backup-nodered-cloud.sh
```

---

## Restoration Procedures

### Restore from Tar Backup

```bash
# On remote server
cd ~

# Stop Node-RED
sudo systemctl stop node-red

# Backup current installation (just in case)
mv .node-red .node-red.old

# Extract backup
tar -xzf nodered-backup-YYYYMMDD-HHMMSS.tar.gz

# Reinstall node_modules
cd ~/.node-red
npm install

# Restart Node-RED
sudo systemctl start node-red

# Verify
journalctl -u node-red -f
```

### Restore from Git

```bash
# Stop Node-RED
sudo systemctl stop node-red

# Backup current
cd ~
mv .node-red .node-red.old

# Clone repository
git clone git@your-git-server:username/nodered-backup.git .node-red

# Reinstall packages
cd ~/.node-red
npm install

# Restart
sudo systemctl start node-red
```

---

## What to Include/Exclude

### ✅ Always Include
- `flows.json` - Your flows
- `flows_cred.json` - Credentials (encrypt if storing remotely!)
- `package.json` - Installed packages list
- `settings.js` - Configuration
- Custom nodes (if any)
- Static files (if any)

### ⚠️ Conditionally Include
- `node_modules/` - Large, but ensures exact versions
  - **Exclude if:** Using package.json (can reinstall)
  - **Include if:** Have custom/local packages
- Context data - If using persistent context
- Certificates - If using HTTPS

### ❌ Always Exclude
- `*.log` - Log files
- `.npm/` - NPM cache
- `.cache/` - Cache directory
- `node_modules/.cache/` - Build caches

---

## Recommended Multi-Tier Backup Strategy

### Tier 1: Local Daily Backups (Fast Recovery)
```bash
# Keep last 7 days locally
0 2 * * * /usr/local/bin/backup-nodered.sh
```

### Tier 2: Git Version Control (Change Tracking)
```bash
# Auto-commit every 6 hours
0 */6 * * * /usr/local/bin/backup-nodered-git.sh
```

### Tier 3: Weekly Cloud Backup (Disaster Recovery)
```bash
# Upload to cloud every Sunday
0 3 * * 0 /usr/local/bin/backup-nodered-cloud.sh
```

---

## Security Considerations

### Encrypting Backups

```bash
# Encrypt backup before storing/transferring
BACKUP_FILE="nodered-backup-$(date +%Y%m%d).tar.gz"
tar -czf - .node-red/ | \
    gpg --symmetric --cipher-algo AES256 -o "${BACKUP_FILE}.gpg"

# Decrypt when restoring
gpg --decrypt nodered-backup-YYYYMMDD.tar.gz.gpg | tar -xzf -
```

### Protecting Credentials

Your `flows_cred.json` contains encrypted credentials, but:
- Use encryption when storing backups remotely
- Store credentials file separately if needed
- Use a strong `credentialSecret` in settings.js
- Never commit unencrypted credentials to public repos

---

## Quick Reference Commands

### Create Manual Backup
```bash
cd ~
tar -czf nodered-backup-$(date +%Y%m%d).tar.gz \
    --exclude='node_modules' .node-red/
```

### List Backup Contents
```bash
tar -tzf nodered-backup-YYYYMMDD.tar.gz | less
```

### Extract Single File
```bash
tar -xzf nodered-backup-YYYYMMDD.tar.gz .node-red/flows.json
```

### Check Backup Size
```bash
ls -lh ~/backups/nodered-backup-*.tar.gz
```

### Download Backup to Local Machine
```bash
# From your local machine
scp user@remote-server:~/backups/nodered-backup-YYYYMMDD.tar.gz ~/local-backups/
```

---

## Testing Your Backups

**IMPORTANT:** Regularly test your backups!

### Test Restoration (Safe)

```bash
# Create test directory
mkdir -p ~/nodered-test

# Extract backup to test location
tar -xzf ~/backups/nodered-backup-latest.tar.gz -C ~/nodered-test

# Verify files
ls -la ~/nodered-test/.node-red/

# Cleanup
rm -rf ~/nodered-test
```

### Verify Backup Integrity

```bash
# Test tar file integrity
tar -tzf nodered-backup-YYYYMMDD.tar.gz > /dev/null && echo "Backup OK" || echo "Backup CORRUPTED"

# Check backup size (should be reasonable)
du -h nodered-backup-YYYYMMDD.tar.gz
```

---

## Disaster Recovery Checklist

If you need to rebuild from scratch:

- [ ] Fresh server/VM ready
- [ ] Node.js installed (correct version)
- [ ] Node-RED installed (`npm install -g node-red`)
- [ ] Download backup from storage
- [ ] Extract backup to `~/.node-red/`
- [ ] Run `npm install` in `~/.node-red/`
- [ ] Configure Node-RED service (systemd/pm2)
- [ ] Start Node-RED
- [ ] Verify flows load
- [ ] Test key flows
- [ ] Check all credentials work
- [ ] Monitor logs for errors

---

## Automation Script (All-in-One)

Create `/usr/local/bin/nodered-backup-complete.sh`:

```bash
#!/bin/bash
# Complete Node-RED Backup Script
# Combines local, git, and cloud backups

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/yourusername/backups/nodered"
NODERED_DIR="/home/yourusername/.node-red"

# Create local backup
echo "$(date): Creating local backup..."
mkdir -p "$BACKUP_DIR"
cd /home/yourusername
tar -czf "${BACKUP_DIR}/nodered-backup-${TIMESTAMP}.tar.gz" \
    --exclude='node_modules' \
    --exclude='.npm' \
    --exclude='*.log' \
    .node-red/

# Git commit (if git repo exists)
if [ -d "${NODERED_DIR}/.git" ]; then
    echo "$(date): Committing to git..."
    cd "$NODERED_DIR"
    git add -u 2>/dev/null || true
    git commit -m "Auto-backup: ${TIMESTAMP}" 2>/dev/null || echo "No changes"
fi

# Cleanup old local backups (keep 30 days)
find "$BACKUP_DIR" -name "nodered-backup-*.tar.gz" -mtime +30 -delete

echo "$(date): Backup complete!"
```

---

## For Your Tapo Nodes Specifically

Since you're using the Tapo nodes, make sure to backup:

- ✅ Hub configuration (email/password stored in credentials)
- ✅ Device IDs configured in nodes
- ✅ Flow logic using the Tapo nodes
- ✅ `package.json` to reinstall `node-red-contrib-tapo-s220`

The credentials are encrypted in `flows_cred.json`, so you MUST backup both:
- `flows.json`
- `flows_cred.json`

Without both files, you'll lose your Tapo credentials and device configurations!

---

## Summary

**Recommended Setup:**
1. **Daily local backups** - Fast recovery, 30 day retention
2. **Git version control** - Track changes, easy rollback
3. **Weekly cloud backup** - Disaster recovery

**Critical Files:**
- `flows.json` + `flows_cred.json` (MUST have both!)
- `package.json` (to reinstall packages)
- `settings.js` (if customized)

**Don't Forget:**
- Test your backups regularly
- Automate with cron
- Encrypt if storing remotely
- Keep backups off-server for true disaster recovery

Need help setting up any of these strategies? Let me know! 🚀

