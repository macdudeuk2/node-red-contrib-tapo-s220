/**
 * Tapo Switch Node (S220, S210, S200)
 * Controls Tapo smart switches via H100 hub
 * Uses tapo-hub config node for shared hub connection
 */

module.exports = function(RED) {
    function TapoSwitchNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Get hub configuration
        node.hubConfig = RED.nodes.getNode(config.hub);
        node.deviceId = config.deviceId;
        node.deviceName = config.deviceName || config.name;
        
        // Validation
        if (!node.hubConfig) {
            node.status({fill: "red", shape: "ring", text: "no hub config"});
            node.error("No hub configuration selected. Please configure a tapo-hub first.");
            return;
        }
        
        if (!node.deviceId) {
            node.status({fill: "grey", shape: "ring", text: "no device ID"});
        } else {
            node.status({fill: "yellow", shape: "ring", text: "ready"});
        }
        
        // Handle incoming messages
        node.on('input', async function(msg) {
            try {
                // Get hub connection
                const hubConnection = await node.hubConfig.getConnection();
                
                if (!hubConnection) {
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
                        const allDevices = await hubConnection.getChildDevices(true);
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
                        await hubConnection.turnOn(deviceId);
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
                        await hubConnection.turnOff(deviceId);
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
                        const devices = await hubConnection.getChildDevices();
                        const device = devices.find(d => d.device_id === deviceId);
                        
                        if (!device) {
                            msg.payload = { success: false, error: `Device ${deviceId} not found` };
                            break;
                        }
                        
                        // Toggle based on current state
                        if (device.device_on) {
                            await hubConnection.turnOff(deviceId);
                            msg.payload = { success: true, state: 'off', command: 'toggle', deviceId: deviceId };
                        } else {
                            await hubConnection.turnOn(deviceId);
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
                        
                        const allDevicesForInfo = await hubConnection.getChildDevices();
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
                
                node.status({fill: "green", shape: "dot", text: deviceId ? "connected" : "ready"});
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
        node.on('close', function(done) {
            node.status({fill: "grey", shape: "ring", text: "disconnected"});
            done();
        });
    }
    
    // Register node (no credentials - they're in the config node)
    RED.nodes.registerType("tapo-switch", TapoSwitchNode);
}

