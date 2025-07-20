/* scripts/app.js */

/* =========================
   DOM Elements
========================= */
const calculateBtn = document.getElementById('calculate-btn');
const bpmInput = document.getElementById('bpm-input');
const suggestionsTable = document.getElementById('suggestions-table').querySelector('tbody');
const copyBtn = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tapBtn = document.getElementById('tap-btn');
const tapFeedback = document.getElementById('tap-feedback');
const tapProgress = document.getElementById('tap-progress');
const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
const subdivisionNameInput = document.getElementById('subdivision-name');
const subdivisionFactorInput = document.getElementById('subdivision-factor');
const customSubdivisionsTable = document.getElementById('custom-subdivisions-table').querySelector('tbody');
const savePresetBtn = document.getElementById('save-preset-btn');
const presetNameInput = document.getElementById('preset-name');
const presetsTable = document.getElementById('presets-table').querySelector('tbody');
const notification = document.getElementById('notification');
const installBtn = document.getElementById('install-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpModal = document.getElementById('close-help-modal');
const delayPopup = document.getElementById('delay-popup');
const popupContent = document.getElementById('popup-content');

/* =========================
   State Variables
========================= */
let customSubdivisions = [];
let presets = [];
let tapTimes = [];
let tapTimeout;
const maxTaps = 8;
let deferredPrompt;

// Safe localStorage operations
function loadPresets() {
    try {
        const stored = localStorage.getItem('delay_presets');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter(preset => 
                    preset && 
                    typeof preset.name === 'string' && 
                    typeof preset.bpm === 'number' &&
                    preset.bpm >= 30 && preset.bpm <= 300
                ).slice(0, 50); // Limit to 50 presets
            }
        }
    } catch (error) {
        console.warn('Failed to load presets from localStorage:', error);
    }
    return [];
}

presets = loadPresets();

/* =========================
   Application State Manager
========================= */
class AppState {
    constructor() {
        this.currentBpm = null;
        this.isCalculating = false;
        this.lastCalculationTime = 0;
    }
    
    updateBpm(bpm) {
        if (bpm >= 30 && bpm <= 300) {
            this.currentBpm = bpm;
            return true;
        }
        return false;
    }
    
    canCalculate() {
        const now = performance.now();
        const canCalc = !this.isCalculating && (now - this.lastCalculationTime > 100);
        if (canCalc) {
            this.lastCalculationTime = now;
        }
        return canCalc;
    }
    
    setCalculating(calculating) {
        this.isCalculating = calculating;
    }
}

const appState = new AppState();

/* =========================
   Initialization
========================= */
initializeTheme();
initializePresets();
initializePopup();
initializeKeyboardNavigation();

/* =========================
   Theme Management
========================= */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', initialTheme);
    updateThemeIcon();

    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = `
            <!-- Moon Icon Visible -->
            <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor"/>
            <!-- Sun Icon Hidden -->
            <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor" style="display: none;"/>
        `;
    } else {
        themeIcon.innerHTML = `
            <!-- Moon Icon Hidden -->
            <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor" style="display: none;"/>
            <!-- Sun Icon Visible -->
            <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor"/>
        `;
    }
}

/* =========================
   Delay Time Calculations
========================= */
calculateBtn.addEventListener('click', handleCalculate);
bpmInput.addEventListener('input', debouncedCalculate); // Auto-calculate on input

const debouncedCalculate = debounce(function() {
    if (!appState.canCalculate()) {
        return;
    }
    
    appState.setCalculating(true);
    const bpm = parseInt(bpmInput.value);
    
    if (!appState.updateBpm(bpm)) {
        showNotification('Please enter a valid BPM between 30 and 300.', 'error');
        appState.setCalculating(false);
        return;
    }
    
    try {
        const delayTimes = calculateDelayTimes(bpm);
        populateSuggestions(delayTimes);
        showNotification('Delay times calculated successfully!');
    } catch (error) {
        console.error('Calculation error:', error);
        showNotification('Error calculating delay times.', 'error');
    } finally {
        appState.setCalculating(false);
    }
}, 300);

function handleCalculate() {
    debouncedCalculate();
}

function calculateDelayTimes(bpm) {
    const beatDuration = 60000 / bpm; // Quarter note duration in ms
    const standardSubdivisions = {
        // Simple Subdivisions
        'Whole Note (1/1)': 4,
        'Half Note (1/2)': 2,
        'Quarter Note (1/4)': 1,
        'Eighth Note (1/8)': 0.5,
        'Sixteenth Note (1/16)': 0.25,
        'Thirty-Second Note (1/32)': 0.125,

        // Compound Subdivisions
        'Dotted Half Note': 3,
        'Dotted Quarter Note': 1.5,
        'Dotted Eighth Note': 0.75,
        'Dotted Sixteenth Note': 0.375,
        
        // Corrected Triplet Subdivisions
        'Triplet Whole Note': 4/3, // 1.3333
        'Triplet Half Note': 2/3,  // 0.6667
        'Triplet Quarter Note': 1/3, // 0.3333
        'Triplet Eighth Note': 1/6,  // 0.1667
        
        // Quintuplet Subdivisions
        'Quintuplet Quarter Note': 0.8,
        'Quintuplet Eighth Note': 0.4,
        
        // Syncopated Subdivisions
        'Swing Eighth Note': 2/3, // 0.6667
        'Shuffle Feel': 0.6
    };
    
    // Merge with custom subdivisions
    const allSubdivisions = { ...standardSubdivisions };
    customSubdivisions.forEach(sub => {
        allSubdivisions[sub.name] = sub.factor;
    });
    
    // Calculate delay times with proper rounding
    const delayTimes = {};
    for (const [subdivision, factor] of Object.entries(allSubdivisions)) {
        const delay = beatDuration * factor;
        delayTimes[subdivision] = Math.round(delay * 100) / 100; // Round to 2 decimal places
    }
    
    return delayTimes;
}

function populateSuggestions(delayTimes) {
    suggestionsTable.innerHTML = '';
    const bpm = parseInt(bpmInput.value);
    
    const simpleSubdivisions = {
        'Whole Note (1/1)': 4,
        'Half Note (1/2)': 2,
        'Quarter Note (1/4)': 1,
        'Eighth Note (1/8)': 0.5,
        'Sixteenth Note (1/16)': 0.25,
        'Thirty-Second Note (1/32)': 0.125
    };
    
    const compoundSubdivisions = {
        'Dotted Half Note': 3,
        'Dotted Quarter Note': 1.5,
        'Dotted Eighth Note': 0.75,
        'Dotted Sixteenth Note': 0.375,
        'Triplet Whole Note': 4/3,
        'Triplet Half Note': 2/3,
        'Triplet Quarter Note': 1/3,
        'Triplet Eighth Note': 1/6,
        'Quintuplet Quarter Note': 0.8,
        'Quintuplet Eighth Note': 0.4,
        'Swing Eighth Note': 2/3,
        'Shuffle Feel': 0.6
    };

    // Function to Add Rows
    function addRows(subdivisions, category) {
        if (category) {
            const categoryRow = suggestionsTable.insertRow();
            const categoryCell = categoryRow.insertCell(0);
            categoryCell.colSpan = 2;
            categoryCell.textContent = category;
            categoryCell.style.fontWeight = 'bold';
            categoryCell.style.backgroundColor = 'rgba(30, 144, 255, 0.1)'; /* Light Dodger Blue */
            categoryCell.style.textAlign = 'center';
        }
        for (const [subdivision, factor] of Object.entries(subdivisions)) {
            const ms = Math.round((60000 / bpm) * factor * 100) / 100; // Consistent rounding
            const row = suggestionsTable.insertRow();
            row.classList.add('clickable-row');
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Copy delay time for ${subdivision}, ${ms.toFixed(2)} milliseconds`);
            const cellSubdivision = row.insertCell(0);
            const cellMs = row.insertCell(1);
            cellSubdivision.textContent = subdivision;
            cellMs.textContent = ms.toFixed(2) + ' ms';
        }
    }

    // Add Simple Subdivisions
    addRows(simpleSubdivisions, 'Simple Subdivisions');

    // Add Compound Subdivisions
    addRows(compoundSubdivisions, 'Compound Subdivisions');

    // Add Custom Subdivisions
    if (customSubdivisions.length > 0) {
        addRows({}, 'Custom Subdivisions');
        customSubdivisions.forEach(sub => {
            const ms = Math.round((60000 / bpm) * sub.factor * 100) / 100;
            const row = suggestionsTable.insertRow();
            row.classList.add('clickable-row');
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Copy delay time for ${sub.name}, ${ms.toFixed(2)} milliseconds`);
            const cellSubdivision = row.insertCell(0);
            const cellMs = row.insertCell(1);
            cellSubdivision.textContent = sub.name;
            cellMs.textContent = ms.toFixed(2) + ' ms';
        });
    }

    /* After populating the table, add event listeners to the new rows */
    addDelayRowEventListeners();
}

/* =========================
   Copy to Clipboard Functionality
========================= */
copyBtn.addEventListener('click', () => {
    const bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm < 30 || bpm > 300) {
        showNotification('Please calculate delay times first.', 'error');
        return;
    }
    
    let textToCopy = `Delay Time Suggestions for ${bpm} BPM:\n`;
    const rows = suggestionsTable.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
            const subdivision = cells[0].textContent.trim();
            const delay = cells[1].textContent.trim();
            if (subdivision && delay) {
                textToCopy += `${subdivision}: ${delay}\n`;
            }
        }
    });
    
    textToCopy += `\nGenerated by quadra.calc at ${new Date().toLocaleString()}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('Delay times copied to clipboard!');
        }).catch(() => {
            fallbackCopyTextToClipboard(textToCopy);
        });
    } else {
        fallbackCopyTextToClipboard(textToCopy);
    }
});

/* =========================
   Tap Tempo Functionality
========================= */
tapBtn.addEventListener('click', () => {
    const now = performance.now(); // High precision timing
    tapTimes.push(now);
    
    if (tapTimes.length > maxTaps) {
        tapTimes.shift();
    }
    
    if (tapTimeout) clearTimeout(tapTimeout);
    
    // Dynamic timeout based on current tempo or default
    const currentBpm = parseInt(bpmInput.value) || 120;
    const beatDuration = 60000 / currentBpm;
    const timeoutDuration = Math.max(beatDuration * 3, 2000); // 3 beats or 2s minimum
    
    tapTimeout = setTimeout(() => {
        tapTimes = [];
        tapFeedback.textContent = '';
        tapProgress.style.width = '0%';
    }, timeoutDuration);

    if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) {
            intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }
        
        // Filter outliers (remove intervals that are 50% outside the median)
        if (intervals.length >= 3) {
            const sortedIntervals = [...intervals].sort((a, b) => a - b);
            const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
            const filteredIntervals = intervals.filter(interval => 
                Math.abs(interval - median) < median * 0.5
            );
            if (filteredIntervals.length >= 2) {
                intervals.splice(0, intervals.length, ...filteredIntervals);
            }
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);
        
        // Validate BPM range
        if (bpm >= 30 && bpm <= 300) {
            bpmInput.value = bpm;
            tapFeedback.textContent = `BPM: ${bpm} (${tapTimes.length} taps)`;
            const delayTimes = calculateDelayTimes(bpm);
            populateSuggestions(delayTimes);
            showNotification('BPM set via Tap Tempo!');
        } else {
            tapFeedback.textContent = `Invalid BPM: ${bpm}. Keep tapping...`;
        }
        
        // Improved visual indicator
        const progress = Math.min((tapTimes.length / maxTaps) * 100, 100);
        tapProgress.style.width = progress + '%';
    } else {
        tapFeedback.textContent = 'Keep tapping...';
        tapProgress.style.width = '20%';
    }
});

/* =========================
   Custom Subdivisions Management
========================= */
addSubdivisionBtn.addEventListener('click', () => {
    const name = subdivisionNameInput.value.trim();
    const factor = parseFloat(subdivisionFactorInput.value);
    
    // Enhanced validation
    if (name === '' || name.length > 50) {
        showNotification('Please enter a valid subdivision name (1-50 characters).', 'error');
        return;
    }
    if (isNaN(factor) || factor <= 0 || factor > 10) {
        showNotification('Please enter a valid factor between 0.1 and 10.', 'error');
        return;
    }
    
    // Sanitize name input
    const sanitizedName = name.replace(/[<>"'&]/g, '');
    if (sanitizedName !== name) {
        showNotification('Invalid characters removed from name.', 'error');
        return;
    }
    
    // Check for duplicate names
    if (customSubdivisions.some(sub => sub.name.toLowerCase() === sanitizedName.toLowerCase())) {
        showNotification('Subdivision name already exists.', 'error');
        return;
    }
    
    // Limit number of custom subdivisions
    if (customSubdivisions.length >= 20) {
        showNotification('Maximum of 20 custom subdivisions allowed.', 'error');
        return;
    }
    
    customSubdivisions.push({ name: sanitizedName, factor });
    subdivisionNameInput.value = '';
    subdivisionFactorInput.value = '';
    updateCustomSubdivisionsTable();
    
    if (bpmInput.value) {
        const bpm = parseInt(bpmInput.value);
        if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
            const delayTimes = calculateDelayTimes(bpm);
            populateSuggestions(delayTimes);
        }
    }
    showNotification('Custom subdivision added!');
});

function updateCustomSubdivisionsTable() {
    customSubdivisionsTable.innerHTML = '';
    customSubdivisions.forEach((sub, index) => {
        const row = customSubdivisionsTable.insertRow();
        const cellName = row.insertCell(0);
        const cellFactor = row.insertCell(1);
        const cellAction = row.insertCell(2);

        cellName.textContent = sub.name;
        cellFactor.textContent = sub.factor;

        // Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('action-button');
        removeBtn.setAttribute('aria-label', `Remove ${sub.name}`);
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Remove subdivision "${sub.name}"?`)) {
                customSubdivisions.splice(index, 1);
                updateCustomSubdivisionsTable();
                const bpm = parseInt(bpmInput.value);
                if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
                    const delayTimes = calculateDelayTimes(bpm);
                    populateSuggestions(delayTimes);
                }
                showNotification('Custom subdivision removed!');
            }
        });

        cellAction.appendChild(removeBtn);
    });
}

/* =========================
   Presets Management
========================= */
savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    const bpm = parseInt(bpmInput.value);
    
    // Enhanced validation
    if (name === '' || name.length > 30) {
        showNotification('Please enter a valid preset name (1-30 characters).', 'error');
        return;
    }
    if (isNaN(bpm) || bpm < 30 || bpm > 300) {
        showNotification('Please enter a valid BPM between 30 and 300.', 'error');
        return;
    }
    
    // Sanitize name input
    const sanitizedName = name.replace(/[<>"'&]/g, '');
    if (sanitizedName !== name) {
        showNotification('Invalid characters removed from preset name.', 'error');
        return;
    }
    
    // Check for duplicate preset names
    if (presets.some(preset => preset.name.toLowerCase() === sanitizedName.toLowerCase())) {
        showNotification('Preset name already exists.', 'error');
        return;
    }
    
    // Limit number of presets
    if (presets.length >= 50) {
        showNotification('Maximum of 50 presets allowed.', 'error');
        return;
    }
    
    const preset = { 
        name: sanitizedName, 
        bpm, 
        customSubdivisions: JSON.parse(JSON.stringify(customSubdivisions)),
        timestamp: Date.now()
    };
    
    presets.push(preset);
    
    try {
        localStorage.setItem('delay_presets', JSON.stringify(presets));
        presetNameInput.value = '';
        updatePresetsTable();
        showNotification('Preset saved successfully!');
    } catch (error) {
        showNotification('Failed to save preset. Storage may be full.', 'error');
        presets.pop(); // Remove the preset we just added
    }
});

function updatePresetsTable() {
    presetsTable.innerHTML = '';
    presets.forEach((preset, index) => {
        const row = presetsTable.insertRow();
        const cellName = row.insertCell(0);
        const cellBPM = row.insertCell(1);
        const cellAction = row.insertCell(2);

        cellName.textContent = preset.name;
        cellBPM.textContent = preset.bpm;

        // Load Button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.classList.add('action-button');
        loadBtn.setAttribute('aria-label', `Load preset ${preset.name}`);
        loadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                // Validate preset data
                if (!preset.bpm || preset.bpm < 30 || preset.bpm > 300) {
                    showNotification('Invalid BPM in preset.', 'error');
                    return;
                }
                
                bpmInput.value = preset.bpm;
                
                // Safely load custom subdivisions
                if (Array.isArray(preset.customSubdivisions)) {
                    customSubdivisions = preset.customSubdivisions.filter(sub => 
                        sub && typeof sub.name === 'string' && typeof sub.factor === 'number' &&
                        sub.factor > 0 && sub.factor <= 10
                    );
                } else {
                    customSubdivisions = [];
                }
                
                updateCustomSubdivisionsTable();
                const delayTimes = calculateDelayTimes(preset.bpm);
                populateSuggestions(delayTimes);
                showNotification(`Preset "${preset.name}" loaded!`);
            } catch (error) {
                showNotification('Failed to load preset.', 'error');
            }
        });

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('action-button');
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete preset "${preset.name}"?`)) {
                try {
                    presets.splice(index, 1);
                    localStorage.setItem('delay_presets', JSON.stringify(presets));
                    updatePresetsTable();
                    showNotification('Preset deleted.');
                } catch (error) {
                    showNotification('Failed to delete preset.', 'error');
                }
            }
        });

        // Action Buttons Container
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.justifyContent = 'center';
        actionContainer.style.gap = '10px';
        actionContainer.appendChild(loadBtn);
        actionContainer.appendChild(deleteBtn);
        cellAction.appendChild(actionContainer);
    });
}

function initializePresets() {
    updatePresetsTable();
    
    // Clean up localStorage if needed
    try {
        const usage = JSON.stringify(presets).length;
        if (usage > 1000000) { // ~1MB limit
            console.warn('Presets storage approaching limit');
            showNotification('Storage approaching limit. Consider removing old presets.', 'error');
        }
    } catch (error) {
        console.warn('Failed to check storage usage:', error);
    }
}

/* =========================
   Pop-up Card for Copied Delay Value
========================= */
/* Initialize Pop-up Event Listener */
function initializePopup() {
    // Add a single event listener to hide the pop-up when clicked
    delayPopup.addEventListener('click', hideDelayPopup);
}

/* Function to Show Delay Pop-up with Animation and Icon */
function showDelayPopup(delayMs) {
    // Validate and sanitize input
    const delay = parseFloat(delayMs);
    if (isNaN(delay) || delay <= 0) {
        return;
    }
    
    // Create safe HTML content
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('class', 'popup-icon');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('width', '48');
    iconSvg.setAttribute('height', '48');
    iconSvg.setAttribute('fill', 'green');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20.285,6.708l-11.49,11.49l-5.659-5.659L5.596,13.024L8.565,16L19.7,4.865l-1.414-1.414Z');
    iconSvg.appendChild(path);
    
    const span = document.createElement('span');
    span.textContent = `${delay.toFixed(2)} ms`;
    
    // Clear and populate popup content
    popupContent.innerHTML = '';
    popupContent.appendChild(iconSvg);
    popupContent.appendChild(span);
    
    delayPopup.classList.remove('hide');
    delayPopup.classList.add('show');
    delayPopup.setAttribute('aria-hidden', 'false');
    delayPopup.style.display = 'block';
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        if (delayPopup.classList.contains('show')) {
            hideDelayPopup();
        }
    }, 2000);
}

/* Function to Hide Delay Pop-up with Animation */
function hideDelayPopup() {
    delayPopup.classList.remove('show');
    delayPopup.classList.add('hide');
    delayPopup.setAttribute('aria-hidden', 'true');

    // Hide the pop-up after animation
    setTimeout(() => {
        delayPopup.style.display = 'none';
        delayPopup.classList.remove('hide');
    }, 300); // Match with CSS animation duration
}

/* =========================
   Notification System
========================= */
let notificationTimeout;

function showNotification(message, type = 'success', duration = 3000) {
    // Clear any existing notification
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notification.classList.remove('show');
    }
    
    // Sanitize message
    const sanitizedMessage = String(message).replace(/[<>"'&]/g, '');
    
    notification.textContent = sanitizedMessage;
    notification.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
    notification.classList.add('show');
    
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notificationTimeout = null;
    }, Math.max(1000, Math.min(10000, duration))); // Clamp between 1-10 seconds
}

/* =========================
   Clipboard and Pop-up Interaction
========================= */
/* Generic Debounce Function */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/* Function to Handle Row Clicks and Keyboard Activation */
function handleRowClick(row) {
    const subdivision = row.cells[0].textContent;
    const delayMsText = row.cells[1].textContent;
    const delayMs = delayMsText.replace(' ms', '');

    // Validate the delay value before copying
    const delayValue = parseFloat(delayMs);
    if (isNaN(delayValue) || delayValue <= 0) {
        showNotification('Invalid delay value.', 'error');
        return;
    }

    // Copy to Clipboard with fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(delayMs)
            .then(() => {
                showNotification(`Copied ${delayMs} ms to clipboard!`);
                // Add temporary class for visual confirmation
                row.classList.add('copied');
                setTimeout(() => {
                    row.classList.remove('copied');
                }, 1000);
            })
            .catch(() => {
                fallbackCopyTextToClipboard(delayMs);
            });
    } else {
        fallbackCopyTextToClipboard(delayMs);
    }

    // Show Pop-up Card
    showDelayPopup(delayMs);
}

/* Fallback clipboard function for older browsers */
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(`Copied ${text} ms to clipboard!`);
        } else {
            showNotification('Failed to copy delay time.', 'error');
        }
    } catch (err) {
        showNotification('Failed to copy delay time.', 'error');
    } finally {
        document.body.removeChild(textArea);
    }
}

/* Debounced Handle Row Click */
const debouncedHandleRowClick = debounce(handleRowClick, 300);

/* Function to Add Event Listeners to Delay Suggestions Rows */
function addDelayRowEventListeners() {
    const clickableRows = document.querySelectorAll('.delay-suggestions-card table tbody tr.clickable-row');
    clickableRows.forEach(row => {
        // Mouse Click
        row.addEventListener('click', () => {
            debouncedHandleRowClick(row);
        });

        // Keyboard Interaction
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent scrolling on Space
                debouncedHandleRowClick(row);
            }
        });
    });
}

/* =========================
   Keyboard Navigation and Accessibility
========================= */
function initializeKeyboardNavigation() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to calculate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (bpmInput.value) {
                handleCalculate();
            }
        }
        
        // Space to tap tempo when focused on tap button
        if (e.key === ' ' && document.activeElement === tapBtn) {
            e.preventDefault();
            tapBtn.click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (helpModal.style.display === 'block') {
                helpModal.style.display = 'none';
                helpModal.setAttribute('aria-hidden', 'true');
            }
            if (delayPopup.classList.contains('show')) {
                hideDelayPopup();
            }
        }
        
        // T to focus tap button
        if (e.key === 't' && !isInputFocused()) {
            e.preventDefault();
            tapBtn.focus();
        }
        
        // B to focus BPM input
        if (e.key === 'b' && !isInputFocused()) {
            e.preventDefault();
            bpmInput.focus();
        }
    });
    
    // Improve focus management
    document.addEventListener('focusin', (e) => {
        if (e.target.classList.contains('clickable-row')) {
            e.target.setAttribute('aria-selected', 'true');
        }
    });
    
    document.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('clickable-row')) {
            e.target.removeAttribute('aria-selected');
        }
    });
}

function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
}

/* =========================
   Install Button Functionality
========================= */
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex'; // Show the install button
    showNotification('You can install quadra.calc as an app!', 'success');
});

/* Handle Install Button Click */
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showNotification('App installed successfully!', 'success');
        } else {
            showNotification('App installation canceled.', 'error');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
});

/* =========================
   Help Modal Functionality
========================= */
/* Open Help Modal */
helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'block';
    helpModal.setAttribute('aria-hidden', 'false');
});

/* Close Help Modal */
closeHelpModal.addEventListener('click', () => {
    helpModal.style.display = 'none';
    helpModal.setAttribute('aria-hidden', 'true');
});

/* Close Modal when clicking outside of the modal content */
window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
        helpModal.style.display = 'none';
        helpModal.setAttribute('aria-hidden', 'true');
    }
});
