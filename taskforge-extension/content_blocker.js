(function(){
  const ID = 'tf-block-overlay';
  if (document.getElementById(ID)) return; // avoid duplicates
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    backdropFilter: 'blur(10px)',
    animation: 'tfFadeIn 0.3s ease-out'
  });

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tfFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes tfPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes tfFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    .tf-focus-card {
      background: linear-gradient(135deg, #1a1a1a 0%, #222222 100%);
      border: 1px solid #2a2a2a;
      border-radius: 24px;
      padding: 32px;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      position: relative;
      overflow: hidden;
    }
    
    .tf-focus-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #10b981, #f59e0b);
    }
    
    .tf-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: tfFloat 3s ease-in-out infinite;
    }
    
    .tf-title {
      font-size: 20px;
      font-weight: 600;
      color: #a0a0a0;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .tf-message {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #fff, #a0a0a0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .tf-description {
      font-size: 16px;
      color: #a0a0a0;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    
    .tf-button {
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .tf-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }
    
    .tf-button:active {
      transform: translateY(0);
    }
    
    .tf-stats {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #2a2a2a;
    }
    
    .tf-stat {
      text-align: center;
    }
    
    .tf-stat-value {
      font-size: 24px;
      font-weight: 800;
      color: #6366f1;
    }
    
    .tf-stat-label {
      font-size: 12px;
      color: #a0a0a0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
  `;
  document.head.appendChild(style);

  // Create focus card content
  overlay.innerHTML = `
    <div class="tf-focus-card">
      <div class="tf-icon">🎯</div>
      <div class="tf-title">TaskForge Focus Mode</div>
      <div class="tf-message">Stay on task</div>
      <div class="tf-description">
        This site is blocked during your focus session.<br>
        Complete your Pomodoro to unlock.
      </div>
      <button class="tf-button" id="tf-open">
        Open TaskForge
      </button>
      <div class="tf-stats">
        <div class="tf-stat">
          <div class="tf-stat-value" id="tf-credits">0</div>
          <div class="tf-stat-label">Credits</div>
        </div>
        <div class="tf-stat">
          <div class="tf-stat-value" id="tf-streak">0d</div>
          <div class="tf-stat-label">Streak</div>
        </div>
        <div class="tf-stat">
          <div class="tf-stat-value" id="tf-session">25m</div>
          <div class="tf-stat-label">Session</div>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  // Add button functionality
  document.getElementById('tf-open').addEventListener('click', () => {
    chrome.runtime.sendMessage({type: 'OPEN_POPUP'});
  });

  // Update stats from storage
  async function updateStats() {
    try {
      const data = await chrome.storage.local.get(['stats', 'pomodoro', 'settings']);
      const stats = data.stats || {};
      const pomodoro = data.pomodoro || {};
      const settings = data.settings || {};
      
      // Update credits
      const creditsEl = document.getElementById('tf-credits');
      if (creditsEl) {
        creditsEl.textContent = stats.creditsThisMonth || 0;
      }
      
      // Update streak
      const streakEl = document.getElementById('tf-streak');
      if (streakEl) {
        streakEl.textContent = (stats.streakDays || 0) + 'd';
      }
      
      // Update session time
      const sessionEl = document.getElementById('tf-session');
      if (sessionEl && pomodoro.active) {
        const remainingMs = Math.max(0, pomodoro.endAt - Date.now());
        const minutes = Math.ceil(remainingMs / 60000);
        sessionEl.textContent = minutes + 'm';
      }
    } catch (error) {
      console.log('Could not update stats:', error);
    }
  }

  // Update stats every 30 seconds
  updateStats();
  setInterval(updateStats, 30000);

  // Handle unblock message
  const handler = (msg) => {
    if (msg?.type === 'TF_UNBLOCK') {
      overlay.style.animation = 'tfFadeIn 0.3s ease-out reverse';
      setTimeout(() => {
        overlay.remove();
        chrome.runtime.onMessage.removeListener(handler);
        style.remove();
      }, 300);
    }
  };
  
  chrome.runtime.onMessage.addListener(handler);
})();
