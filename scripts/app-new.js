/* Enhanced quadra.calc JavaScript - Modern UI/UX Implementation */

/* =========================
   DOM Elements
========================= */
const calculateBtn = document.getElementById('calculate-btn');
const bpmInput = document.getElementById('bpm-input');
const bpmDisplay = document.getElementById('bpm-display');
const delayGrid = document.getElementById('delay-grid');
const copyBtn = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tapBtn = document.getElementById('tap-btn');
const tapFeedback = document.getElementById('tap-feedback');
const tapProgress = document.getElementById('tap-progress');
const tapRipple = document.getElementById('tap-ripple');
const tapCount = document.getElementById('tap-count');
const tapAccuracy = document.getElementById('tap-accuracy');
const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
const subdivisionNameInput = document.getElementById('subdivision-name');
const subdivisionFactorInput = document.getElementById('subdivision-factor');
const customSubdivisionsList = document.getElementById('custom-subdivisions-list');
const savePresetBtn = document.getElementById('save-preset-btn');
const presetNameInput = document.getElementById('preset-name');
const presetsList = document.getElementById('presets-list');
const notification = document.getElementById('notification');
const installBtn = document.getElementById('install-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpModal = document.getElementById('close-help-modal');
const delayPopup = document.getElementById('delay-popup');
const popupContent = document.getElementById('popup-content');
const resultsSection = document.getElementById('results-section');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedContent = document.getElementById('advanced-content');

// Beat visualization elements
const beatDots = ['beat-1', 'beat-2', 'beat-3', 'beat-4'].map(id => document.getElementById(id));

// Legacy table elements for compatibility
const suggestionsTable = document.getElementById('suggestions-table');
const customSubdivisionsTable = document.getElementById('custom-subdivisions-table');
const presetsTable = document.getElementById('presets-table');

/* =========================
   Application State Manager
========================= */
class AppState {
    constructor() {
        this.currentBpm = null;
        this.isCalculating = false;
        this.lastCalculationTime = 0;
        this.beatIndex = 0;
        this.isAdvancedOpen = false;
    }
    
    updateBpm(bpm) {
        if (bpm >= 30 && bpm <= 300) {
            this.currentBpm = bpm;
            this.updateBpmDisplay(bpm);
            return true;
        }
        return false;
    }
    
    updateBpmDisplay(bpm) {
        if (bpmDisplay) {
            bpmDisplay.textContent = bpm || '---';
            bpmDisplay.classList.add('updating');
            setTimeout(() => bpmDisplay.classList.remove('updating'), 300);
        }
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
        if (calculateBtn) {
            calculateBtn.classList.toggle('loading', calculating);
        }
    }
    
    updateBeatVisualization() {
        beatDots.forEach((dot, index) => {
            if (dot) {
                dot.classList.toggle('active', index === this.beatIndex);
            }
        });
        this.beatIndex = (this.beatIndex + 1) % 4;
    }
    
    resetBeatVisualization() {
        this.beatIndex = 0;
        beatDots.forEach(dot => {
            if (dot) dot.classList.remove('active');
        });
    }
}

const appState = new AppState();

/* =========================
   State Variables
========================= */
let customSubdivisions = [];
let presets = [];
let tapTimes = [];
let tapTimeout;
let beatVisualizationInterval;
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
                ).slice(0, 50);
            }
        }
    } catch (error) {
        console.warn('Failed to load presets from localStorage:', error);
    }
    return [];
}

presets = loadPresets();

/* =========================
   Initialization
========================= */
initializeTheme();
initializePresets();
initializePopup();
initializeKeyboardNavigation();
initializeAdvancedSection();
addTapResetButton();

/* =========================
   Theme Management
========================= */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', initialTheme);
    updateThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    if (!themeIcon) return;
    
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor"/>`;
    } else {
        themeIcon.innerHTML = `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>`;
    }
}

/* =========================
   Enhanced Delay Time Calculations
========================= */
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
        populateDelayCards(delayTimes);
        showResultsSection();
        showNotification('Delay times calculated successfully!', 'success');
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
    const beatDuration = 60000 / bpm;
    const standardSubdivisions = {
        // Simple Subdivisions
        'Whole Note (1/1)': { factor: 4, category: 'Simple', note: '4 beats' },
        'Half Note (1/2)': { factor: 2, category: 'Simple', note: '2 beats' },
        'Quarter Note (1/4)': { factor: 1, category: 'Simple', note: '1 beat' },
        'Eighth Note (1/8)': { factor: 0.5, category: 'Simple', note: '1/2 beat' },
        'Sixteenth Note (1/16)': { factor: 0.25, category: 'Simple', note: '1/4 beat' },
        'Thirty-Second Note (1/32)': { factor: 0.125, category: 'Simple', note: '1/8 beat' },

        // Compound Subdivisions
        'Dotted Half Note': { factor: 3, category: 'Dotted', note: '3 beats' },
        'Dotted Quarter Note': { factor: 1.5, category: 'Dotted', note: '1.5 beats' },
        'Dotted Eighth Note': { factor: 0.75, category: 'Dotted', note: '0.75 beats' },
        'Dotted Sixteenth Note': { factor: 0.375, category: 'Dotted', note: '0.375 beats' },
        
        // Corrected Triplet Subdivisions
        'Triplet Whole Note': { factor: 4/3, category: 'Triplet', note: '1.33 beats' },
        'Triplet Half Note': { factor: 2/3, category: 'Triplet', note: '0.67 beats' },
        'Triplet Quarter Note': { factor: 1/3, category: 'Triplet', note: '0.33 beats' },
        'Triplet Eighth Note': { factor: 1/6, category: 'Triplet', note: '0.17 beats' },
        
        // Quintuplet Subdivisions
        'Quintuplet Quarter Note': { factor: 0.8, category: 'Quintuplet', note: '0.8 beats' },
        'Quintuplet Eighth Note': { factor: 0.4, category: 'Quintuplet', note: '0.4 beats' },
        
        // Syncopated Subdivisions
        'Swing Eighth Note': { factor: 2/3, category: 'Swing', note: 'Swing feel' },
        'Shuffle Feel': { factor: 0.6, category: 'Swing', note: 'Shuffle groove' }
    };
    
    // Merge with custom subdivisions
    const allSubdivisions = { ...standardSubdivisions };
    customSubdivisions.forEach(sub => {
        allSubdivisions[sub.name] = { 
            factor: sub.factor, 
            category: 'Custom', 
            note: `${sub.factor}x quarter` 
        };
    });
    
    // Calculate delay times with proper rounding
    const delayTimes = {};
    for (const [subdivision, data] of Object.entries(allSubdivisions)) {
        const delay = beatDuration * data.factor;
        delayTimes[subdivision] = {
            ms: Math.round(delay * 100) / 100,
            category: data.category,
            note: data.note
        };
    }
    
    return delayTimes;
}

function populateDelayCards(delayTimes) {
    if (!delayGrid) return;
    
    delayGrid.innerHTML = '';
    
    // Group subdivisions by category
    const categories = ['Simple', 'Dotted', 'Triplet', 'Quintuplet', 'Swing', 'Custom'];
    
    categories.forEach(category => {
        const categoryItems = Object.entries(delayTimes).filter(([, data]) => data.category === category);
        
        if (categoryItems.length === 0) return;
        
        categoryItems.forEach(([subdivision, data]) => {
            const card = createDelayCard(subdivision, data);
            delayGrid.appendChild(card);
        });
    });
    
    // Add click listeners to delay cards
    addDelayCardEventListeners();
}

function createDelayCard(subdivision, data) {
    const card = document.createElement('div');
    card.className = 'delay-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Copy delay time for ${subdivision}, ${data.ms.toFixed(2)} milliseconds`);
    
    card.innerHTML = `
        <div class="delay-card-header">
            <div class="delay-subdivision">${subdivision}</div>
            <div class="delay-category">${data.category}</div>
        </div>
        <div class="delay-time">${data.ms.toFixed(2)} ms</div>
        <div class="delay-note">
            <svg class="delay-note-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${data.note}
        </div>
    `;
    
    return card;
}

function showResultsSection() {
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* =========================
   Enhanced Tap Tempo Functionality
========================= */
if (tapBtn) {
    tapBtn.addEventListener('click', handleTapTempo);
    
    // Add visual feedback for tap timing
    tapBtn.addEventListener('mousedown', () => {
        tapBtn.style.transform = 'scale(0.95)';
    });
    
    tapBtn.addEventListener('mouseup', () => {
        tapBtn.style.transform = '';
    });
    
    tapBtn.addEventListener('mouseleave', () => {
        tapBtn.style.transform = '';
    });
}

function handleTapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    
    // Visual feedback
    triggerTapRipple();
    appState.updateBeatVisualization();
    
    if (tapTimes.length > maxTaps) {
        tapTimes.shift();
    }
    
    if (tapTimeout) clearTimeout(tapTimeout);
    
    // Fixed timeout - wait 2 seconds after last tap to finalize
    const timeoutDuration = 2000; // Always 2 seconds
    
    tapTimeout = setTimeout(() => {
        finalizeTapTempo();
    }, timeoutDuration);

    // Only update feedback, don't calculate final BPM yet
    updateTapFeedback();
}

// New function to handle the final calculation when tapping stops
function finalizeTapTempo() {
    if (tapTimes.length >= 2) {
        // Update UI to show we're calculating
        if (tapFeedback) {
            tapFeedback.textContent = 'Calculating final BPM...';
            tapFeedback.classList.remove('tapping');
            tapFeedback.classList.add('calculating');
        }
        
        if (tapBtn) {
            tapBtn.classList.remove('tapping');
        }
        
        const finalBpm = calculateTapTempo();
        if (finalBpm && finalBpm >= 30 && finalBpm <= 300) {
            // Update UI to show completion
            if (tapFeedback) {
                tapFeedback.textContent = `Final BPM: ${finalBpm}`;
                tapFeedback.classList.remove('calculating');
                tapFeedback.classList.add('completed');
            }
            
            if (tapBtn) {
                tapBtn.classList.add('completed');
            }
            
            showNotification(`Tap tempo complete: ${finalBpm} BPM from ${tapTimes.length} taps`, 'success');
            
            // Auto-calculate delay times after a brief pause
            setTimeout(() => {
                debouncedCalculate();
            }, 800);
            
        } else {
            showNotification('Unable to calculate BPM from taps', 'error');
            resetTapTempo();
        }
    } else {
        showNotification('Need at least 2 taps to calculate BPM', 'error');
        resetTapTempo();
    }
}

function triggerTapRipple() {
    if (tapRipple) {
        tapRipple.classList.remove('active');
        setTimeout(() => tapRipple.classList.add('active'), 10);
        setTimeout(() => tapRipple.classList.remove('active'), 600);
    }
}

function calculateTapTempo() {
    if (tapTimes.length < 2) {
        return null;
    }
    
    // Calculate intervals between taps (in milliseconds)
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
    }
    
    console.log('Raw intervals (ms):', intervals);
    
    // Filter outliers if we have enough data
    let filteredIntervals = intervals;
    if (intervals.length >= 3) {
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
        
        // Remove intervals that are more than 50% away from median
        filteredIntervals = intervals.filter(interval => 
            Math.abs(interval - median) <= median * 0.5
        );
        
        // If we filtered out too many, use original
        if (filteredIntervals.length < 2) {
            filteredIntervals = intervals;
        }
        
        console.log('Filtered intervals (ms):', filteredIntervals);
        console.log('Median interval (ms):', median);
    }
    
    // Calculate average interval
    const avgInterval = filteredIntervals.reduce((a, b) => a + b, 0) / filteredIntervals.length;
    console.log('Average interval (ms):', avgInterval);
    
    // Convert to BPM: 60000ms per minute / interval in ms = BPM
    const bpm = Math.round(60000 / avgInterval);
    console.log('Calculated BPM:', bpm);
    
    // Calculate accuracy (timing consistency)
    // Method: Calculate how much each interval deviates from the average
    const variance = filteredIntervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / filteredIntervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to percentage: lower deviation = higher accuracy
    // If all intervals are exactly the same, accuracy = 100%
    // If intervals vary wildly, accuracy approaches 0%
    const coefficientOfVariation = (standardDeviation / avgInterval) * 100;
    const accuracy = Math.max(0, Math.min(100, 100 - coefficientOfVariation));
    
    console.log('Standard deviation (ms):', standardDeviation.toFixed(2));
    console.log('Coefficient of variation (%):', coefficientOfVariation.toFixed(2));
    
    console.log('Timing accuracy:', accuracy.toFixed(1) + '%');
    
    // Update UI
    if (bpm >= 30 && bpm <= 300) {
        if (bpmInput) bpmInput.value = bpm;
        appState.updateBpm(bpm);
        
        if (tapAccuracy) {
            tapAccuracy.textContent = `${accuracy.toFixed(0)}% accurate`;
        }
        
        startBeatVisualization(bpm);
        return bpm;
    } else {
        console.warn('BPM out of range:', bpm);
        return null;
    }
}

function updateTapFeedback() {
    if (tapFeedback) {
        // Remove all state classes
        tapFeedback.classList.remove('tapping', 'calculating', 'completed');
        
        if (tapTimes.length === 0) {
            tapFeedback.textContent = 'Tap to start';
            if (tapBtn) tapBtn.classList.remove('tapping', 'completed');
        } else if (tapTimes.length === 1) {
            tapFeedback.textContent = 'Keep tapping...';
            tapFeedback.classList.add('tapping');
            if (tapBtn) {
                tapBtn.classList.add('tapping');
                tapBtn.classList.remove('completed');
            }
        } else if (tapTimes.length >= 2) {
            // Show live estimate, but don't finalize
            const lastTwoInterval = tapTimes[tapTimes.length - 1] - tapTimes[tapTimes.length - 2];
            const estimatedBpm = Math.round(60000 / lastTwoInterval);
            
            tapFeedback.classList.add('tapping');
            if (tapBtn) {
                tapBtn.classList.add('tapping');
                tapBtn.classList.remove('completed');
            }
            
            // Only show estimate if it's reasonable
            if (estimatedBpm >= 30 && estimatedBpm <= 300) {
                tapFeedback.textContent = `~${estimatedBpm} BPM (release in 2s)`;
            } else {
                tapFeedback.textContent = 'Keep tapping in rhythm...';
            }
        }
    }
    
    if (tapCount) {
        tapCount.textContent = `${tapTimes.length} taps`;
    }
    
    // Update progress bar
    if (tapProgress) {
        const progress = Math.min((tapTimes.length / maxTaps) * 100, 100);
        tapProgress.style.width = progress + '%';
    }
    
    // Clear accuracy while tapping
    if (tapAccuracy && tapTimes.length > 0) {
        tapAccuracy.textContent = 'Will calculate when done...';
    }
}

function resetTapTempo() {
    tapTimes = [];
    appState.resetBeatVisualization();
    
    if (tapFeedback) {
        tapFeedback.textContent = 'Tap to start';
        tapFeedback.classList.remove('tapping', 'calculating', 'completed');
    }
    if (tapCount) tapCount.textContent = '0 taps';
    if (tapAccuracy) tapAccuracy.textContent = '';
    if (tapProgress) tapProgress.style.width = '0%';
    
    if (tapBtn) {
        tapBtn.classList.remove('tapping', 'completed');
    }
    
    stopBeatVisualization();
    
    console.log('Tap tempo reset');
}

// Add manual reset button functionality
function addTapResetButton() {
    if (tapBtn) {
        // Add double-click to reset (prevent during normal tapping)
        let lastClickTime = 0;
        
        tapBtn.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only allow reset if we haven't tapped in the last 3 seconds
            const now = performance.now();
            const timeSinceLastTap = tapTimes.length > 0 ? now - tapTimes[tapTimes.length - 1] : Infinity;
            
            if (timeSinceLastTap > 3000 || tapTimes.length === 0) {
                resetTapTempo();
                showNotification('Tap tempo reset (double-click)', 'success');
            } else {
                showNotification('Wait 3 seconds after tapping to reset', 'error');
            }
        });
        
        // Add long press to reset (mobile-friendly)
        let pressTimer;
        tapBtn.addEventListener('pointerdown', (e) => {
            pressTimer = setTimeout(() => {
                if (tapTimes.length > 0) {
                    resetTapTempo();
                    showNotification('Tap tempo reset (long press)', 'success');
                    e.preventDefault();
                }
            }, 1500); // 1.5 second long press
        });
        
        tapBtn.addEventListener('pointerup', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
        });
        
        tapBtn.addEventListener('pointerleave', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
        });
    }
}

function startBeatVisualization(bpm) {
    stopBeatVisualization();
    const beatInterval = 60000 / bpm;
    beatVisualizationInterval = setInterval(() => {
        appState.updateBeatVisualization();
    }, beatInterval);
}

function stopBeatVisualization() {
    if (beatVisualizationInterval) {
        clearInterval(beatVisualizationInterval);
        beatVisualizationInterval = null;
    }
}

/* =========================
   Enhanced Clipboard and Interaction
========================= */
function addDelayCardEventListeners() {
    const delayCards = document.querySelectorAll('.delay-card');
    delayCards.forEach(card => {
        card.addEventListener('click', () => handleDelayCardClick(card));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDelayCardClick(card);
            }
        });
    });
}

function handleDelayCardClick(card) {
    const delayTimeElement = card.querySelector('.delay-time');
    if (!delayTimeElement) return;
    
    const delayText = delayTimeElement.textContent;
    const delayMs = delayText.replace(' ms', '');
    const subdivision = card.querySelector('.delay-subdivision').textContent;
    
    // Validate the delay value
    const delayValue = parseFloat(delayMs);
    if (isNaN(delayValue) || delayValue <= 0) {
        showNotification('Invalid delay value.', 'error');
        return;
    }

    // Copy to clipboard
    copyToClipboard(delayMs, () => {
        showNotification(`Copied ${delayMs} ms to clipboard!`, 'success');
        
        // Visual feedback
        card.classList.add('copied');
        setTimeout(() => card.classList.remove('copied'), 1000);
        
        // Show popup
        showDelayPopup(delayMs);
    });
}

function copyToClipboard(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(callback)
            .catch(() => fallbackCopyTextToClipboard(text, callback));
    } else {
        fallbackCopyTextToClipboard(text, callback);
    }
}

function fallbackCopyTextToClipboard(text, callback) {
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
        if (successful && callback) {
            callback();
        } else {
            showNotification('Failed to copy delay time.', 'error');
        }
    } catch (err) {
        showNotification('Failed to copy delay time.', 'error');
    } finally {
        document.body.removeChild(textArea);
    }
}

// Copy all delay times
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const bpm = parseInt(bpmInput.value);
        if (isNaN(bpm) || bpm < 30 || bpm > 300) {
            showNotification('Please calculate delay times first.', 'error');
            return;
        }
        
        let textToCopy = `Delay Time Suggestions for ${bpm} BPM:\\n\\n`;
        const delayCards = document.querySelectorAll('.delay-card');
        
        delayCards.forEach(card => {
            const subdivision = card.querySelector('.delay-subdivision').textContent;
            const delay = card.querySelector('.delay-time').textContent;
            if (subdivision && delay) {
                textToCopy += `${subdivision}: ${delay}\\n`;
            }
        });
        
        textToCopy += `\\nGenerated by quadra.calc at ${new Date().toLocaleString()}`;
        
        copyToClipboard(textToCopy, () => {
            showNotification('All delay times copied to clipboard!', 'success');
        });
    });
}

/* =========================
   Advanced Features Section
========================= */
function initializeAdvancedSection() {
    if (advancedToggle) {
        advancedToggle.addEventListener('click', toggleAdvancedSection);
    }
}

function toggleAdvancedSection() {
    if (!advancedContent || !advancedToggle) return;
    
    const isOpen = appState.isAdvancedOpen;
    appState.isAdvancedOpen = !isOpen;
    
    advancedToggle.setAttribute('aria-expanded', appState.isAdvancedOpen.toString());
    
    if (appState.isAdvancedOpen) {
        advancedContent.style.display = 'block';
        setTimeout(() => {
            advancedContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } else {
        advancedContent.style.display = 'none';
    }
}

/* =========================
   Enhanced Custom Subdivisions Management
========================= */
if (addSubdivisionBtn) {
    addSubdivisionBtn.addEventListener('click', handleAddSubdivision);
}

function handleAddSubdivision() {
    const name = subdivisionNameInput?.value.trim();
    const factor = parseFloat(subdivisionFactorInput?.value);
    
    // Enhanced validation
    if (!name || name.length > 50) {
        showNotification('Please enter a valid subdivision name (1-50 characters).', 'error');
        return;
    }
    if (isNaN(factor) || factor <= 0 || factor > 10) {
        showNotification('Please enter a valid factor between 0.1 and 10.', 'error');
        return;
    }
    
    // Sanitize name input
    const sanitizedName = name.replace(/[<>\"'&]/g, '');
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
    if (subdivisionNameInput) subdivisionNameInput.value = '';
    if (subdivisionFactorInput) subdivisionFactorInput.value = '';
    
    updateCustomSubdivisionsList();
    
    // Auto-recalculate if we have a BPM
    if (appState.currentBpm) {
        debouncedCalculate();
    }
    
    showNotification('Custom subdivision added!', 'success');
}

function updateCustomSubdivisionsList() {
    if (!customSubdivisionsList) return;
    
    customSubdivisionsList.innerHTML = '';
    
    customSubdivisions.forEach((sub, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-name">${sub.name}</div>
                <div class="list-item-detail">Factor: ${sub.factor}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon danger" aria-label="Remove ${sub.name}" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add remove button listener
        const removeBtn = item.querySelector('.btn-icon');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Remove subdivision "${sub.name}"?`)) {
                customSubdivisions.splice(index, 1);
                updateCustomSubdivisionsList();
                if (appState.currentBpm) {
                    debouncedCalculate();
                }
                showNotification('Custom subdivision removed!', 'success');
            }
        });
        
        customSubdivisionsList.appendChild(item);
    });
}

/* =========================
   Enhanced Presets Management
========================= */
if (savePresetBtn) {
    savePresetBtn.addEventListener('click', handleSavePreset);
}

function handleSavePreset() {
    const name = presetNameInput?.value.trim();
    const bpm = parseInt(bpmInput?.value);
    
    // Enhanced validation
    if (!name || name.length > 30) {
        showNotification('Please enter a valid preset name (1-30 characters).', 'error');
        return;
    }
    if (isNaN(bpm) || bpm < 30 || bpm > 300) {
        showNotification('Please enter a valid BPM between 30 and 300.', 'error');
        return;
    }
    
    // Sanitize name input
    const sanitizedName = name.replace(/[<>\"'&]/g, '');
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
        if (presetNameInput) presetNameInput.value = '';
        updatePresetsList();
        showNotification('Preset saved successfully!', 'success');
    } catch (error) {
        showNotification('Failed to save preset. Storage may be full.', 'error');
        presets.pop();
    }
}

function updatePresetsList() {
    if (!presetsList) return;
    
    presetsList.innerHTML = '';
    
    presets.forEach((preset, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-name">${preset.name}</div>
                <div class="list-item-detail">${preset.bpm} BPM</div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" aria-label="Load preset ${preset.name}" data-action="load" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L8 6h3v6h2V6h3l-4-4zM5 18v-2h14v2H5z"/>
                    </svg>
                </button>
                <button class="btn-icon danger" aria-label="Delete preset ${preset.name}" data-action="delete" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add button listeners
        const buttons = item.querySelectorAll('.btn-icon');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const idx = parseInt(btn.dataset.index);
                
                if (action === 'load') {
                    loadPreset(idx);
                } else if (action === 'delete') {
                    deletePreset(idx);
                }
            });
        });
        
        presetsList.appendChild(item);
    });
}

function loadPreset(index) {
    const preset = presets[index];
    if (!preset) return;
    
    try {
        // Validate preset data
        if (!preset.bpm || preset.bpm < 30 || preset.bpm > 300) {
            showNotification('Invalid BPM in preset.', 'error');
            return;
        }
        
        if (bpmInput) bpmInput.value = preset.bpm;
        appState.updateBpm(preset.bpm);
        
        // Safely load custom subdivisions
        if (Array.isArray(preset.customSubdivisions)) {
            customSubdivisions = preset.customSubdivisions.filter(sub => 
                sub && typeof sub.name === 'string' && typeof sub.factor === 'number' &&
                sub.factor > 0 && sub.factor <= 10
            );
        } else {
            customSubdivisions = [];
        }
        
        updateCustomSubdivisionsList();
        debouncedCalculate();
        showNotification(`Preset "${preset.name}" loaded!`, 'success');
    } catch (error) {
        showNotification('Failed to load preset.', 'error');
    }
}

function deletePreset(index) {
    const preset = presets[index];
    if (!preset) return;
    
    if (confirm(`Are you sure you want to delete preset "${preset.name}"?`)) {
        try {
            presets.splice(index, 1);
            localStorage.setItem('delay_presets', JSON.stringify(presets));
            updatePresetsList();
            showNotification('Preset deleted.', 'success');
        } catch (error) {
            showNotification('Failed to delete preset.', 'error');
        }
    }
}

function initializePresets() {
    updatePresetsList();
    
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
   Enhanced Notification System
========================= */
let notificationTimeout;

function showNotification(message, type = 'success', duration = 3000) {
    if (!notification) return;
    
    // Clear any existing notification
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notification.classList.remove('show');
    }
    
    // Sanitize message
    const sanitizedMessage = String(message).replace(/[<>\"'&]/g, '');
    
    notification.textContent = sanitizedMessage;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notificationTimeout = null;
    }, Math.max(1000, Math.min(10000, duration)));
}

/* =========================
   Enhanced Pop-up System
========================= */
function initializePopup() {
    if (delayPopup) {
        delayPopup.addEventListener('click', hideDelayPopup);
    }
}

function showDelayPopup(delayMs) {
    if (!delayPopup || !popupContent) return;
    
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
    iconSvg.setAttribute('fill', 'var(--success-500)');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z');
    iconSvg.appendChild(path);
    
    const span = document.createElement('span');
    span.textContent = `${delay.toFixed(2)} ms`;
    
    // Clear and populate popup content
    popupContent.innerHTML = '';
    popupContent.appendChild(iconSvg);
    popupContent.appendChild(span);
    
    delayPopup.setAttribute('aria-hidden', 'false');
    delayPopup.style.display = 'block';
    
    // Auto-hide after 2 seconds
    setTimeout(hideDelayPopup, 2000);
}

function hideDelayPopup() {
    if (delayPopup) {
        delayPopup.setAttribute('aria-hidden', 'true');
        delayPopup.style.display = 'none';
    }
}

/* =========================
   Keyboard Navigation and Accessibility
========================= */
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to calculate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (bpmInput?.value) {
                handleCalculate();
            }
        }
        
        // Space to tap tempo when focused on tap button
        if (e.key === ' ' && document.activeElement === tapBtn) {
            e.preventDefault();
            handleTapTempo();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (helpModal?.getAttribute('aria-hidden') === 'false') {
                hideHelpModal();
            }
            if (delayPopup?.getAttribute('aria-hidden') === 'false') {
                hideDelayPopup();
            }
        }
        
        // T to focus tap button
        if (e.key === 't' && !isInputFocused()) {
            e.preventDefault();
            tapBtn?.focus();
        }
        
        // B to focus BPM input
        if (e.key === 'b' && !isInputFocused()) {
            e.preventDefault();
            bpmInput?.focus();
        }
    });
}

function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
}

/* =========================
   Event Listeners
========================= */
if (calculateBtn) {
    calculateBtn.addEventListener('click', handleCalculate);
}

if (bpmInput) {
    bpmInput.addEventListener('input', debouncedCalculate);
}

/* =========================
   Help Modal Functionality
========================= */
if (helpBtn) {
    helpBtn.addEventListener('click', showHelpModal);
}

if (closeHelpModal) {
    closeHelpModal.addEventListener('click', hideHelpModal);
}

function showHelpModal() {
    if (helpModal) {
        helpModal.style.display = 'flex';
        helpModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function hideHelpModal() {
    if (helpModal) {
        helpModal.style.display = 'none';
        helpModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking outside
if (helpModal) {
    helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            hideHelpModal();
        }
    });
}

/* =========================
   Enhanced PWA Install Functionality
========================= */

// PWA Install Management
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isStandalone = false;
        
        this.init();
    }
    
    init() {
        this.checkInstallStatus();
        this.setupEventListeners();
        this.createInstallPrompt();
    }
    
    checkInstallStatus() {
        // Check if running as PWA
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;
        
        if (this.isStandalone) {
            console.log('🚀 Running as installed PWA');
            document.body.classList.add('pwa-mode');
            this.hideInstallButton();
        }
        
        // Check if already installed (rough detection)
        this.isInstalled = this.isStandalone || 
                          localStorage.getItem('pwa-installed') === 'true';
    }
    
    setupEventListeners() {
        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 PWA install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        // Listen for successful installation
        window.addEventListener('appinstalled', (e) => {
            console.log('✅ PWA installed successfully');
            this.handleInstallSuccess();
        });
        
        // Network status monitoring
        window.addEventListener('online', () => {
            this.hideOfflineIndicator();
        });
        
        window.addEventListener('offline', () => {
            this.showOfflineIndicator();
        });
    }
    
    createInstallPrompt() {
        // Create custom install prompt overlay
        const promptHtml = `
            <div id="pwa-install-prompt" class="pwa-install-prompt">
                <div class="pwa-install-prompt-content">
                    <div class="pwa-install-prompt-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L8 6h3v6h2V6h3l-4-4zM5 18v-2h14v2H5z"/>
                        </svg>
                    </div>
                    <div class="pwa-install-prompt-text">
                        <div class="pwa-install-prompt-title">Install quadra.calc</div>
                        <div class="pwa-install-prompt-subtitle">Get instant access and offline support</div>
                    </div>
                </div>
                <div class="pwa-install-prompt-actions">
                    <button class="btn-install-accept">Install</button>
                    <button class="btn-install-dismiss">Later</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHtml);
        
        // Add event listeners
        const prompt = document.getElementById('pwa-install-prompt');
        const acceptBtn = prompt?.querySelector('.btn-install-accept');
        const dismissBtn = prompt?.querySelector('.btn-install-dismiss');
        
        acceptBtn?.addEventListener('click', () => this.triggerInstall());
        dismissBtn?.addEventListener('click', () => this.dismissInstallPrompt());
    }
    
    showInstallButton() {
        if (installBtn && !this.isInstalled) {
            installBtn.style.display = 'flex';
            installBtn.classList.add('pulse');
            
            // Show custom prompt after delay
            setTimeout(() => {
                this.showInstallPrompt();
            }, 3000);
            
            showNotification('Install quadra.calc for the best experience!', 'success', 5000);
        }
    }
    
    hideInstallButton() {
        if (installBtn) {
            installBtn.style.display = 'none';
            installBtn.classList.remove('pulse');
        }
    }
    
    showInstallPrompt() {
        const prompt = document.getElementById('pwa-install-prompt');
        if (prompt && !this.isInstalled) {
            prompt.classList.add('show');
        }
    }
    
    dismissInstallPrompt() {
        const prompt = document.getElementById('pwa-install-prompt');
        if (prompt) {
            prompt.classList.remove('show');
        }
        
        // Don't show again for this session
        sessionStorage.setItem('install-prompt-dismissed', 'true');
    }
    
    async triggerInstall() {
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                console.log('🎯 Install prompt result:', outcome);
                
                if (outcome === 'accepted') {
                    this.handleInstallSuccess();
                } else {
                    showNotification('Installation canceled', 'error');
                    this.dismissInstallPrompt();
                }
                
                this.deferredPrompt = null;
                
            } catch (error) {
                console.error('❌ Install prompt error:', error);
                showNotification('Installation failed', 'error');
            }
        }
    }
    
    handleInstallSuccess() {
        this.isInstalled = true;
        localStorage.setItem('pwa-installed', 'true');
        
        this.hideInstallButton();
        this.dismissInstallPrompt();
        
        showNotification('🎉 quadra.calc installed successfully!', 'success');
        
        // Add PWA badge to footer
        this.addPWABadge();
    }
    
    addPWABadge() {
        const footer = document.querySelector('.app-footer');
        if (footer && !footer.querySelector('.pwa-badge')) {
            const badge = document.createElement('div');
            badge.className = 'pwa-badge';
            badge.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Installed as PWA
            `;
            footer.appendChild(badge);
        }
    }
    
    showOfflineIndicator() {
        let indicator = document.getElementById('offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.className = 'offline-indicator';
            indicator.textContent = '📶 You\'re offline - using cached version';
            document.body.appendChild(indicator);
        }
        indicator.classList.add('show');
    }
    
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }
}

// Initialize PWA installer
const pwaInstaller = new PWAInstaller();

// Legacy install button support
if (installBtn) {
    installBtn.addEventListener('click', () => {
        pwaInstaller.triggerInstall();
    });
}

/* =========================
   Utility Functions
========================= */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/* =========================
   Legacy Support Functions (for compatibility)
========================= */
// These functions maintain compatibility with existing functionality
function populateSuggestions(delayTimes) {
    // This maintains compatibility with any legacy code
    populateDelayCards(delayTimes);
}

function updateCustomSubdivisionsTable() {
    updateCustomSubdivisionsList();
}

function updatePresetsTable() {
    updatePresetsList();
}

// Populate legacy tables if they exist (for backward compatibility)
function populateLegacyTables(delayTimes) {
    if (suggestionsTable?.querySelector('tbody')) {
        const tbody = suggestionsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        Object.entries(delayTimes).forEach(([subdivision, data]) => {
            const row = tbody.insertRow();
            row.classList.add('clickable-row');
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.textContent = subdivision;
            cell2.textContent = `${data.ms.toFixed(2)} ms`;
        });
    }
}

// Math verification function for development
function testBpmMath() {
    console.log('=== BPM Math Verification ===');
    
    // Test cases: [interval_ms, expected_bpm]
    const testCases = [
        [500, 120],   // 500ms interval = 120 BPM
        [600, 100],   // 600ms interval = 100 BPM  
        [400, 150],   // 400ms interval = 150 BPM
        [1000, 60],   // 1000ms interval = 60 BPM
        [300, 200],   // 300ms interval = 200 BPM
    ];
    
    testCases.forEach(([interval, expectedBpm]) => {
        const calculatedBpm = Math.round(60000 / interval);
        const isCorrect = calculatedBpm === expectedBpm;
        console.log(`${interval}ms → ${calculatedBpm} BPM (expected ${expectedBpm}) ${isCorrect ? '✅' : '❌'}`);
    });
    
    console.log('=== End Verification ===');
}

// Run math test in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    testBpmMath();
}

console.log('🎵 quadra.calc enhanced UI/UX with PWA support loaded successfully!');

// Service Worker messaging
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Request cache cleanup periodically
    setInterval(() => {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_CLEANUP'
        });
    }, 300000); // Every 5 minutes
}