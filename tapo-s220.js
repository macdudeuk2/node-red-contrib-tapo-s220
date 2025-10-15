const { TapoHubConnect } = require('./tapo-hub-connect');

module.exports = function(RED) {
    function TapoS220Node(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration - sanitize credentials
        node.email = node.credentials.email ? node.credentials.email.trim().toLowerCase() : '';
        node.password = node.credentials.password ? node.credentials.password.trim() : '';
        node.hubIp = config.hubIp ? config.hubIp.trim() : '';  // H100 hub IP address
        node.deviceId = config.deviceId;  // S220 device ID
        node.deviceName = config.deviceName;
        
        // Validation - just check for presence, don't fail on startup
        // Connection will happen on first message
        if (!node.email || !node.password || !node.hubIp) {
            node.status({fill: "grey", shape: "ring", text: "not configured"});
        }
        
        // Hub connection
        node.hubConnection = null;
        node.isConnected = false;
        
        // Logger for hub connection
        const logger = {
            info: (msg) => node.log(msg),
            debug: (msg) => node.log(msg),
            error: (msg) => node.error(msg),
            warn: (msg) => node.warn(msg)
        };
        
        // Initialize connection to H100 hub (called on first message)
        async function initialize() {
            try {
                node.status({fill: "yellow", shape: "ring", text: "connecting to hub..."});
                
                if (!node.email || !node.password) {
                    throw new Error("Email and password required");
                }
                
                if (!node.hubIp) {
                    throw new Error("H100 Hub IP address is required");
                }
                
                // Create hub connection
                node.hubConnection = new TapoHubConnect(logger, node.email, node.password, node.hubIp);
                await node.hubConnection.connect();
                
                node.isConnected = true;
                node.status({fill: "green", shape: "dot", text: "connected to hub"});
                node.log(`Connected to H100 hub at ${node.hubIp}`);
                
            } catch (error) {
                node.error(`Failed to connect to hub: ${error.message}`);
                node.status({fill: "red", shape: "ring", text: "connection failed"});
                throw error; // Re-throw so caller knows it failed
            }
        }
        
        // Handle incoming messages
        node.on('input', async function(msg) {
            try {
                // If not connected, try to initialize
                if (!node.hubConnection || !node.isConnected) {
                    await initialize();
                }
                
                if (!node.hubConnection) {
                    msg.payload = { success: false, error: 'Not connected to H100 hub' };
                    node.send(msg);
                    return;
                }
                
                const command = msg.payload.command || msg.payload;
                const deviceId = msg.payload.deviceId || node.deviceId;
                
                node.status({fill: "blue", shape: "dot", text: "processing..."});
                
                switch(command.toLowerCase()) {
                    case 'discover':
                    case 'list':
                    case 'listdevices':
                        // Discover all child devices on hub
                        const allDevices = await node.hubConnection.getChildDevices(true);
                        const switches = allDevices.filter(d => 
                            d.model && (d.model.includes('S220') || d.model.includes('S210') || d.model.includes('S200'))
                        );
                        
                        msg.payload = {
                            success: true,
                            command: 'discover',
                            switches: switches,
                            allDevices: allDevices,
                            totalDevices: allDevices.length
                        };
                        node.log(`Discovered ${switches.length} switches out of ${allDevices.length} total devices`);
                        break;
                        
                    case 'on':
                    case 'turnon':
                    case 'turn_on':
                        if (!deviceId) {
                            msg.payload = { success: false, error: 'Device ID required. Use "discover" command first.' };
                            break;
                        }
                        await node.hubConnection.turnOn(deviceId);
                        msg.payload = { 
                            success: true, 
                            state: 'on', 
                            command: 'turnOn',
                            deviceId: deviceId 
                        };
                        node.log(`Device ${deviceId} turned ON`);
                        break;
                        
                    case 'off':
                    case 'turnoff':
                    case 'turn_off':
                        if (!deviceId) {
                            msg.payload = { success: false, error: 'Device ID required. Use "discover" command first.' };
                            break;
                        }
                        await node.hubConnection.turnOff(deviceId);
                        msg.payload = { 
                            success: true, 
                            state: 'off', 
                            command: 'turnOff',
                            deviceId: deviceId 
                        };
                        node.log(`Device ${deviceId} turned OFF`);
                        break;
                        
                    case 'toggle':
                        if (!deviceId) {
                            msg.payload = { success: false, error: 'Device ID required. Use "discover" command first.' };
                            break;
                        }
                        // Get current state
                        const devices = await node.hubConnection.getChildDevices();
                        const device = devices.find(d => d.device_id === deviceId);
                        
                        if (!device) {
                            msg.payload = { success: false, error: `Device ${deviceId} not found` };
                            break;
                        }
                        
                        // Toggle based on current state
                        if (device.device_on) {
                            await node.hubConnection.turnOff(deviceId);
                            msg.payload = { success: true, state: 'off', command: 'toggle', deviceId: deviceId };
                        } else {
                            await node.hubConnection.turnOn(deviceId);
                            msg.payload = { success: true, state: 'on', command: 'toggle', deviceId: deviceId };
                        }
                        node.log(`Device ${deviceId} toggled`);
                        break;
                        
                    case 'status':
                    case 'getinfo':
                    case 'get_info':
                        if (!deviceId) {
                            msg.payload = { success: false, error: 'Device ID required. Use "discover" command first.' };
                            break;
                        }
                        
                        const allDevicesForInfo = await node.hubConnection.getChildDevices();
                        const deviceInfo = allDevicesForInfo.find(d => d.device_id === deviceId);
                        
                        if (!deviceInfo) {
                            msg.payload = { success: false, error: `Device ${deviceId} not found` };
                            break;
                        }
                        
                        msg.payload = {
                            success: true,
                            command: 'getInfo',
                            deviceInfo: deviceInfo
                        };
                        node.log(`Retrieved info for device ${deviceId}`);
                        break;
                        
                    default:
                        msg.payload = {
                            success: false,
                            error: `Unknown command: ${command}`,
                            availableCommands: ['on', 'off', 'toggle', 'status', 'discover']
                        };
                        node.warn(`Unknown command received: ${command}`);
                }
                
                node.status({fill: "green", shape: "dot", text: "connected to hub"});
                node.send(msg);
                
            } catch (error) {
                node.error(`Error processing command: ${error.message}`, msg);
                msg.payload = {
                    success: false,
                    error: error.message
                };
                node.status({fill: "red", shape: "ring", text: "error"});
                node.send(msg);
            }
        });
        
        // Clean up on node close
        node.on('close', async function(done) {
            node.status({fill: "grey", shape: "ring", text: "disconnected"});
            node.hubConnection = null;
            node.isConnected = false;
            done();
        });
        
        // Set initial status (don't connect until first message)
        node.status({fill: "yellow", shape: "ring", text: "not connected"});
    }
    
    // Register credentials
    RED.nodes.registerType("tapo-s220", TapoS220Node, {
        credentials: {
            email: { type: "text" },
            password: { type: "password" }
        }
    });
}
