/* quadra.calc v3.0 - Mobile-First JavaScript */

/* =========================
   DOM Elements
========================= */
const bpmInput = document.getElementById('bpm-input');
const bpmDecreaseBtn = document.getElementById('bpm-decrease');
const bpmIncreaseBtn = document.getElementById('bpm-increase');
const bpmHalfBtn = document.getElementById('bpm-half');
const bpmDoubleBtn = document.getElementById('bpm-double');
const metronomeToggle = document.getElementById('metronome-toggle');
const themeToggle = document.getElementById('theme-toggle');
const midiSyncBtn = document.getElementById('midi-sync-btn');
const midiStatus = document.getElementById('midi-status');

// Tap Tempo (Main View)
const tapBtn = document.getElementById('tap-btn');
const tapBpmDisplay = document.getElementById('tap-bpm');
const tapCountDisplay = document.getElementById('tap-count');
const tapResetBtn = document.getElementById('tap-reset');
const tapBpmInput = document.getElementById('tap-bpm-input');
const tapBpmDown = document.getElementById('tap-bpm-down');
const tapBpmUp = document.getElementById('tap-bpm-up');
const metronomeTapToggle = document.getElementById('metronome-toggle-tap');
const themeTapToggle = document.getElementById('theme-toggle-tap');

// Tap Quick Results
const tapQrQuarter = document.getElementById('tap-qr-quarter');
const tapQrEighth = document.getElementById('tap-qr-eighth');
const tapQrSixteenth = document.getElementById('tap-qr-sixteenth');
const tapQrTriplet = document.getElementById('tap-qr-triplet');
const tapQrDotted = document.getElementById('tap-qr-dotted');
const tapQrWhole = document.getElementById('tap-qr-whole');
const tapResultsContainer = document.querySelector('.tap-results');

// Results
const delayGrid = document.getElementById('delay-grid');
const resultsBpmDisplay = document.getElementById('results-bpm');
const displayModeSelect = document.getElementById('display-mode');
const copyAllBtn = document.getElementById('copy-all-btn');
const categoryFilters = document.getElementById('category-filters');

// Quick Results
const qrQuarter = document.getElementById('qr-quarter');
const qrEighth = document.getElementById('qr-eighth');
const qrSixteenth = document.getElementById('qr-sixteenth');
const qrTriplet = document.getElementById('qr-triplet');

// Settings
const sampleRateOptions = document.getElementById('sample-rate-options');
const displayModeOptions = document.getElementById('display-mode-options');
const hapticToggle = document.getElementById('haptic-toggle');
const subdivisionNameInput = document.getElementById('subdivision-name');
const subdivisionFactorInput = document.getElementById('subdivision-factor');
const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
const customSubdivisionsList = document.getElementById('custom-subdivisions-list');
const presetNameInput = document.getElementById('preset-name');
const savePresetBtn = document.getElementById('save-preset-btn');
const presetsList = document.getElementById('presets-list');
const shareBtn = document.getElementById('share-btn');
const exportBtn = document.getElementById('export-btn');

// Navigation & UI
const bottomNav = document.getElementById('bottom-nav');
const notification = document.getElementById('notification');
const delayPopup = document.getElementById('delay-popup');
const popupContent = document.getElementById('popup-content');
const historyList = document.getElementById('history-list');
const beatDots = ['beat-1', 'beat-2', 'beat-3', 'beat-4'].map(id => document.getElementById(id));

/* =========================
   Application State
========================= */
const appState = {
    currentBpm: 120,
    currentView: 'tap',  // Tap is now the main/default view
    sampleRate: 44100,
    displayMode: 'ms',
    hapticEnabled: true,
    history: [],
    metronomeActive: false,
    activeCategory: 'all',
    beatIndex: 0
};

// Load saved state
try {
    const saved = localStorage.getItem('quadra_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(appState, parsed);
    }
    appState.history = JSON.parse(localStorage.getItem('bpm_history') || '[]').slice(0, 20);
} catch (e) {
    console.warn('Failed to load state:', e);
}

/* =========================
   Utility Functions
========================= */
function saveState() {
    try {
        localStorage.setItem('quadra_state', JSON.stringify({
            sampleRate: appState.sampleRate,
            displayMode: appState.displayMode,
            hapticEnabled: appState.hapticEnabled
        }));
    } catch (e) {}
}

function haptic(type = 'light') {
    if (!appState.hapticEnabled || !navigator.vibrate) return;
    const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 20],
        error: [50, 30, 50]
    };
    navigator.vibrate(patterns[type] || patterns.light);
}

function showNotification(message, type = 'success') {
    if (!notification) return;
    notification.textContent = message;
    notification.className = `toast show ${type}`;
    setTimeout(() => notification.classList.remove('show'), 2500);
}

function copyToClipboard(text, callback) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(callback).catch(() => {
            fallbackCopy(text, callback);
        });
    } else {
        fallbackCopy(text, callback);
    }
}

function fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (callback) callback();
}

/* =========================
   Navigation
========================= */
function switchView(viewName) {
    appState.currentView = viewName;

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.dataset.view === viewName);
    });

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Refresh results when switching to results view
    if (viewName === 'results') {
        updateResultsBpm();
        populateDelayCards();
    }

    haptic('light');
}

if (bottomNav) {
    bottomNav.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            switchView(navItem.dataset.view);
        }
    });
}

/* =========================
   BPM Management
========================= */
function updateBpm(bpm, addToHistory = true) {
    bpm = Math.max(30, Math.min(300, Math.round(bpm)));
    appState.currentBpm = bpm;

    // Update all BPM displays (both BPM view and Tap view)
    if (bpmInput) bpmInput.value = bpm;
    if (tapBpmDisplay) tapBpmDisplay.textContent = bpm;
    if (tapBpmInput) tapBpmInput.value = bpm;

    // Update all results
    updateQuickResults();
    updateTapQuickResults();
    updateResultsBpm();

    if (addToHistory) {
        addBpmToHistory(bpm);
    }

    if (metronome.isPlaying) {
        metronome.updateBpm(bpm);
    }
}

function updateQuickResults() {
    const bpm = appState.currentBpm;
    const beat = 60000 / bpm;

    if (qrQuarter) qrQuarter.textContent = formatValue(beat);
    if (qrEighth) qrEighth.textContent = formatValue(beat / 2);
    if (qrSixteenth) qrSixteenth.textContent = formatValue(beat / 4);
    if (qrTriplet) qrTriplet.textContent = formatValue(beat / 3);
}

function updateResultsBpm() {
    if (resultsBpmDisplay) {
        resultsBpmDisplay.textContent = appState.currentBpm;
    }
}

function formatValue(ms) {
    const mode = appState.displayMode;
    switch (mode) {
        case 'seconds':
            return (ms / 1000).toFixed(4) + ' s';
        case 'samples':
            return Math.round((ms / 1000) * appState.sampleRate).toLocaleString() + ' smp';
        case 'hz':
            return (1000 / ms).toFixed(3) + ' Hz';
        default:
            return ms.toFixed(2) + ' ms';
    }
}

function getRawValue(ms) {
    const mode = appState.displayMode;
    switch (mode) {
        case 'seconds': return (ms / 1000).toFixed(4);
        case 'samples': return Math.round((ms / 1000) * appState.sampleRate).toString();
        case 'hz': return (1000 / ms).toFixed(3);
        default: return ms.toFixed(2);
    }
}

// BPM Input
if (bpmInput) {
    bpmInput.addEventListener('input', () => {
        const val = parseInt(bpmInput.value);
        if (val >= 30 && val <= 300) {
            updateBpm(val);
        }
    });

    bpmInput.addEventListener('blur', () => {
        bpmInput.value = appState.currentBpm;
    });
}

// BPM +/- buttons
if (bpmDecreaseBtn) {
    bpmDecreaseBtn.addEventListener('click', () => {
        updateBpm(appState.currentBpm - 1);
        haptic('light');
    });
}

if (bpmIncreaseBtn) {
    bpmIncreaseBtn.addEventListener('click', () => {
        updateBpm(appState.currentBpm + 1);
        haptic('light');
    });
}

// BPM Half/Double
if (bpmHalfBtn) {
    bpmHalfBtn.addEventListener('click', () => {
        if (appState.currentBpm >= 60) {
            updateBpm(Math.round(appState.currentBpm / 2));
            haptic('medium');
            showNotification(`BPM: ${appState.currentBpm}`, 'success');
        }
    });
}

if (bpmDoubleBtn) {
    bpmDoubleBtn.addEventListener('click', () => {
        if (appState.currentBpm <= 150) {
            updateBpm(appState.currentBpm * 2);
            haptic('medium');
            showNotification(`BPM: ${appState.currentBpm}`, 'success');
        }
    });
}

/* =========================
   History
========================= */
function addBpmToHistory(bpm) {
    if (appState.history[0]?.bpm === bpm) return;

    appState.history.unshift({ bpm, time: Date.now() });
    appState.history = appState.history.slice(0, 20);

    try {
        localStorage.setItem('bpm_history', JSON.stringify(appState.history));
    } catch (e) {}

    renderHistory();
}

function renderHistory() {
    if (!historyList) return;

    historyList.innerHTML = appState.history.slice(0, 10).map(item =>
        `<button class="history-item" data-bpm="${item.bpm}">${item.bpm}</button>`
    ).join('');
}

if (historyList) {
    historyList.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if (item) {
            updateBpm(parseInt(item.dataset.bpm), false);
            haptic('light');
        }
    });
}

// Quick results click to copy
document.querySelectorAll('.quick-result-item').forEach(item => {
    item.addEventListener('click', () => {
        const value = item.querySelector('.qr-value')?.textContent;
        if (value) {
            copyToClipboard(value.split(' ')[0], () => {
                haptic('success');
                showNotification(`Copied: ${value}`, 'success');
            });
        }
    });
});

/* =========================
   Tap Tempo (Main View)
========================= */
let tapTimes = [];
const maxTaps = 12;  // More taps for better accuracy

function handleTap() {
    const now = performance.now();

    // No timeout - BPM stays until manually reset
    tapTimes.push(now);
    if (tapTimes.length > maxTaps) {
        tapTimes.shift();
    }

    if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) {
            intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);

        if (bpm >= 30 && bpm <= 300) {
            // Auto-apply the BPM immediately
            updateBpmFromTap(bpm);
        }
    }

    if (tapCountDisplay) {
        tapCountDisplay.textContent = `${tapTimes.length} ${tapTimes.length === 1 ? 'tap' : 'taps'}`;
    }

    // Visual feedback
    if (tapBtn) {
        tapBtn.classList.add('tapping');
        setTimeout(() => tapBtn.classList.remove('tapping'), 100);
    }

    haptic('medium');
}

// Update BPM from tap - updates everything including tap view results
function updateBpmFromTap(bpm) {
    bpm = Math.max(30, Math.min(300, Math.round(bpm)));
    appState.currentBpm = bpm;

    // Update all BPM displays
    if (tapBpmDisplay) tapBpmDisplay.textContent = bpm;
    if (tapBpmInput) tapBpmInput.value = bpm;
    if (bpmInput) bpmInput.value = bpm;

    // Update all results
    updateQuickResults();
    updateTapQuickResults();
    updateResultsBpm();

    // Update metronome if playing
    if (metronome.isPlaying) {
        metronome.updateBpm(bpm);
    }
}

// Update tap view quick results
function updateTapQuickResults() {
    const bpm = appState.currentBpm;
    const beat = 60000 / bpm;

    if (tapQrQuarter) tapQrQuarter.textContent = formatValue(beat);
    if (tapQrEighth) tapQrEighth.textContent = formatValue(beat / 2);
    if (tapQrSixteenth) tapQrSixteenth.textContent = formatValue(beat / 4);
    if (tapQrTriplet) tapQrTriplet.textContent = formatValue(beat / 3);
    if (tapQrDotted) tapQrDotted.textContent = formatValue(beat * 0.75);
    if (tapQrWhole) tapQrWhole.textContent = formatValue(beat * 4);
}

function resetTap() {
    tapTimes = [];
    if (tapCountDisplay) tapCountDisplay.textContent = 'Tap to detect tempo';
    // Keep the current BPM - don't reset it
}

if (tapBtn) {
    tapBtn.addEventListener('click', handleTap);
    tapBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTap();
    }, { passive: false });
}

if (tapResetBtn) {
    tapResetBtn.addEventListener('click', () => {
        resetTap();
        haptic('light');
    });
}

// Tap view BPM input
if (tapBpmInput) {
    tapBpmInput.addEventListener('input', () => {
        const val = parseInt(tapBpmInput.value);
        if (val >= 30 && val <= 300) {
            updateBpmFromTap(val);
            addBpmToHistory(val);
        }
    });

    tapBpmInput.addEventListener('blur', () => {
        tapBpmInput.value = appState.currentBpm;
    });
}

// Tap view BPM +/- buttons
if (tapBpmDown) {
    tapBpmDown.addEventListener('click', () => {
        updateBpmFromTap(appState.currentBpm - 1);
        addBpmToHistory(appState.currentBpm);
        haptic('light');
    });
}

if (tapBpmUp) {
    tapBpmUp.addEventListener('click', () => {
        updateBpmFromTap(appState.currentBpm + 1);
        addBpmToHistory(appState.currentBpm);
        haptic('light');
    });
}

// Tap view metronome toggle
if (metronomeTapToggle) {
    metronomeTapToggle.addEventListener('click', () => {
        metronome.toggle(appState.currentBpm);
        metronomeTapToggle.classList.toggle('active', metronome.isPlaying);
        if (metronomeToggle) metronomeToggle.classList.toggle('active', metronome.isPlaying);
        haptic('medium');
        showNotification(metronome.isPlaying ? `Metronome: ${appState.currentBpm} BPM` : 'Metronome stopped', 'success');
    });
}

// Tap view theme toggle
if (themeTapToggle) {
    themeTapToggle.addEventListener('click', () => {
        const isDark = document.body.dataset.theme === 'dark';
        document.body.dataset.theme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', document.body.dataset.theme);
        haptic('light');
    });
}

// Tap quick results click to copy
if (tapResultsContainer) {
    tapResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.tap-result-item');
        if (!item) return;

        const valueEl = item.querySelector('.tap-result-value');
        if (valueEl) {
            const value = valueEl.textContent.split(' ')[0];
            copyToClipboard(value, () => {
                item.classList.add('copied');
                setTimeout(() => item.classList.remove('copied'), 500);
                haptic('success');
                showNotification(`Copied: ${valueEl.textContent}`, 'success');
            });
        }
    });
}

/* =========================
   Metronome
========================= */
const metronome = {
    audioContext: null,
    isPlaying: false,
    bpm: 120,
    nextNoteTime: 0,
    timerWorker: null,
    beatCount: 0,

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playClick(time, isAccent = false) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = isAccent ? 1000 : 800;
        gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    },

    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
            const isAccent = this.beatCount % 4 === 0;
            this.playClick(this.nextNoteTime, isAccent);

            const beatIndex = this.beatCount % 4;
            setTimeout(() => {
                beatDots.forEach((dot, i) => {
                    if (dot) dot.classList.toggle('active', i === beatIndex);
                });
            }, (this.nextNoteTime - this.audioContext.currentTime) * 1000);

            this.nextNoteTime += 60 / this.bpm;
            this.beatCount++;
        }
    },

    start(bpm) {
        this.init();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.bpm = bpm || 120;
        this.isPlaying = true;
        this.beatCount = 0;
        this.nextNoteTime = this.audioContext.currentTime;

        if (metronomeToggle) metronomeToggle.classList.add('active');

        this.timerWorker = setInterval(() => this.scheduler(), 25);
    },

    stop() {
        this.isPlaying = false;
        if (this.timerWorker) {
            clearInterval(this.timerWorker);
            this.timerWorker = null;
        }
        if (metronomeToggle) metronomeToggle.classList.remove('active');
        beatDots.forEach(dot => dot?.classList.remove('active'));
    },

    toggle(bpm) {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start(bpm);
        }
    },

    updateBpm(bpm) {
        this.bpm = bpm;
    }
};

if (metronomeToggle) {
    metronomeToggle.addEventListener('click', () => {
        metronome.toggle(appState.currentBpm);
        haptic('medium');
        showNotification(metronome.isPlaying ? `Metronome: ${appState.currentBpm} BPM` : 'Metronome stopped', 'success');
    });
}

/* =========================
   MIDI Sync
========================= */
const midiSync = {
    midiAccess: null,
    isListening: false,
    clockTimes: [],
    timeout: null,
    supported: 'requestMIDIAccess' in navigator,

    async init() {
        if (!this.supported) throw new Error('MIDI not supported');
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        return this.midiAccess;
    },

    async startListening() {
        if (!this.midiAccess) await this.init();

        this.isListening = true;
        this.clockTimes = [];

        if (midiSyncBtn) midiSyncBtn.classList.add('listening');
        if (midiStatus) midiStatus.textContent = 'Waiting for MIDI clock...';

        return new Promise((resolve, reject) => {
            this.timeout = setTimeout(() => {
                this.stopListening();
                reject(new Error('No MIDI clock received'));
            }, 10000);

            const handleMessage = (event) => {
                if (event.data[0] === 0xF8) {
                    this.clockTimes.push(performance.now());

                    if (this.clockTimes.length >= 48) {
                        const bpm = this.calculateBPM();
                        if (this.clockTimes.length >= 96 || this.isStable()) {
                            this.stopListening();
                            clearTimeout(this.timeout);
                            resolve({ bpm: Math.round(bpm), ticks: this.clockTimes.length });
                        }
                    }

                    if (midiStatus && this.clockTimes.length >= 24) {
                        midiStatus.textContent = `~${Math.round(this.calculateBPM())} BPM`;
                    }
                }
            };

            this.midiAccess.inputs.forEach(input => {
                input.onmidimessage = handleMessage;
            });
        });
    },

    stopListening() {
        this.isListening = false;
        if (this.timeout) clearTimeout(this.timeout);
        if (this.midiAccess) {
            this.midiAccess.inputs.forEach(input => input.onmidimessage = null);
        }
        if (midiSyncBtn) midiSyncBtn.classList.remove('listening');
        if (midiStatus) midiStatus.textContent = '';
    },

    calculateBPM() {
        if (this.clockTimes.length < 2) return 0;
        const intervals = [];
        for (let i = 1; i < this.clockTimes.length; i++) {
            intervals.push(this.clockTimes[i] - this.clockTimes[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return 60000 / (avg * 24);
    },

    isStable() {
        if (this.clockTimes.length < 72) return false;
        const mid = Math.floor(this.clockTimes.length / 2);
        const first = this.clockTimes.slice(0, mid);
        const second = this.clockTimes.slice(mid);
        const bpm1 = this.calculateBPMFromTicks(first);
        const bpm2 = this.calculateBPMFromTicks(second);
        return Math.abs(bpm1 - bpm2) < 0.5;
    },

    calculateBPMFromTicks(ticks) {
        const intervals = [];
        for (let i = 1; i < ticks.length; i++) {
            intervals.push(ticks[i] - ticks[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return 60000 / (avg * 24);
    }
};

if (midiSyncBtn) {
    if (!midiSync.supported) {
        midiSyncBtn.disabled = true;
        midiSyncBtn.style.opacity = '0.5';
    } else {
        midiSyncBtn.addEventListener('click', async () => {
            if (midiSync.isListening) {
                midiSync.stopListening();
                return;
            }

            try {
                haptic('light');
                showNotification('Listening for MIDI clock...', 'success');
                const result = await midiSync.startListening();
                updateBpm(result.bpm);
                haptic('success');
                showNotification(`MIDI Sync: ${result.bpm} BPM`, 'success');
            } catch (err) {
                haptic('error');
                showNotification(err.message, 'error');
            }
        });
    }
}

/* =========================
   Delay Calculations
========================= */
function getSubdivisions() {
    const beat = 60000 / appState.currentBpm;

    const subdivisions = {
        'Simple': [
            { name: 'Whole Note (1/1)', factor: 4, note: '4 beats' },
            { name: 'Half Note (1/2)', factor: 2, note: '2 beats' },
            { name: 'Quarter Note (1/4)', factor: 1, note: '1 beat' },
            { name: 'Eighth Note (1/8)', factor: 0.5, note: '1/2 beat' },
            { name: 'Sixteenth Note (1/16)', factor: 0.25, note: '1/4 beat' },
            { name: 'Thirty-Second (1/32)', factor: 0.125, note: '1/8 beat' }
        ],
        'Dotted': [
            { name: 'Dotted Half', factor: 3, note: '3 beats' },
            { name: 'Dotted Quarter', factor: 1.5, note: '1.5 beats' },
            { name: 'Dotted Eighth', factor: 0.75, note: '0.75 beats' },
            { name: 'Dotted Sixteenth', factor: 0.375, note: '0.375 beats' }
        ],
        'Triplet': [
            { name: 'Half Note Triplet', factor: 2/3, note: '0.67 beats' },
            { name: 'Quarter Note Triplet', factor: 1/3, note: '0.33 beats' },
            { name: 'Eighth Note Triplet', factor: 1/6, note: '0.17 beats' },
            { name: 'Sixteenth Triplet', factor: 1/12, note: '0.083 beats' }
        ],
        'Creative': [
            { name: 'Golden Ratio', factor: 1.618, note: 'Phi (φ)' },
            { name: 'Golden Ratio Inv', factor: 0.618, note: '1/φ' },
            { name: 'Quintuplet', factor: 0.4, note: '1/5 beat' },
            { name: 'Septuplet', factor: 2/7, note: '1/7 beat' }
        ],
        'LFO': [
            { name: '2 Bars', factor: 8, note: 'Slow mod' },
            { name: '4 Bars', factor: 16, note: 'Very slow' },
            { name: 'Swing Eighth', factor: 2/3, note: 'Swing feel' }
        ]
    };

    // Add custom subdivisions
    const customSubs = loadCustomSubdivisions();
    if (customSubs.length > 0) {
        subdivisions['Custom'] = customSubs.map(s => ({
            name: s.name,
            factor: s.factor,
            note: `${s.factor}x`
        }));
    }

    // Calculate ms values
    const result = {};
    for (const [category, items] of Object.entries(subdivisions)) {
        result[category] = items.map(item => ({
            ...item,
            ms: beat * item.factor
        }));
    }

    return result;
}

function populateDelayCards() {
    if (!delayGrid) return;

    const subdivisions = getSubdivisions();
    const activeCategory = appState.activeCategory;

    let html = '';

    for (const [category, items] of Object.entries(subdivisions)) {
        const categoryLower = category.toLowerCase();

        if (activeCategory !== 'all' && categoryLower !== activeCategory) {
            continue;
        }

        html += `<div class="category-header">${category}</div>`;

        for (const item of items) {
            html += `
                <div class="delay-card" data-ms="${item.ms}" data-name="${item.name}">
                    <div class="delay-info">
                        <span class="delay-name">${item.name}</span>
                        <span class="delay-note">${item.note}</span>
                    </div>
                    <span class="delay-value">${formatValue(item.ms)}</span>
                </div>
            `;
        }
    }

    delayGrid.innerHTML = html;
}

// Delay card click handler
if (delayGrid) {
    delayGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.delay-card');
        if (!card) return;

        const ms = parseFloat(card.dataset.ms);
        const value = getRawValue(ms);

        copyToClipboard(value, () => {
            card.classList.add('copied');
            setTimeout(() => card.classList.remove('copied'), 500);

            if (popupContent) popupContent.textContent = formatValue(ms);
            if (delayPopup) {
                delayPopup.setAttribute('aria-hidden', 'false');
                setTimeout(() => delayPopup.setAttribute('aria-hidden', 'true'), 1000);
            }

            haptic('success');
        });
    });
}

// Category filters
if (categoryFilters) {
    categoryFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        categoryFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        appState.activeCategory = chip.dataset.category;
        populateDelayCards();
        haptic('light');
    });
}

// Copy all
if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
        const subdivisions = getSubdivisions();
        let text = `Delay Times for ${appState.currentBpm} BPM\n\n`;

        for (const [category, items] of Object.entries(subdivisions)) {
            text += `${category}:\n`;
            for (const item of items) {
                text += `  ${item.name}: ${formatValue(item.ms)}\n`;
            }
            text += '\n';
        }

        copyToClipboard(text, () => {
            haptic('success');
            showNotification('All values copied!', 'success');
        });
    });
}

// Display mode
if (displayModeSelect) {
    displayModeSelect.value = appState.displayMode;
    displayModeSelect.addEventListener('change', () => {
        appState.displayMode = displayModeSelect.value;
        updateQuickResults();
        populateDelayCards();
        saveState();
    });
}

/* =========================
   Settings
========================= */
// Sample rate options
if (sampleRateOptions) {
    sampleRateOptions.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === appState.sampleRate);
        btn.addEventListener('click', () => {
            sampleRateOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.sampleRate = parseInt(btn.dataset.value);
            saveState();
            updateQuickResults();
            populateDelayCards();
            haptic('light');
        });
    });
}

// Display mode options
if (displayModeOptions) {
    displayModeOptions.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === appState.displayMode);
        btn.addEventListener('click', () => {
            displayModeOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.displayMode = btn.dataset.value;
            if (displayModeSelect) displayModeSelect.value = appState.displayMode;
            saveState();
            updateQuickResults();
            populateDelayCards();
            haptic('light');
        });
    });
}

// Haptic toggle
if (hapticToggle) {
    hapticToggle.checked = appState.hapticEnabled;
    hapticToggle.addEventListener('change', () => {
        appState.hapticEnabled = hapticToggle.checked;
        saveState();
        if (appState.hapticEnabled) haptic('light');
    });
}

// Theme toggle
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.dataset.theme === 'dark';
        document.body.dataset.theme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', document.body.dataset.theme);
        haptic('light');
    });
}

/* =========================
   Custom Subdivisions
========================= */
let customSubdivisions = loadCustomSubdivisions();

function loadCustomSubdivisions() {
    try {
        return JSON.parse(localStorage.getItem('custom_subdivisions') || '[]');
    } catch (e) {
        return [];
    }
}

function saveCustomSubdivisions() {
    localStorage.setItem('custom_subdivisions', JSON.stringify(customSubdivisions));
}

function renderCustomSubdivisions() {
    if (!customSubdivisionsList) return;

    if (customSubdivisions.length === 0) {
        customSubdivisionsList.innerHTML = '';
        return;
    }

    customSubdivisionsList.innerHTML = customSubdivisions.map((sub, i) => `
        <div class="list-item">
            <div>
                <div class="list-item-name">${sub.name}</div>
                <div class="list-item-detail">Factor: ${sub.factor}</div>
            </div>
            <button class="btn-icon-sm danger" data-index="${i}" aria-label="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        </div>
    `).join('');
}

if (addSubdivisionBtn) {
    addSubdivisionBtn.addEventListener('click', () => {
        const name = subdivisionNameInput?.value.trim();
        const factor = parseFloat(subdivisionFactorInput?.value);

        if (!name || isNaN(factor) || factor <= 0) {
            showNotification('Invalid name or factor', 'error');
            return;
        }

        customSubdivisions.push({ name, factor });
        saveCustomSubdivisions();
        renderCustomSubdivisions();
        populateDelayCards();

        if (subdivisionNameInput) subdivisionNameInput.value = '';
        if (subdivisionFactorInput) subdivisionFactorInput.value = '';

        haptic('success');
        showNotification(`Added: ${name}`, 'success');
    });
}

if (customSubdivisionsList) {
    customSubdivisionsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-icon-sm');
        if (!btn) return;

        const index = parseInt(btn.dataset.index);
        customSubdivisions.splice(index, 1);
        saveCustomSubdivisions();
        renderCustomSubdivisions();
        populateDelayCards();
        haptic('light');
    });
}

/* =========================
   Presets
========================= */
let presets = loadPresets();

function loadPresets() {
    try {
        return JSON.parse(localStorage.getItem('presets') || '[]');
    } catch (e) {
        return [];
    }
}

function savePresets() {
    localStorage.setItem('presets', JSON.stringify(presets));
}

function renderPresets() {
    if (!presetsList) return;

    if (presets.length === 0) {
        presetsList.innerHTML = '';
        return;
    }

    presetsList.innerHTML = presets.map((preset, i) => `
        <div class="list-item">
            <div>
                <div class="list-item-name">${preset.name}</div>
                <div class="list-item-detail">${preset.bpm} BPM</div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon-sm" data-action="load" data-index="${i}" aria-label="Load">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                </button>
                <button class="btn-icon-sm danger" data-action="delete" data-index="${i}" aria-label="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
        const name = presetNameInput?.value.trim();
        if (!name) {
            showNotification('Enter a preset name', 'error');
            return;
        }

        presets.push({
            name,
            bpm: appState.currentBpm,
            sampleRate: appState.sampleRate,
            displayMode: appState.displayMode,
            customSubdivisions: [...customSubdivisions]
        });

        savePresets();
        renderPresets();

        if (presetNameInput) presetNameInput.value = '';
        haptic('success');
        showNotification(`Saved: ${name}`, 'success');
    });
}

if (presetsList) {
    presetsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-icon-sm');
        if (!btn) return;

        const index = parseInt(btn.dataset.index);
        const action = btn.dataset.action;

        if (action === 'load') {
            const preset = presets[index];
            updateBpm(preset.bpm);
            appState.sampleRate = preset.sampleRate || 44100;
            appState.displayMode = preset.displayMode || 'ms';
            customSubdivisions = [...(preset.customSubdivisions || [])];

            saveCustomSubdivisions();
            renderCustomSubdivisions();
            saveState();

            switchView('bpm');
            haptic('success');
            showNotification(`Loaded: ${preset.name}`, 'success');
        } else if (action === 'delete') {
            presets.splice(index, 1);
            savePresets();
            renderPresets();
            haptic('light');
        }
    });
}

/* =========================
   Share & Export
========================= */
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const text = `Delay Times for ${appState.currentBpm} BPM\n\nQuarter: ${formatValue(60000/appState.currentBpm)}\nEighth: ${formatValue(30000/appState.currentBpm)}\n\nCalculated with quadra.calc`;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'quadra.calc', text });
                haptic('success');
            } catch (e) {
                if (e.name !== 'AbortError') {
                    copyToClipboard(text, () => showNotification('Copied to clipboard', 'success'));
                }
            }
        } else {
            copyToClipboard(text, () => {
                haptic('success');
                showNotification('Copied to clipboard', 'success');
            });
        }
    });
}

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const data = {
            bpm: appState.currentBpm,
            sampleRate: appState.sampleRate,
            generated: new Date().toISOString(),
            subdivisions: getSubdivisions(),
            customSubdivisions
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quadra-calc-${appState.currentBpm}bpm.json`;
        a.click();
        URL.revokeObjectURL(url);

        haptic('success');
        showNotification('Exported!', 'success');
    });
}

/* =========================
   Initialization
========================= */
function init() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;

    // Initialize BPM displays
    if (bpmInput) bpmInput.value = appState.currentBpm;
    if (tapBpmDisplay) tapBpmDisplay.textContent = appState.currentBpm;
    if (tapBpmInput) tapBpmInput.value = appState.currentBpm;

    // Render all results
    updateQuickResults();
    updateTapQuickResults();
    renderHistory();
    renderCustomSubdivisions();
    renderPresets();

    console.log('quadra.calc v3.1 initialized - Tap is main view');
}

init();

// Expose for debugging
window.appState = appState;
window.showNotification = showNotification;
