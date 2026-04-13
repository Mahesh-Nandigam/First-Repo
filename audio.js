const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundEngine = {
    playTone: function(frequency, type, duration, vol=0.1) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    },

    playEatSound: function() {
        this.playTone(600, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(800, 'square', 0.1, 0.1), 50);
    },

    playDieSound: function() {
        this.playTone(150, 'sawtooth', 0.5, 0.2);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.5, 0.2), 100);
        setTimeout(() => this.playTone(50, 'sawtooth', 0.8, 0.2), 200);
    },

    playLevelUpSound: function() {
        this.playTone(400, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(500, 'sine', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 200);
        setTimeout(() => this.playTone(800, 'sine', 0.4, 0.1), 300);
    },

    playPowerUpSound: function() {
         this.playTone(800, 'triangle', 0.2, 0.1);
         setTimeout(() => this.playTone(1200, 'triangle', 0.3, 0.1), 100);
    }
};
