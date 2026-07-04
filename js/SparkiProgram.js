/**
 * SparkiProgram — Generates a command string from Blockly blocks and
 * sends it over Bluetooth to the Sparki robot.
 */
export class SparkiProgram {

	constructor( bluetooth ) {
		this.bluetooth = bluetooth;
		this.commands = [];
		this.running = false;
		this.active = false;
		this.foreverIndex = -1;
		this.index = 0;
		this._waitTimer = 0;
		this._waiting = false;
	}

	load( code ) {
		const cmds = [];
		try {
			const fn = eval( code );
			fn( cmds );
			this.commands = cmds;
			return true;
		} catch ( e ) {
			console.error( 'Sparki program error:', e );
			return false;
		}
	}

	start() {
		if ( this.commands.length === 0 ) return false;
		this.index = 0;
		this.foreverIndex = -1;
		this._waitTimer = 0;
		this._waiting = false;
		this.running = true;
		this.active = true;
		return true;
	}

	stop() {
		this.running = false;
		this.active = false;
		// Send stop command
		if ( this.bluetooth && this.bluetooth.connected ) {
			this.bluetooth.send( 'S' ).catch( () => {} );
		}
	}

	async update( dt ) {
		if ( ! this.running ) return;

		// Handle wait timer
		if ( this._waiting ) {
			this._waitTimer -= dt * 1000;
			if ( this._waitTimer <= 0 ) {
				this._waiting = false;
				this.index++;
			}
			return;
		}

		while ( this.index < this.commands.length ) {
			const cmd = this.commands[ this.index ];

			// Loop markers
			if ( cmd === '_loop_start' ) {
				this.foreverIndex = this.index + 1;
				this.index++;
				continue;
			}
			if ( cmd === '_loop_end' ) {
				if ( this.foreverIndex >= 0 ) {
					this.index = this.foreverIndex;
					continue;
				}
				this.index++;
				continue;
			}

			// Wait command: W:<milliseconds>
			if ( typeof cmd === 'string' && cmd.startsWith( 'W:' ) ) {
				const ms = parseInt( cmd.slice( 2 ), 10 );
				if ( ms > 0 && ! isNaN( ms ) ) {
					this._waitTimer = ms;
					this._waiting = true;
					return;
				}
				this.index++;
				continue;
			}

			// Regular command (F, R, L, S)
			if ( this.bluetooth && this.bluetooth.connected ) {
				try {
					await this.bluetooth.send( cmd );
				} catch ( e ) {
					console.error( 'Send failed:', e );
					this.stop();
					return;
				}
			}

			this.index++;
		}

		// End of commands — loop if forever
		if ( this.foreverIndex >= 0 ) {
			this.index = this.foreverIndex;
			return;
		}

		this.stop();
	}
}
