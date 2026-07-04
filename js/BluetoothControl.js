/**
 * BluetoothControl — Gère la connexion et communication Bluetooth
 * 
 * Supports les commandes :
 *   'F' — Forward (accélération)
 *   'L' — Left (virage à gauche)
 *   'R' — Right (virage à droite)
 *   'S' — Stop (arrêt)
 */

export class BluetoothControl {

	constructor() {

		this.device = null;
		this.server = null;
		this.service = null;
		this.characteristic = null;

		this.connected = false;
		this.isConnecting = false;

		// Input output values
		this.outputX = 0; // Steer: -1 to 1
		this.outputZ = 0; // Throttle: -1 to 1

		// Command mapping
		this.commandMap = {
			'F': { x: 0, z: 1 },      // Forward
			'L': { x: -1, z: 0 },     // Left
			'R': { x: 1, z: 0 },      // Right
			'S': { x: 0, z: 0 },      // Stop
		};

	}

	/**
	 * Initiate Bluetooth device discovery and connection
	 */
	async connect() {

		if ( this.isConnecting ) return;
		this.isConnecting = true;

		try {

			// Request device with a generic service UUID
			this.device = await navigator.bluetooth.requestDevice( {
				acceptAllDevices: true,
				optionalServices: [ 'generic_access', 'generic_attribute', '0000180a-0000-1000-8000-00805f9b34fb' ]
			} );

			if ( ! this.device ) {
				console.warn( 'No device selected' );
				this.isConnecting = false;
				return;
			}

			// Handle device disconnection
			this.device.addEventListener( 'gattserverdisconnected', () => this.onDisconnect() );

			// Connect to GATT server
			this.server = await this.device.gatt.connect();
			console.log( 'GATT Server connected:', this.device.name );

			// Try to get a service for communication
			// First try standard HID service, then fall back to any service
			try {
				this.service = await this.server.getPrimaryService( 'human_interface_device' );
			} catch ( e ) {
				// Try alternative UUIDs or generic service
				try {
					this.service = await this.server.getPrimaryService( 0x180A ); // Device Information Service
				} catch ( e2 ) {
					// Get any available service
					const services = await this.server.getPrimaryServices();
					if ( services.length > 0 ) {
						this.service = services[ 0 ];
					}
				}
			}

			if ( this.service ) {

				try {

					// Try to get a characteristic for notifications
					const characteristics = await this.service.getCharacteristics();

					// Look for a notify characteristic
					for ( const char of characteristics ) {

						if ( char.properties.notify || char.properties.read ) {

							this.characteristic = char;

							if ( char.properties.notify ) {

								await char.startNotifications();
								char.addEventListener( 'characteristicvaluechanged', ( e ) => this.handleCharacteristicChange( e ) );
								console.log( 'Started notifications on characteristic:', char.uuid );

							}

							break;

						}

					}

				} catch ( e ) {

					console.warn( 'Could not setup characteristics:', e );

				}

			}

			this.connected = true;
			this.isConnecting = false;
			console.log( 'Bluetooth device connected successfully' );

			return true;

		} catch ( error ) {

			console.error( 'Bluetooth connection error:', error );
			this.isConnecting = false;
			this.connected = false;

			return false;

		}

	}

	/**
	 * Send command to device (if write characteristic available)
	 */
	async sendCommand( command ) {

		if ( ! this.connected || ! this.characteristic ) return;

		try {

			if ( this.characteristic.properties.write ) {

				const data = new Uint8Array( [ command.charCodeAt( 0 ) ] );
				await this.characteristic.writeValue( data );

			}

		} catch ( e ) {

			console.warn( 'Could not send command:', e );

		}

	}

	/**
	 * Handle incoming Bluetooth data
	 */
	handleCharacteristicChange( event ) {

		const value = new Uint8Array( event.target.value.buffer );

		// Process each byte as a command
		for ( let i = 0; i < value.length; i ++ ) {

			const char = String.fromCharCode( value[ i ] );
			this.processCommand( char );

		}

	}

	/**
	 * Process a single command character
	 */
	processCommand( command ) {

		const cmd = command.toUpperCase();

		if ( this.commandMap[ cmd ] ) {

			const { x, z } = this.commandMap[ cmd ];
			this.outputX = x;
			this.outputZ = z;

			console.log( `Bluetooth command: ${cmd} (x: ${x}, z: ${z})` );

		}

	}

	/**
	 * Disconnect from device
	 */
	disconnect() {

		if ( this.device && this.device.gatt.connected ) {

			this.device.gatt.disconnect();

		}

		this.onDisconnect();

	}

	/**
	 * Handle disconnection
	 */
	onDisconnect() {

		this.connected = false;
		this.device = null;
		this.server = null;
		this.service = null;
		this.characteristic = null;

		// Reset output
		this.outputX = 0;
		this.outputZ = 0;

		console.log( 'Bluetooth device disconnected' );

	}

	/**
	 * Check if Bluetooth is supported by the browser
	 */
	static isSupported() {

		return !! navigator.bluetooth;

	}

}
