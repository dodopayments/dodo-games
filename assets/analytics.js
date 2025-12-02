// Google Analytics 4 Configuration
const GA_MEASUREMENT_ID = 'G-GW1LSM5MKF';

// Initialize Google Analytics
(function() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
})();

// Analytics Helper Functions
const DodoAnalytics = {
  // Track game start
  gameStart: function(gameName, difficulty = 'normal') {
    gtag('event', 'game_start', {
      game_name: gameName,
      difficulty: difficulty
    });
  },

  // Track game over
  gameOver: function(gameName, score, extraData = {}) {
    gtag('event', 'game_over', {
      game_name: gameName,
      score: score,
      ...extraData
    });
  },

  // Track new high score
  newHighScore: function(gameName, score) {
    gtag('event', 'new_high_score', {
      game_name: gameName,
      score: score
    });
  },

  // Track social share
  shareScore: function(gameName, platform = 'twitter') {
    gtag('event', 'share_score', {
      game_name: gameName,
      platform: platform
    });
  },

  // Track boss mode (Easter egg)
  bossMode: function(activated) {
    gtag('event', 'boss_mode_toggle', {
      activated: activated
    });
  },

  // Track power-up usage
  powerUp: function(gameName, powerUpName) {
    gtag('event', 'power_up_used', {
      game_name: gameName,
      power_up: powerUpName
    });
  },

  // Track wave/level completion
  waveComplete: function(gameName, waveNumber) {
    gtag('event', 'wave_complete', {
      game_name: gameName,
      wave: waveNumber
    });
  }
};

