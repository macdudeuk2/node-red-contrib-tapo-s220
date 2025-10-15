/**
 * Tapo Sensor Node (T310, T315 Temperature & Humidity)
 * Reads temperature and humidity from Tapo sensors via H100 hub
 * Uses tapo-hub config node for shared hub connection
 */

module.exports = function(RED) {
    function TapoSensorNode(config) {
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
                
                node.status({fill: "blue", shape: "dot", text: "reading..."});
                
                switch(command.toLowerCase()) {
                    case 'discover':
                    case 'list':
                    case 'listsensors':
                        // Discover all temperature/humidity sensors
                        const allDevices = await hubConnection.getChildDevices(true);
                        const sensors = allDevices.filter(d => 
                            (d.category && d.category.includes('temp-hmdt-sensor')) ||
                            (d.model && (d.model.includes('T310') || d.model.includes('T315')))
                        );
                        
                        msg.payload = {
                            success: true,
                            command: 'discover',
                            sensors: sensors,
                            allDevices: allDevices,
                            totalDevices: allDevices.length
                        };
                        node.log(`Discovered ${sensors.length} sensors out of ${allDevices.length} total devices`);
                        break;
                        
                    case 'read':
                    case 'status':
                    case 'getinfo':
                    case 'get_readings':
                        if (!deviceId) {
                            msg.payload = { success: false, error: 'Device ID required. Use "discover" command first.' };
                            break;
                        }
                        
                        // Get current sensor data
                        const devices = await hubConnection.getChildDevices();
                        const sensor = devices.find(d => d.device_id === deviceId);
                        
                        if (!sensor) {
                            msg.payload = { success: false, error: `Sensor ${deviceId} not found` };
                            break;
                        }
                        
                        // Extract sensor readings from raw data
                        const raw = sensor.raw || {};
                        const readings = {
                            temperature: raw.current_temp,
                            humidity: raw.current_humidity,
                            temp_unit: raw.temp_unit || 'celsius',
                            temp_exception: raw.current_temp_exception,
                            humidity_exception: raw.current_humidity_exception
                        };
                        
                        msg.payload = {
                            success: true,
                            command: 'read',
                            deviceId: deviceId,
                            readings: readings,
                            device: {
                                nickname: sensor.nickname,
                                model: sensor.model,
                                status: sensor.status,
                                battery_low: sensor.at_low_battery,
                                signal_level: sensor.signal_level,
                                rssi: sensor.rssi,
                                report_interval: raw.report_interval
                            },
                            timestamp: new Date().toISOString()
                        };
                        
                        // Update node status with current readings
                        const tempDisplay = readings.temperature !== undefined ? 
                            `${readings.temperature}°${readings.temp_unit === 'celsius' ? 'C' : 'F'}` : 'N/A';
                        const humidDisplay = readings.humidity !== undefined ? 
                            `${readings.humidity}%` : 'N/A';
                        
                        node.status({
                            fill: sensor.status === 'online' ? "green" : "red",
                            shape: "dot",
                            text: `${tempDisplay} / ${humidDisplay}`
                        });
                        
                        node.log(`Sensor ${deviceId}: ${tempDisplay}, ${humidDisplay}`);
                        break;
                        
                    default:
                        msg.payload = {
                            success: false,
                            error: `Unknown command: ${command}`,
                            availableCommands: ['read', 'status', 'discover']
                        };
                        node.warn(`Unknown command received: ${command}`);
                }
                
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
    RED.nodes.registerType("tapo-sensor", TapoSensorNode);
}

