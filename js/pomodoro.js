document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const timerSelection = document.getElementById("timer-selection");
  const timerDisplay = document.getElementById("timer-display");
  const timeDisplay = document.getElementById("time-display");
  const startPauseBtn = document.getElementById("start-pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const durationButtons = document.querySelectorAll(".duration-btn");
  const alarmNotification = document.getElementById("alarm-notification");
  const stopAlarmBtn = document.getElementById("stop-alarm-btn");
  const timerProgress = document.querySelector(".timer-progress");

  // Timer State
  let timerState = {
    selectedMinutes: null,
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    intervalId: null,
    alarmTimeout: null,
    audioContext: null,
    oscillator: null
  };

  // Constants
  const CIRCUMFERENCE = 2 * Math.PI * 90; // radius = 90

  // Utility Functions
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(timerState.remainingSeconds);
    
    // Update circular progress
    const progress = (timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds;
    const offset = CIRCUMFERENCE * (1 - progress);
    timerProgress.style.strokeDashoffset = offset;
  }

  function startTimer() {
    if (timerState.remainingSeconds <= 0) return;
    
    timerState.isRunning = true;
    startPauseBtn.textContent = "Pause";
    
    timerState.intervalId = setInterval(() => {
      timerState.remainingSeconds--;
      updateDisplay();
      
      if (timerState.remainingSeconds <= 0) {
        stopTimer();
        triggerAlarm();
      }
    }, 1000);
    
    // Track timer start
    if (typeof gtag === 'function') {
      gtag('event', 'timer_started', {
        duration_minutes: timerState.selectedMinutes
      });
    }
  }

  function pauseTimer() {
    timerState.isRunning = false;
    startPauseBtn.textContent = "Resume";
    
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
  }

  function stopTimer() {
    timerState.isRunning = false;
    startPauseBtn.textContent = "Start";
    
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
  }

  function resetTimer() {
    stopTimer();
    timerState.remainingSeconds = timerState.totalSeconds;
    updateDisplay();
    
    // Track timer reset
    if (typeof gtag === 'function') {
      gtag('event', 'timer_reset', {
        duration_minutes: timerState.selectedMinutes
      });
    }
  }

  function triggerAlarm() {
    // Show alarm notification
    alarmNotification.style.display = "flex";
    
    // Start playing sound
    playAlarmSound();
    
    // Auto-stop alarm after 30 seconds
    timerState.alarmTimeout = setTimeout(() => {
      stopAlarm();
    }, 30000);
    
    // Track timer completion
    if (typeof gtag === 'function') {
      gtag('event', 'timer_completed', {
        duration_minutes: timerState.selectedMinutes
      });
    }
  }

  function playAlarmSound() {
    try {
      // Create audio context for beep sound
      timerState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      timerState.oscillator = timerState.audioContext.createOscillator();
      const gainNode = timerState.audioContext.createGain();
      
      timerState.oscillator.connect(gainNode);
      gainNode.connect(timerState.audioContext.destination);
      
      timerState.oscillator.frequency.value = 800; // Hz
      timerState.oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, timerState.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, timerState.audioContext.currentTime + 0.5);
      
      timerState.oscillator.start();
      timerState.oscillator.stop(timerState.audioContext.currentTime + 0.5);
      
      // Repeat beep every 0.6 seconds
      const beepInterval = setInterval(() => {
        if (!timerState.oscillator || timerState.audioContext.state === 'closed') {
          clearInterval(beepInterval);
          return;
        }
        
        const osc = timerState.audioContext.createOscillator();
        const gain = timerState.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(timerState.audioContext.destination);
        
        osc.frequency.value = 800;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, timerState.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, timerState.audioContext.currentTime + 0.5);
        
        osc.start();
        osc.stop(timerState.audioContext.currentTime + 0.5);
      }, 600);
      
      // Store interval for cleanup
      timerState.beepInterval = beepInterval;
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }

  function stopAlarm() {
    // Hide alarm notification
    alarmNotification.style.display = "none";
    
    // Stop sound
    if (timerState.beepInterval) {
      clearInterval(timerState.beepInterval);
      timerState.beepInterval = null;
    }
    
    if (timerState.audioContext && timerState.audioContext.state !== 'closed') {
      timerState.audioContext.close();
      timerState.audioContext = null;
    }
    
    if (timerState.oscillator) {
      timerState.oscillator = null;
    }
    
    // Clear timeout
    if (timerState.alarmTimeout) {
      clearTimeout(timerState.alarmTimeout);
      timerState.alarmTimeout = null;
    }
    
    // Track alarm stopped
    if (typeof gtag === 'function') {
      gtag('event', 'alarm_stopped', {
        duration_minutes: timerState.selectedMinutes
      });
    }
  }

  function selectDuration(minutes) {
    timerState.selectedMinutes = minutes;
    timerState.totalSeconds = minutes * 60;
    timerState.remainingSeconds = timerState.totalSeconds;
    
    // Hide selection, show timer
    timerSelection.style.display = "none";
    timerDisplay.style.display = "flex";
    
    // Reset progress
    timerProgress.style.strokeDashoffset = CIRCUMFERENCE;
    
    updateDisplay();
    
    // Track duration selection
    if (typeof gtag === 'function') {
      gtag('event', 'duration_selected', {
        duration_minutes: minutes
      });
    }
  }

  // Event Listeners
  durationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      selectDuration(minutes);
    });
  });

  // Custom timer
  const customMinutesInput = document.getElementById("custom-minutes");
  const customStartBtn = document.getElementById("custom-start-btn");
  
  customStartBtn.addEventListener('click', () => {
    const customMinutes = parseInt(customMinutesInput.value);
    if (isNaN(customMinutes) || customMinutes < 1 || customMinutes > 999) {
      alert('Please enter a valid number between 1 and 999 minutes.');
      return;
    }
    selectDuration(customMinutes);
  });
  
  customMinutesInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      customStartBtn.click();
    }
  });

  startPauseBtn.addEventListener('click', () => {
    if (timerState.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    resetTimer();
  });

  stopAlarmBtn.addEventListener('click', () => {
    stopAlarm();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
    }
    if (timerState.alarmTimeout) {
      clearTimeout(timerState.alarmTimeout);
    }
    if (timerState.beepInterval) {
      clearInterval(timerState.beepInterval);
    }
    if (timerState.audioContext && timerState.audioContext.state !== 'closed') {
      timerState.audioContext.close();
    }
  });
});

