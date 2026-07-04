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

	/**
	 * Tick the runner. Sends at most ONE command per frame to avoid
	 * overlapping Bluetooth writes (race condition if multiple frames
	 * process before a write completes).
	 */
	update( dt ) {
		if ( ! this.running ) return;

		// If we're waiting for a delay, just count down
		if ( this._waiting ) {
			this._waitTimer -= dt * 1000;
			if ( this._waitTimer <= 0 ) {
				this._waiting = false;
				this.index++;
			}
			return;
		}

		// Send only ONE command per frame to avoid overlapping writes
		if ( this.index < this.commands.length ) {
			const cmd = this.commands[ this.index ];

			// Loop markers (instant, no bluetooth write)
			if ( cmd === '_loop_start' ) {
				this.foreverIndex = this.index + 1;
				this.index++;
				return;
			}
			if ( cmd === '_loop_end' ) {
				if ( this.foreverIndex >= 0 ) {
					this.index = this.foreverIndex;
					return;
				}
				this.index++;
				return;
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
				return;
			}

			// Send ONE command via Bluetooth (fire-and-forget, no await)
			if ( this.bluetooth && this.bluetooth.connected ) {
				this.bluetooth.send( cmd ).catch( ( e ) => {
					console.error( 'Send failed:', e );
					this.stop();
				} );
			}

			this.index++;
			return; // one command per frame
		}

		// End of commands — loop if forever
		if ( this.foreverIndex >= 0 ) {
			this.index = this.foreverIndex;
			return;
		}

		this.stop();
	}
}
