import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { LightProbeGrid } from 'three/addons/lighting/LightProbeGrid.js';
import { LightProbeGridHelper } from 'three/addons/helpers/LightProbeGridHelper.js';
import { createWorldSettings, createWorld, addBroadphaseLayer, addObjectLayer, enableCollision, registerAll, updateWorld, rigidBody, box, MotionType } from 'crashcat';
import { Vehicle, MAX_SPEED } from './Vehicle.js';
import { Camera } from './Camera.js';
import { Controls } from './Controls.js';
import { buildTrack, decodeCells, computeSpawnPosition, computeTrackBounds } from './Track.js';
import { buildWallColliders, createSphereBody } from './Physics.js';
import { SmokeTrails } from './Particles.js';
import { DriftMarks } from './DriftMarks.js';
import { GameAudio } from './Audio.js';
import { LapTimer } from './LapTimer.js';
import { ColorMapGLTFLoader } from './Loader.js';
import { BlockProgram } from './BlockProgram.js';


const renderer = new THREE.WebGLRenderer( { antialias: true, outputBufferType: THREE.HalfFloatType } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ) );
bloomPass.strength = 0.02;
bloomPass.radius = 0.02;
bloomPass.threshold = 0.5;

renderer.setEffects( [ bloomPass ] );

document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xadb2ba );
scene.fog = new THREE.Fog( 0xadb2ba, 30, 55 );

const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
dirLight.position.set( 11.4, 15, -5.3 );
dirLight.castShadow = true;
dirLight.shadow.mapSize.setScalar( 4096 );
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 60;
dirLight.shadow.radius = 4;
scene.add( dirLight );

const hemiLight = new THREE.HemisphereLight( 0xc8d8e8, 0x7a8a5a, 2 );
hemiLight.position.copy( dirLight.position )
scene.add( hemiLight );


window.addEventListener( 'resize', () => {

	renderer.setSize( window.innerWidth, window.innerHeight );

} );

const loader = new ColorMapGLTFLoader();

const modelNames = [
	'vehicle-truck-yellow', 'vehicle-truck-green', 'vehicle-truck-purple', 'vehicle-truck-red',
	'track-straight', 'track-corner', 'track-bump', 'track-finish',
	'decoration-empty', 'decoration-forest', 'decoration-tents',
];

const models = {};

async function loadModels() {

	const promises = modelNames.map( ( name ) =>
		new Promise( ( resolve, reject ) => {

			loader.load( `models/${ name }.glb`, ( gltf ) => {

				const meshes = [];
				gltf.scene.traverse( ( child ) => {

					if ( child.isMesh ) {

						child.material.side = THREE.FrontSide;
						meshes.push( child );

					}

				} );

				// Godot imports vehicle models at root_scale=0.5
				if ( name.startsWith( 'vehicle-' ) ) {

					gltf.scene.scale.setScalar( 0.5 );

				}

				if ( meshes.length === 1 ) {

					const mesh = meshes[ 0 ];
					mesh.removeFromParent();
					models[ name ] = mesh;

				} else {

					models[ name ] = gltf.scene;

				}

				resolve();

			}, undefined, reject );

		} )
	);

	await Promise.all( promises );

}

async function init() {

	registerAll();
	await loadModels();

	const mapParam = new URLSearchParams( window.location.search ).get( 'map' );
	let customCells = null;
	let spawn = null;

	if ( mapParam ) {

		try {

			customCells = decodeCells( mapParam );
			spawn = computeSpawnPosition( customCells );

		} catch ( e ) {

			console.warn( 'Invalid map parameter, using default track' );

		}

	}

	// Compute track bounds and size physics/shadows to fit
	const bounds = computeTrackBounds( customCells );
	const hw = bounds.halfWidth;
	const hd = bounds.halfDepth;
	const groundSize = Math.max( hw, hd ) * 2 + 20;

	const shadowExtent = Math.max( hw, hd ) + 10;
	dirLight.shadow.camera.left = - shadowExtent;
	dirLight.shadow.camera.right = shadowExtent;
	dirLight.shadow.camera.top = shadowExtent;
	dirLight.shadow.camera.bottom = - shadowExtent;
	dirLight.shadow.camera.updateProjectionMatrix();

	scene.fog.near = groundSize * 0.4;
	scene.fog.far = groundSize * 0.8;

	buildTrack( scene, models, customCells );

	// Probes

	const probeHeight = 6;
	const probes = new LightProbeGrid(
		hw * 2, probeHeight, hd * 2,
		Math.max( 4, Math.round( hw / 4 ) ),
		2,
		Math.max( 4, Math.round( hd / 4 ) ),
	);
	probes.position.set( bounds.centerX, probeHeight / 2, bounds.centerZ );
	probes.bake( renderer, scene, { cubemapSize: 32, near: 0.1, far: groundSize } );
	scene.add( probes );

	// scene.add( new LightProbeGridHelper( probes, 0.5 ) );

	//

	const worldSettings = createWorldSettings();
	worldSettings.gravity = [ 0, - 9.81, 0 ];

	const BPL_MOVING = addBroadphaseLayer( worldSettings );
	const BPL_STATIC = addBroadphaseLayer( worldSettings );
	const OL_MOVING = addObjectLayer( worldSettings, BPL_MOVING );
	const OL_STATIC = addObjectLayer( worldSettings, BPL_STATIC );

	enableCollision( worldSettings, OL_MOVING, OL_STATIC );
	enableCollision( worldSettings, OL_MOVING, OL_MOVING );

	const world = createWorld( worldSettings );
	world._OL_MOVING = OL_MOVING;
	world._OL_STATIC = OL_STATIC;

	buildWallColliders( world, null, customCells );

	const roadHalf = groundSize / 2;
	rigidBody.create( world, {
		shape: box.create( { halfExtents: [ roadHalf, 0.01, roadHalf ] } ),
		motionType: MotionType.STATIC,
		objectLayer: OL_STATIC,
		position: [ bounds.centerX, - 0.125, bounds.centerZ ],
		friction: 5.0,
		restitution: 0.0,
	} );

	const sphereBody = createSphereBody( world, spawn ? spawn.position : null );

	const vehicle = new Vehicle();
	vehicle.rigidBody = sphereBody;
	vehicle.physicsWorld = world;

	if ( spawn ) {

		const [ sx, sy, sz ] = spawn.position;
		vehicle.spherePos.set( sx, sy, sz );
		vehicle.prevModelPos.set( sx, 0, sz );
		vehicle.container.rotation.y = spawn.angle;

	}

	const vehicleGroup = vehicle.init( models[ 'vehicle-truck-yellow' ] );
	scene.add( vehicleGroup );

	dirLight.target = vehicleGroup;

	const cam = new Camera();
	scene.add( cam.debug );

	const controls = new Controls();

	const particles = new SmokeTrails( scene );
	const driftMarks = new DriftMarks( scene, mapParam );

	const audio = new GameAudio();
	audio.init( cam.camera );

	const lapTimer = new LapTimer( customCells, mapParam );

	const _forward = new THREE.Vector3();
	const _camLead = new THREE.Vector3();

	const contactListener = {
		onContactAdded( bodyA, bodyB ) {

			if ( bodyA !== sphereBody && bodyB !== sphereBody ) return;

			_forward.set( 0, 0, 1 ).applyQuaternion( vehicle.container.quaternion );
			_forward.y = 0;
			_forward.normalize();

			const impactVelocity = Math.abs( vehicle.modelVelocity.dot( _forward ) );
			audio.playImpact( impactVelocity );

		}
	};

	// ─── Blockly integration ─────────────────────────────────────

	const blockProgram = new BlockProgram();

	// Register block code generators
	if ( typeof window.registerBlockGenerators === 'function' ) {
		window.registerBlockGenerators();
	}

	// Blockly workspace
	const workspace = Blockly.inject( 'blockly-area', {
		toolbox: window.TOOLBOX_XML,
		collapse: false,
		comments: false,
		disable: false,
		maxBlocks: Infinity,
		grid: { spacing: 20, length: 3, colour: '#333', snap: true },
		zoom: { controls: true, wheel: true, startScale: 0.9 },
		trashcan: true,
	});
	Blockly.Xml.domToWorkspace( Blockly.utils.xml.textToDom( window.DEFAULT_BLOCKS_XML ), workspace );

	// UI wiring
	const blockPanel = document.getElementById( 'block-panel' );
	const blockToggle = document.getElementById( 'block-toggle' );
	const btnRun = document.getElementById( 'btn-run' );
	const btnStop = document.getElementById( 'btn-stop' );
	const btnClear = document.getElementById( 'btn-clear' );
	const statusEl = document.getElementById( 'block-status' );

	blockToggle.addEventListener( 'click', ( e ) => {
		e.preventDefault();
		blockPanel.classList.toggle( 'open' );
		document.body.classList.toggle( 'block-panel-open', blockPanel.classList.contains( 'open' ) );
		blockToggle.textContent = blockPanel.classList.contains( 'open' ) ? '✕ Close' : '🧩 Blocks';
		// Resize Blockly when panel opens
		if ( blockPanel.classList.contains( 'open' ) ) Blockly.svgResize( workspace );
	} );

	function getGeneratedCode() {
		const code = Blockly.JavaScript.workspaceToCode( workspace );
		return code;
	}

	btnRun.addEventListener( 'click', () => {
		if ( blockProgram.running ) return;
		const code = getGeneratedCode();
		const ok = blockProgram.load( code );
		if ( ! ok ) {
			statusEl.textContent = '⚠️ Error generating program';
			return;
		}
		const started = blockProgram.start();
		if ( ! started ) {
			statusEl.textContent = '⚠️ No commands to run';
			return;
		}
		statusEl.textContent = '▶ Running…';
		btnRun.disabled = true;
		btnStop.classList.add( 'visible' );
	} );

	btnStop.addEventListener( 'click', () => {
		blockProgram.stop();
		statusEl.textContent = '■ Stopped';
		btnRun.disabled = false;
		btnStop.classList.remove( 'visible' );
	} );

	btnClear.addEventListener( 'click', () => {
		blockProgram.stop();
		workspace.clear();
		Blockly.Xml.domToWorkspace( Blockly.utils.xml.textToDom( window.DEFAULT_BLOCKS_XML ), workspace );
		statusEl.textContent = 'Reset';
		btnRun.disabled = false;
		btnStop.classList.remove( 'visible' );
	} );

	// ─── Reset environment ────────────────────────────────────────

	const resetBtn = document.getElementById( 'reset-env' );
	const defaultPos = spawn
		? new THREE.Vector3( spawn.position[ 0 ], spawn.position[ 1 ], spawn.position[ 2 ] )
		: new THREE.Vector3( 3.5, 0.5, 5 );
	const defaultAngle = spawn ? spawn.angle : 0;

	resetBtn.addEventListener( 'click', ( e ) => {
		e.preventDefault();

		blockProgram.stop();
		btnRun.disabled = false;
		btnStop.classList.remove( 'visible' );
		statusEl.textContent = 'Ready';

		vehicle.reset( defaultPos, defaultAngle );
		lapTimer.reset();

	} );

	// ─── Game loop ────────────────────────────────────────────────

	const timer = new THREE.Timer();

	function animate() {

		requestAnimationFrame( animate );

		// Hide loader on first frame
		const loader = document.getElementById( 'loader' );
		if ( loader ) loader.classList.add( 'hidden' );

		timer.update();
		const dt = Math.min( timer.getDelta(), 1 / 30 );

		const input = controls.update();

		// Block program overrides manual controls when active
		blockProgram.update( dt );
		if ( blockProgram.active ) {
			input.x = blockProgram.outputX;
			input.z = blockProgram.outputZ;
		}

		// Update status when program finishes
		if ( ! blockProgram.running && btnRun.disabled ) {
			statusEl.textContent = '✅ Finished';
			btnRun.disabled = false;
			btnStop.classList.remove( 'visible' );
		}

		updateWorld( world, contactListener, dt );

		vehicle.update( dt, input );

		dirLight.position.set(
			vehicle.spherePos.x + 11.4,
			15,
			vehicle.spherePos.z - 5.3
		);

		const mv = vehicle.modelVelocity;
		_camLead.set( 0, 0, 1 ).applyQuaternion( vehicle.container.quaternion ).multiplyScalar( Math.sqrt( mv.x * mv.x + mv.z * mv.z ) );
		cam.update( dt, vehicle.spherePos, _camLead );
		particles.update( dt, vehicle );
		driftMarks.update( dt, vehicle );
		audio.update( dt, vehicle.linearSpeed / MAX_SPEED, input.z, vehicle.driftIntensity );

		const hasInput = input.touchActive || Math.abs( input.x ) > 0.05 || Math.abs( input.z ) > 0.05;
		lapTimer.update( dt, vehicle.spherePos, hasInput );

		renderer.render( scene, cam.camera );

	}

	animate();

}

init();
