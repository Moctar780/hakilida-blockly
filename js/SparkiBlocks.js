// Blockly custom blocks for Sparki robot (Bluetooth)
// These generate a command string sent via Web Bluetooth.

Blockly.Blocks['sparki_start'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('🚀 Sparki program');
		this.appendStatementInput('COMMANDS')
			.setCheck(null);
		this.setColour(0);
		this.setTooltip('Program entry point for Sparki robot');
		this.setDeletable(false);
	}
};

Blockly.Blocks['sparki_move_forward'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('move forward');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(230);
		this.setTooltip('Move forward for ~1 second');
	}
};

Blockly.Blocks['sparki_turn_left'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('turn left');
		this.appendDummyInput()
			.appendField('90°');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(195);
		this.setTooltip('Turn left 90 degrees');
	}
};

Blockly.Blocks['sparki_turn_right'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('turn right');
		this.appendDummyInput()
			.appendField('90°');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(195);
		this.setTooltip('Turn right 90 degrees');
	}
};

Blockly.Blocks['sparki_stop'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('stop');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(160);
		this.setTooltip('Stop the robot');
	}
};

Blockly.Blocks['sparki_wait'] = {
	init: function() {
		this.appendValueInput('SECONDS')
			.setCheck('Number')
			.appendField('wait');
		this.appendDummyInput()
			.appendField('seconds');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(160);
		this.setInputsInline(true);
		this.setTooltip('Wait without moving');
	}
};

Blockly.Blocks['sparki_repeat'] = {
	init: function() {
		this.appendValueInput('TIMES')
			.setCheck('Number')
			.appendField('repeat');
		this.appendStatementInput('COMMANDS')
			.appendField('times');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(120);
		this.setTooltip('Repeat commands N times');
	}
};

Blockly.Blocks['sparki_repeat_forever'] = {
	init: function() {
		this.appendDummyInput()
			.appendField('repeat forever');
		this.appendStatementInput('COMMANDS');
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(120);
		this.setTooltip('Repeat commands forever');
	}
};

// ─── Code Generator — generates Sparki command sequences ───────

window.registerSparkiGenerators = function() {
	const JS = Blockly.JavaScript;
	const F = JS.forBlock;

	F['sparki_start'] = function(block) {
		const body = JS.statementToCode(block, 'COMMANDS');
		return `(function(cmds) {\n${body}})\n`;
	};

	F['sparki_move_forward'] = function(block) {
		return `  cmds.push('F');\n`;
	};

	F['sparki_turn_left'] = function(block) {
		return `  cmds.push('L');\n`;
	};

	F['sparki_turn_right'] = function(block) {
		return `  cmds.push('R');\n`;
	};

	F['sparki_stop'] = function(block) {
		return `  cmds.push('S');\n`;
	};

	F['sparki_wait'] = function(block) {
		const s = JS.valueToCode(block, 'SECONDS', JS.ORDER_ATOMIC) || '1';
		return `  cmds.push('W:' + (${s} * 1000));\n`;
	};

	F['sparki_repeat'] = function(block) {
		const times = JS.valueToCode(block, 'TIMES', JS.ORDER_ATOMIC) || '1';
		const body = JS.statementToCode(block, 'COMMANDS');
		return `  for (let __i = 0; __i < ${times}; __i++) {\n${body}  }\n`;
	};

	F['sparki_repeat_forever'] = function(block) {
		const body = JS.statementToCode(block, 'COMMANDS');
		return `  cmds.push('_loop_start');\n${body}cmds.push('_loop_end');\n`;
	};
};

// ─── Toolbox XML ──────────────────────────────────────────────────

window.SPARKI_TOOLBOX_XML = `
<xml xmlns="http://www.w3.org/1999/xhtml" id="toolbox">
	<category name="Movement" colour="230">
		<block type="sparki_move_forward"/>
		<block type="sparki_turn_left"/>
		<block type="sparki_turn_right"/>
		<block type="sparki_stop"/>
		<block type="sparki_wait">
			<value name="SECONDS">
				<shadow type="math_number">
					<field name="NUM">1</field>
				</shadow>
			</value>
		</block>
	</category>
	<category name="Loops" colour="120">
		<block type="sparki_repeat">
			<value name="TIMES">
				<shadow type="math_number">
					<field name="NUM">3</field>
				</shadow>
			</value>
		</block>
		<block type="sparki_repeat_forever"/>
	</category>
	<category name="Values" colour="290">
		<block type="math_number">
			<field name="NUM">1</field>
		</block>
	</category>
</xml>
`;

window.DEFAULT_SPARKI_XML = `
<xml xmlns="http://www.w3.org/1999/xhtml">
	<block type="sparki_start" x="20" y="20" deletable="false">
		<statement name="COMMANDS">
			<block type="sparki_move_forward">
				<next>
					<block type="sparki_turn_left">
						<next>
							<block type="sparki_move_forward">
								<next>
									<block type="sparki_stop"/>
								</next>
							</block>
						</next>
					</block>
				</next>
			</block>
		</statement>
	</block>
</xml>
`;
