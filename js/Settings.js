/**
 * Settings panel — speed, language, and other preferences.
 * Persisted to localStorage.
 */

const STORAGE_KEY = 'racing.settings';

const DEFAULTS = {
	speed: 1.0,     // 0.5 – 3.0 multiplier for block-program speeds
	lang: 'fr',     // 'fr' | 'en'
	musicVol: 0.5,  // 0 – 1
	sfxVol: 1.0,    // 0 – 1
};

let _settings = { ...DEFAULTS };
let _listeners = [];

function save() {
	try { localStorage.setItem( STORAGE_KEY, JSON.stringify( _settings ) ); } catch {}
}

function load() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		if ( raw ) Object.assign( _settings, JSON.parse( raw ) );
	} catch {}
}

load();

export function getSettings() {
	return { ..._settings };
}

export function getSetting( key ) {
	return _settings[ key ] !== undefined ? _settings[ key ] : DEFAULTS[ key ];
}

export function setSetting( key, value ) {
	if ( _settings[ key ] === value ) return;
	_settings[ key ] = value;
	save();
	_listeners.forEach( fn => fn( key, value ) );
}

export function onChange( fn ) {
	_listeners.push( fn );
}

export function resetSettings() {
	Object.assign( _settings, DEFAULTS );
	save();
	_listeners.forEach( fn => fn( '__reset__', null ) );
}

// ─── Speed multiplier exposed as a window global for BlocklyBlocks.js ───────

export function getSpeedMultiplier() {
	return _settings.speed;
}

// Update the window global so BlocklyBlocks can read it
window.__SPEED_MULT = _settings.speed;
onChange( ( key, val ) => {
	if ( key === 'speed' ) window.__SPEED_MULT = val;
} );

// ─── Language strings ───────────────────────────────────────────────────────

const STRINGS = {
	fr: {
		title: 'Paramètres',
		speed: 'Vitesse du robot',
		speedDesc: 'Multiplicateur de vitesse',
		lang: 'Langue',
		musicVol: 'Volume musique',
		sfxVol: 'Volume effets',
		reset: 'Réinitialiser',
		close: 'Fermer',
		slow: 'Lent',
		fast: 'Rapide',
	},
	en: {
		title: 'Settings',
		speed: 'Robot speed',
		speedDesc: 'Speed multiplier',
		lang: 'Language',
		musicVol: 'Music volume',
		sfxVol: 'SFX volume',
		reset: 'Reset',
		close: 'Close',
		slow: 'Slow',
		fast: 'Fast',
	},
};

export function t( key ) {
	const lang = _settings.lang || 'fr';
	return ( STRINGS[ lang ] && STRINGS[ lang ][ key ] ) || STRINGS.fr[ key ] || key;
}
