async function send(msg) { 
  return await chrome.runtime.sendMessage(msg); 
}

const get = (keys) => new Promise(res => chrome.storage.local.get(keys, res));
const set = (obj) => new Promise(res => chrome.storage.local.set(obj, res));

// Enhanced settings management
let currentSettings = {};

async function load() {
  try {
    const { settings } = await get(["settings"]);
    currentSettings = settings || {};
    
    // Load form values
    document.getElementById('workMin').value = currentSettings.workMin || 25;
    document.getElementById('breakMin').value = currentSettings.breakMin || 5;
    document.getElementById('cap').value = currentSettings.dailyEscalationCap || 6;
    document.getElementById('blocked').value = (currentSettings.blockedSites || []).join('\n');
    document.getElementById('blockEnabled').checked = currentSettings.siteBlockEnabled !== false;
    document.getElementById('notifEnabled').checked = currentSettings.notificationsEnabled !== false;
    document.getElementById('soundEnabled').checked = currentSettings.soundEnabled !== false;
    
    // Set accent color
    const accent = currentSettings.accent || 'blue';
    updateColorSelection(accent);
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

function updateColorSelection(color) {
  // Remove active class from all color options
  document.querySelectorAll('.color-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to selected color
  const selectedOption = document.querySelector(`[data-color="${color}"]`);
  if (selectedOption) {
    selectedOption.classList.add('active');
  }
}

async function save() {
  try {
    const blocked = document.getElementById('blocked').value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    
    const selectedColor = document.querySelector('.color-option.active')?.dataset.color || 'blue';
    
    const settings = {
      accent: selectedColor,
      workMin: Number(document.getElementById('workMin').value) || 25,
      breakMin: Number(document.getElementById('breakMin').value) || 5,
      dailyEscalationCap: Number(document.getElementById('cap').value) || 6,
      blockedSites: blocked,
      siteBlockEnabled: document.getElementById('blockEnabled').checked,
      notificationsEnabled: document.getElementById('notifEnabled').checked,
      soundEnabled: document.getElementById('soundEnabled').checked
    };
    
    // Update both storage and background
    await send({ type: 'UPDATE_SETTINGS', settings });
    await set({ settings });
    
    currentSettings = settings;
    showStatus('Settings saved successfully!', 'success');
    
    // Update CSS variables for immediate visual feedback
    updateAccentColor(selectedColor);
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

async function reset() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  try {
    const defaultSettings = {
      accent: 'blue',
      workMin: 25,
      breakMin: 5,
      dailyEscalationCap: 6,
      blockedSites: ['youtube.com', 'twitter.com', 'reddit.com'],
      siteBlockEnabled: true,
      notificationsEnabled: true,
      soundEnabled: false
    };
    
    // Update both storage and background
    await send({ type: 'UPDATE_SETTINGS', settings: defaultSettings });
    await set({ settings: defaultSettings });
    
    currentSettings = defaultSettings;
    
    // Reload form with defaults
    await load();
    showStatus('Settings reset to defaults', 'success');
    
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus('Failed to reset settings', 'error');
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type} show`;
  
  setTimeout(() => {
    status.classList.remove('show');
  }, 3000);
}

function updateAccentColor(color) {
  const root = document.documentElement;
  const colorMap = {
    blue: { primary: '#3b82f6', secondary: '#1d4ed8' },
    green: { primary: '#10b981', secondary: '#059669' },
    orange: { primary: '#f59e0b', secondary: '#d97706' },
    purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
    pink: { primary: '#ec4899', secondary: '#db2777' }
  };
  
  const colors = colorMap[color] || colorMap.blue;
  root.style.setProperty('--accent', colors.primary);
  root.style.setProperty('--accent-hover', colors.secondary);
}

// Enhanced form validation
function validateForm() {
  const workMin = Number(document.getElementById('workMin').value);
  const breakMin = Number(document.getElementById('breakMin').value);
  const cap = Number(document.getElementById('cap').value);
  
  let isValid = true;
  let message = '';
  
  if (workMin < 5 || workMin > 120) {
    message = 'Work duration must be between 5 and 120 minutes';
    isValid = false;
  } else if (breakMin < 1 || breakMin > 60) {
    message = 'Break duration must be between 1 and 60 minutes';
    isValid = false;
  } else if (cap < 1 || cap > 20) {
    message = 'Daily reminder limit must be between 1 and 20';
    isValid = false;
  }
  
  if (!isValid) {
    showStatus(message, 'error');
  }
  
  return isValid;
}

// Event listeners
function setupEventListeners() {
  // Color picker
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      const color = option.dataset.color;
      updateColorSelection(color);
      updateAccentColor(color);
    });
  });
  
  // Save button
  document.getElementById('save').addEventListener('click', () => {
    if (validateForm()) {
      save();
    }
  });
  
  // Reset button
  document.getElementById('reset').addEventListener('click', reset);
  
  // Form validation on input
  document.getElementById('workMin').addEventListener('input', validateForm);
  document.getElementById('breakMin').addEventListener('input', validateForm);
  document.getElementById('cap').addEventListener('input', validateForm);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        if (validateForm()) save();
      }
    }
  });
  
  // Auto-save on certain changes
  document.getElementById('blockEnabled').addEventListener('change', () => {
    if (validateForm()) save();
  });
  
  document.getElementById('notifEnabled').addEventListener('change', () => {
    if (validateForm()) save();
  });
  
  document.getElementById('soundEnabled').addEventListener('change', () => {
    if (validateForm()) save();
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  load();
});
