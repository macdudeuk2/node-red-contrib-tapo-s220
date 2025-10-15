/**
 * Tapo Hub Connection Handler
 * Based on homebridge-kasa-hub implementation
 * Connects to H100 hub and controls child devices like S220 switches
 */

const { TapoConnect } = require('homebridge-kasa-hub/dist/TapoConnect');

class TapoHubConnect {
    constructor(log, email, password, hubIp) {
        this.log = log;
        this.email = email;
        this.password = password;
        this.hubIp = hubIp;
        this.tapoConnect = null;
        this.childDevicesCache = null;
        this.lastUpdate = null;
        this.CACHE_SECONDS = 5;
    }

    /**
     * Connect to the H100 hub
     */
    async connect() {
        try {
            this.tapoConnect = new TapoConnect(this.log, this.email, this.password, this.hubIp);
            await this.tapoConnect.login();
            this.log.info('Successfully connected to H100 hub at ' + this.hubIp);
            return true;
        } catch (error) {
            this.log.error('Failed to connect to H100 hub: ' + error.message);
            throw error;
        }
    }

    /**
     * Get list of all child devices connected to the hub
     */
    async getChildDevices(forceRefresh = false) {
        const now = Date.now();
        
        // Return cache if valid
        if (!forceRefresh && this.childDevicesCache && this.lastUpdate) {
            if ((now - this.lastUpdate) / 1000 < this.CACHE_SECONDS) {
                return this.childDevicesCache;
            }
        }

        if (!this.tapoConnect) {
            await this.connect();
        }

        const allDevices = [];
        let startIndex = 0;
        let totalDevices = null;

        try {
            do {
                const result = await this.tapoConnect.get_child_device_list(startIndex);
                
                if (totalDevices === null && result.sum) {
                    totalDevices = result.sum;
                    this.log.debug(`Total child devices: ${totalDevices}`);
                }

                if (result.child_device_list) {
                    for (const device of result.child_device_list) {
                        // Parse device info
                        const parsedDevice = {
                            device_id: device.device_id,
                            category: device.category,
                            type: device.type,
                            model: device.model,
                            hw_ver: device.hw_ver,
                            fw_ver: device.fw_ver,
                            nickname: device.nickname ? Buffer.from(device.nickname, 'base64').toString() : 'Unknown',
                            status: device.status,
                            // Device state info
                            device_on: device.device_on,
                            at_low_battery: device.at_low_battery,
                            rssi: device.rssi,
                            signal_level: device.signal_level,
                            // Raw device data
                            raw: device
                        };
                        
                        allDevices.push(parsedDevice);
                        this.log.debug(`Found device: ${parsedDevice.nickname} (${parsedDevice.model}) - ${parsedDevice.category}`);
                    }
                }

                startIndex += 10; // Hub returns 10 devices at a time
            } while (startIndex < (totalDevices || 0));

            this.childDevicesCache = allDevices;
            this.lastUpdate = now;
            return allDevices;

        } catch (error) {
            this.log.error('Failed to get child devices: ' + error.message);
            throw error;
        }
    }

    /**
     * Control a child device (e.g., turn on/off a switch)
     */
    async controlChildDevice(deviceId, method, params = {}) {
        if (!this.tapoConnect) {
            await this.connect();
        }

        try {
            const request = {
                method: 'control_child',
                params: {
                    device_id: deviceId,
                    requestData: {
                        method: 'multipleRequest',
                        params: {
                            requests: [
                                {
                                    method: method,
                                    params: params
                                }
                            ]
                        }
                    }
                }
            };

            const result = await this.tapoConnect.send(request);
            return result;
        } catch (error) {
            this.log.error(`Failed to control device ${deviceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Turn on a switch device
     */
    async turnOn(deviceId) {
        return await this.controlChildDevice(deviceId, 'set_device_info', {
            device_on: true
        });
    }

    /**
     * Turn off a switch device
     */
    async turnOff(deviceId) {
        return await this.controlChildDevice(deviceId, 'set_device_info', {
            device_on: false
        });
    }

    /**
     * Get device info
     */
    async getDeviceInfo(deviceId) {
        return await this.controlChildDevice(deviceId, 'get_device_info', {});
    }

    /**
     * Find devices by model (e.g., "S220", "S210")
     */
    async findDevicesByModel(model) {
        const devices = await this.getChildDevices();
        return devices.filter(d => d.model && d.model.toUpperCase().includes(model.toUpperCase()));
    }

    /**
     * Find devices by category
     */
    async findDevicesByCategory(category) {
        const devices = await this.getChildDevices();
        return devices.filter(d => d.category && d.category.includes(category));
    }

    /**
     * Find switch devices (S220, S210, etc.)
     */
    async findSwitches() {
        const devices = await this.getChildDevices();
        // Look for devices that are switches
        // Common categories might be: subg.trigger.switch, subg.plug.switch, etc.
        return devices.filter(d => 
            (d.model && (d.model.includes('S220') || d.model.includes('S210') || d.model.includes('S200'))) ||
            (d.category && d.category.includes('switch'))
        );
    }
}

module.exports = { TapoHubConnect };

