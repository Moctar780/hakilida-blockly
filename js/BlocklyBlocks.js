// Blockly custom blocks for vehicle control
// — Uses distance (units) and angle (degrees) instead of raw time

Blockly.Blocks['vehicle_on_start'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('🏁 when program starts');
		this.appendStatementInput('COMMANDS')
			.setCheck(null);
		this.setColour(120);
		this.setTooltip('Program entry point — runs when you click Run');
		this.setDeletable(false);
	}
};

Blockly.Blocks['vehicle_move_forward'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('move forward');
		this.appendValueInput('DISTANCE')
			.setCheck('Number')
			.appendField('by');
		this.appendDummyInput()
			.appendField('units');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(230);
		this.setTooltip('Drive forward a certain distance (in game units)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_move_backward'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('move backward');
		this.appendValueInput('DISTANCE')
			.setCheck('Number')
			.appendField('by');
		this.appendDummyInput()
			.appendField('units');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(230);
		this.setTooltip('Drive backward a certain distance (in game units)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_turn_left'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('turn left');
		this.appendValueInput('ANGLE')
			.setCheck('Number')
			.appendField('by');
		this.appendDummyInput()
			.appendField('°');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(195);
		this.setTooltip('Turn left by an angle (in degrees)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_turn_right'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('turn right');
		this.appendValueInput('ANGLE')
			.setCheck('Number')
			.appendField('by');
		this.appendDummyInput()
			.appendField('°');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(195);
		this.setTooltip('Turn right by an angle (in degrees)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_wait'] = {
	init: function() {
		this.appendValueInput('DURATION')
			.setCheck('Number')
			.appendField('wait');
		this.appendDummyInput()
			.appendField('seconds');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(160);
		this.setTooltip('Wait without moving');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_set_throttle'] = {
	init: function() {
		this.appendValueInput('VALUE')
			.setCheck('Number')
			.appendField('set throttle to');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(290);
		this.setTooltip('Set throttle (-1 backward, 0 stop, 1 forward)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_set_steer'] = {
	init: function() {
		this.appendValueInput('VALUE')
			.setCheck('Number')
			.appendField('set steer to');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(290);
		this.setTooltip('Set steering (-1 left, 0 straight, 1 right)');
		this.setInputsInline(true);
	}
};

Blockly.Blocks['vehicle_repeat'] = {
	init: function() {
		this.appendValueInput('TIMES')
			.setCheck('Number')
			.appendField('repeat');
		this.appendStatementInput('COMMANDS')
			.appendField('times');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(120);
		this.setTooltip('Repeat the inner commands a number of times');
	}
};

Blockly.Blocks['vehicle_repeat_forever'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('repeat forever');
		this.appendStatementInput('COMMANDS');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(120);
		this.setTooltip('Repeat the inner commands forever');
	}
};

// ─── Code Generator — converts distance/angle → time ─────────────

window.registerBlockGenerators = function() {
	const JS = Blockly.JavaScript;
	const F = JS.forBlock;

	// Conversion constants (calibrated for the vehicle's physics):
	//   Forward  (throttle=0.1):  MAX_SPEED=1.5 u/s, effective ~0.12 u/s
	//   Backward (throttle=-0.07): reached speed ~0.1 u/s, effective ~0.08 u/s
	//   Turning  (throttle=0, steer=±1): rotation on the spot, angular vel ~0.8 rad/s ≈ 35°/s
	const SPEED_FWD = 0.12;
	const SPEED_BWD = 0.08;
	const TURN_RATE = 35; // degrees per second

	F['vehicle_on_start'] = function(block) {
		const commands = JS.statementToCode(block, 'COMMANDS');
		return `(function(commands) {\n${commands}})\n`;
	};

	F['vehicle_move_forward'] = function(block) {
		const d = JS.valueToCode(block, 'DISTANCE', JS.ORDER_ATOMIC) || '5';
		return `  commands.push({ throttle: 0.1, steer: 0, duration: ${d} / ${SPEED_FWD} });\n`;
	};

	F['vehicle_move_backward'] = function(block) {
		const d = JS.valueToCode(block, 'DISTANCE', JS.ORDER_ATOMIC) || '3';
		return `  commands.push({ throttle: -0.07, steer: 0, duration: ${d} / ${SPEED_BWD} });\n`;
	};

	F['vehicle_turn_left'] = function(block) {
		const a = JS.valueToCode(block, 'ANGLE', JS.ORDER_ATOMIC) || '90';
		return `  commands.push({ throttle: 0, steer: -1, duration: ${a} / ${TURN_RATE} });\n`;
	};

	F['vehicle_turn_right'] = function(block) {
		const a = JS.valueToCode(block, 'ANGLE', JS.ORDER_ATOMIC) || '90';
		return `  commands.push({ throttle: 0, steer: 1, duration: ${a} / ${TURN_RATE} });\n`;
	};

	F['vehicle_wait'] = function(block) {
		const duration = JS.valueToCode(block, 'DURATION', JS.ORDER_ATOMIC) || '0.5';
		return `  commands.push({ throttle: 0, steer: 0, duration: ${duration} });\n`;
	};

	F['vehicle_set_throttle'] = function(block) {
		const value = JS.valueToCode(block, 'VALUE', JS.ORDER_ATOMIC) || '0';
		return `  commands.push({ type: '_set', throttle: ${value}, steer: null, duration: 0 });\n`;
	};

	F['vehicle_set_steer'] = function(block) {
		const value = JS.valueToCode(block, 'VALUE', JS.ORDER_ATOMIC) || '0';
		return `  commands.push({ type: '_set', throttle: null, steer: ${value}, duration: 0 });\n`;
	};

	F['vehicle_repeat'] = function(block) {
		const times = JS.valueToCode(block, 'TIMES', JS.ORDER_ATOMIC) || '1';
		const body = JS.statementToCode(block, 'COMMANDS');
		return `  for (let __r = 0; __r < ${times}; __r++) {\n${body}  }\n`;
	};

	F['vehicle_repeat_forever'] = function(block) {
		const body = JS.statementToCode(block, 'COMMANDS');
		return `  commands.push({ type: '_forever_start' });\n${body}commands.push({ type: '_forever_loop' });\n`;
	};
};

// ─── Toolbox XML ──────────────────────────────────────────────────

window.TOOLBOX_XML = `
<xml xmlns="http://www.w3.org/1999/xhtml" id="toolbox">
	<category name="Movement" colour="230">
		<block type="vehicle_move_forward">
			<value name="DISTANCE">
				<shadow type="math_number">
					<field name="NUM">0.5</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_move_backward">
			<value name="DISTANCE">
				<shadow type="math_number">
					<field name="NUM">0.3</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_turn_left">
			<value name="ANGLE">
				<shadow type="math_number">
					<field name="NUM">90</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_turn_right">
			<value name="ANGLE">
				<shadow type="math_number">
					<field name="NUM">90</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_wait">
			<value name="DURATION">
				<shadow type="math_number">
					<field name="NUM">0.5</field>
				</shadow>
			</value>
		</block>
	</category>
	<category name="Values" colour="290">
		<block type="vehicle_set_throttle">
			<value name="VALUE">
				<shadow type="math_number">
					<field name="NUM">1</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_set_steer">
			<value name="VALUE">
				<shadow type="math_number">
					<field name="NUM">0</field>
				</shadow>
			</value>
		</block>
		<block type="math_number">
			<field name="NUM">1</field>
		</block>
	</category>
	<category name="Loops" colour="120">
		<block type="vehicle_repeat">
			<value name="TIMES">
				<shadow type="math_number">
					<field name="NUM">3</field>
				</shadow>
			</value>
		</block>
		<block type="vehicle_repeat_forever"/>
	</category>
</xml>
`;

// ─── Default workspace XML ────────────────────────────────────────

window.DEFAULT_BLOCKS_XML = `
<xml xmlns="http://www.w3.org/1999/xhtml">
	<block type="vehicle_on_start" x="20" y="20" deletable="false">
		<statement name="COMMANDS">
			<block type="vehicle_move_forward">
				<value name="DISTANCE">
					<shadow type="math_number">
						<field name="NUM">0.2</field>
					</shadow>
				</value>
				<next>
					<block type="vehicle_turn_left">
						<value name="ANGLE">
							<shadow type="math_number">
								<field name="NUM">90</field>
							</shadow>
						</value>
						<next>
							<block type="vehicle_move_forward">
								<value name="DISTANCE">
									<shadow type="math_number">
										<field name="NUM">0.2</field>
									</shadow>
								</value>
							</block>
						</next>
					</block>
				</next>
			</block>
		</statement>
	</block>
</xml>
`;
