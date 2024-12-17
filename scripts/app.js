/* scripts/app.js */

/* DOM Elements */
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

/* State Variables */
let customSubdivisions = [];
let presets = JSON.parse(localStorage.getItem('delay_presets')) || [];
let tapTimes = [];
let tapTimeout;
const maxTaps = 8;
let deferredPrompt;

/* Initialize Theme based on user's system preference or default to dark */
const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
document.body.setAttribute('data-theme', userPrefersDark ? 'dark' : 'light');
updateThemeIcon();

/* Function to Update Theme Icon */
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

/* Function to Show Notifications */
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/* Theme Toggle Functionality */
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    updateThemeIcon();
});

/* Calculate Delay Times */
calculateBtn.addEventListener('click', () => {
    const bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm <= 0) {
        showNotification('Please enter a valid BPM.', 'error');
        return;
    }
    const delayTimes = calculateDelayTimes(bpm);
    populateSuggestions(delayTimes);
    showNotification('Delay times calculated successfully!');
});

/* Function to Calculate Delay Times */
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
        'Dotted Half Note (3/4)': 3,
        'Dotted Quarter Note (3/8)': 1.5,
        'Dotted Eighth Note (3/16)': 0.75,
        'Triplet Whole Note (2/3)': 2.6667,
        'Triplet Half Note (2/3)': 1.3333,
        'Triplet Quarter Note (2/3)': 0.6667,
        'Triplet Eighth Note (2/3)': 0.3333,
        'Triplet Sixteenth Note (2/3)': 0.1667
    };
    let allSubdivisions = { ...standardSubdivisions };
    customSubdivisions.forEach(sub => {
        allSubdivisions[sub.name] = sub.factor;
    });
    const delayTimes = {};
    for (const [subdivision, factor] of Object.entries(allSubdivisions)) {
        delayTimes[subdivision] = beatDuration * factor;
    }
    return delayTimes;
}

/* Function to Populate Suggestions Table with Categories */
function populateSuggestions(delayTimes) {
    suggestionsTable.innerHTML = '';
    const simpleSubdivisions = {
        'Whole Note (1/1)': 4,
        'Half Note (1/2)': 2,
        'Quarter Note (1/4)': 1,
        'Eighth Note (1/8)': 0.5,
        'Sixteenth Note (1/16)': 0.25,
        'Thirty-Second Note (1/32)': 0.125
    };
    const compoundSubdivisions = {
        'Dotted Half Note (3/4)': 3,
        'Dotted Quarter Note (3/8)': 1.5,
        'Dotted Eighth Note (3/16)': 0.75,
        'Triplet Whole Note (2/3)': 2.6667,
        'Triplet Half Note (2/3)': 1.3333,
        'Triplet Quarter Note (2/3)': 0.6667,
        'Triplet Eighth Note (2/3)': 0.3333,
        'Triplet Sixteenth Note (2/3)': 0.1667
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
        }
        for (const [subdivision, factor] of Object.entries(subdivisions)) {
            const ms = (60000 / bpmInput.value) * factor;
            const row = suggestionsTable.insertRow();
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
    customSubdivisions.forEach(sub => {
        const ms = (60000 / bpmInput.value) * sub.factor;
        const row = suggestionsTable.insertRow();
        const cellSubdivision = row.insertCell(0);
        const cellMs = row.insertCell(1);
        cellSubdivision.textContent = sub.name;
        cellMs.textContent = ms.toFixed(2) + ' ms';
    });
}

/* Copy to Clipboard Functionality */
copyBtn.addEventListener('click', () => {
    let textToCopy = 'Delay Time Suggestions:\n';
    const rows = suggestionsTable.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
            textToCopy += `${cells[0].textContent}: ${cells[1].textContent}\n`;
        }
    });
    navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('Delay times copied to clipboard!');
    }).catch(() => {
        showNotification('Failed to copy delay times.', 'error');
    });
});

/* Tap Tempo Functionality */
tapBtn.addEventListener('click', () => {
    const now = Date.now();
    tapTimes.push(now);
    if (tapTimes.length > maxTaps) {
        tapTimes.shift();
    }
    if (tapTimeout) clearTimeout(tapTimeout);
    tapTimeout = setTimeout(() => {
        tapTimes = [];
        tapFeedback.textContent = 'Tap the button in time to set BPM.';
        tapProgress.style.width = '0%';
    }, 1500); // Reset taps if no tap within 1.5 seconds

    if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) {
            intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);
        bpmInput.value = bpm;
        tapFeedback.textContent = `BPM set to ${bpm}`;
        const delayTimes = calculateDelayTimes(bpm);
        populateSuggestions(delayTimes);
        showNotification('BPM set via Tap Tempo!');
        // Visual Indicator
        const progress = Math.min((avgInterval / 2000) * 100, 100); // Max interval 2s
        tapProgress.style.width = progress + '%';
    } else {
        tapFeedback.textContent = 'Keep tapping...';
        tapProgress.style.width = '20%';
    }
});

/* Add Custom Subdivision */
addSubdivisionBtn.addEventListener('click', () => {
    const name = subdivisionNameInput.value.trim();
    const factor = parseFloat(subdivisionFactorInput.value);
    if (name === '' || isNaN(factor) || factor <= 0) {
        showNotification('Please enter a valid subdivision name and factor.', 'error');
        return;
    }
    // Check for duplicate names
    if (customSubdivisions.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Subdivision name already exists.', 'error');
        return;
    }
    customSubdivisions.push({ name, factor });
    subdivisionNameInput.value = '';
    subdivisionFactorInput.value = '';
    updateCustomSubdivisionsTable();
    if (bpmInput.value) {
        const bpm = parseInt(bpmInput.value);
        const delayTimes = calculateDelayTimes(bpm);
        populateSuggestions(delayTimes);
    }
    showNotification('Custom subdivision added!');
});

/* Function to Update Custom Subdivisions Table */
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
        removeBtn.addEventListener('click', () => {
            customSubdivisions.splice(index, 1);
            updateCustomSubdivisionsTable();
            const bpm = parseInt(bpmInput.value);
            if (bpm && bpm > 0) {
                const delayTimes = calculateDelayTimes(bpm);
                populateSuggestions(delayTimes);
            }
            showNotification('Custom subdivision removed!');
        });

        cellAction.appendChild(removeBtn);
    });
}

/* Save Preset */
savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    const bpm = parseInt(bpmInput.value);
    if (name === '' || isNaN(bpm) || bpm <= 0) {
        showNotification('Please enter a valid preset name and BPM.', 'error');
        return;
    }
    // Check for duplicate preset names
    if (presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Preset name already exists.', 'error');
        return;
    }
    const preset = { name, bpm, customSubdivisions };
    presets.push(preset);
    localStorage.setItem('delay_presets', JSON.stringify(presets));
    presetNameInput.value = '';
    updatePresetsTable();
    showNotification('Preset saved successfully!');
});

/* Function to Update Presets Table */
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
        loadBtn.addEventListener('click', () => {
            bpmInput.value = preset.bpm;
            customSubdivisions = JSON.parse(JSON.stringify(preset.customSubdivisions));
            updateCustomSubdivisionsTable();
            const delayTimes = calculateDelayTimes(preset.bpm);
            populateSuggestions(delayTimes);
            showNotification(`Preset "${preset.name}" loaded!`);
        });

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('action-button');
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete preset "${preset.name}"?`)) {
                presets.splice(index, 1);
                localStorage.setItem('delay_presets', JSON.stringify(presets));
                updatePresetsTable();
                showNotification('Preset deleted.');
            }
        });

        // Action Buttons Container
        const actionContainer = document.createElement('div');
        actionContainer.appendChild(loadBtn);
        actionContainer.appendChild(deleteBtn);
        cellAction.appendChild(actionContainer);
    });
}

/* Initialize Presets Table on Load */
updatePresetsTable();

/* Initialize with Default BPM if Present */
window.addEventListener('load', () => {
    if (bpmInput.value) {
        const bpm = parseInt(bpmInput.value);
        if (!isNaN(bpm) && bpm > 0) {
            const delayTimes = calculateDelayTimes(bpm);
            populateSuggestions(delayTimes);
        }
    }
});

/* Listen for beforeinstallprompt Event to Show Install Button */
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
