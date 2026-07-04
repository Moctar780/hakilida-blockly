/**
 * Bluetooth serial connector for Sparki robot.
 * Uses the Web Bluetooth API (navigator.bluetooth) with the Serial Port Profile.
 */
export class SparkiBluetooth {

	constructor() {
		this.device = null;
		this.server = null;
		this.service = null;
		this.txChar = null;   // Nordic UART TX characteristic (write)
		this.rxChar = null;   // Nordic UART RX characteristic (read)
		this.connected = false;
		this.onData = null;
		this._buffer = '';
	}

	/**
	 * Scan and connect to a Bluetooth device.
	 * Uses Nordic UART Service which is common on HC-05/HC-06 modules.
	 */
	async connect() {
		try {
			this.device = await navigator.bluetooth.requestDevice( {
				filters: [
					{ services: [ '6e400001-b5a3-f393-e0a9-e50e24dcca9e' ] }, // Nordic UART
				],
				optionalServices: [
					'6e400001-b5a3-f393-e0a9-e50e24dcca9e', // UART service
					'00001101-0000-1000-8000-00805f9b34fb', // SPP (some HC-05 use this)
				],
				acceptAllDevices: false,
			} );

			this.server = await this.device.gatt.connect();
			this.device.addEventListener( 'gattserverdisconnected', () => this._onDisconnected() );

			// Try Nordic UART service first
			let service = null;
			try {
				service = await this.server.getPrimaryService( '6e400001-b5a3-f393-e0a9-e50e24dcca9e' );
			} catch {
				// Fallback to SPP
				service = await this.server.getPrimaryService( '00001101-0000-1000-8000-00805f9b34fb' );
			}

			this.service = service;

			// TX characteristic (write)
			try {
				this.txChar = await service.getCharacteristic( '6e400002-b5a3-f393-e0a9-e50e24dcca9e' );
			} catch {
				// Try common SPP TX UUID
				this.txChar = await service.getCharacteristic( '00001102-0000-1000-8000-00805f9b34fb' );
			}

			// RX characteristic (read / notify)
			try {
				this.rxChar = await service.getCharacteristic( '6e400003-b5a3-f393-e0a9-e50e24dcca9e' );
			} catch {
				this.rxChar = await service.getCharacteristic( '00001103-0000-1000-8000-00805f9b34fb' );
			}

			if ( this.rxChar ) {
				await this.rxChar.startNotifications();
				this.rxChar.addEventListener( 'characteristicvaluechanged', ( e ) => {
					this._onData( e.target.value );
				} );
			}

			this.connected = true;
			return true;

		} catch ( error ) {
			console.error( 'Bluetooth connect error:', error );
			throw error;
		}
	}

	disconnect() {
		if ( this.device && this.device.gatt ) {
			this.device.gatt.disconnect();
		}
		this.connected = false;
	}

	_onDisconnected() {
		this.connected = false;
		this.server = null;
		this.service = null;
		this.txChar = null;
		this.rxChar = null;
	}

	_onData( dataView ) {
		const text = new TextDecoder().decode( dataView );
		this._buffer += text;
		if ( this.onData ) this.onData( text );
	}

	/**
	 * Send a command string to the Sparki.
	 * Commands are space-separated letters followed by newline.
	 * Example: "F R F L S\\n"
	 */
	async send( command ) {
		if ( ! this.txChar || ! this.connected ) {
			throw new Error( 'Bluetooth not connected' );
		}
		const encoder = new TextEncoder();
		const data = encoder.encode( command + '\n' );
		await this.txChar.writeValue( data );
	}

	/**
	 * Send a sequence of Sparki commands.
	 * @param {string[]} commands - Array of command letters (F, R, L, S)
	 */
	async sendSequence( commands ) {
		const cmd = commands.join( ' ' );
		console.log( '📤 Bluetooth:', cmd );
		await this.send( cmd );
	}
}
