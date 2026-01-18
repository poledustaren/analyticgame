/**
 * Sound System Module
 * Provides audio feedback using Web Audio API
 */

export const SoundSystem = {
    audioContext: null,
    enabled: true,
    volume: 0.3,

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    },

    toggle() {
        this.enabled = !this.enabled;
        const btn = document.getElementById('sound-toggle');
        if (btn) {
            btn.textContent = this.enabled ? '🔊' : '🔇';
            btn.title = this.enabled ? 'Sound on' : 'Sound off';
        }
        return this.enabled;
    },

    play(type) {
        if (!this.enabled || !this.audioContext) return;

        // Resume context if suspended (required by browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;

        switch (type) {
            case 'taskMove':
                this.playTone(440, 'sine', 0.05, now);
                this.playTone(660, 'sine', 0.05, now + 0.05);
                break;
            case 'taskComplete':
                this.playTone(523, 'sine', 0.1, now);
                this.playTone(659, 'sine', 0.1, now + 0.1);
                this.playTone(784, 'sine', 0.15, now + 0.2);
                break;
            case 'sprintStart':
                this.playTone(392, 'square', 0.1, now);
                this.playTone(523, 'square', 0.1, now + 0.1);
                this.playTone(659, 'square', 0.2, now + 0.2);
                break;
            case 'sprintEnd':
                this.playTone(659, 'square', 0.15, now);
                this.playTone(523, 'square', 0.15, now + 0.15);
                this.playTone(392, 'square', 0.2, now + 0.3);
                break;
            case 'levelUp':
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    this.playTone(freq, 'sine', 0.2, now + i * 0.15);
                });
                break;
            case 'error':
                this.playTone(200, 'sawtooth', 0.1, now);
                this.playTone(150, 'sawtooth', 0.15, now + 0.1);
                break;
            case 'notification':
                this.playTone(880, 'sine', 0.05, now);
                this.playTone(1100, 'sine', 0.05, now + 0.05);
                break;
            case 'resourceAssign':
                this.playTone(330, 'triangle', 0.08, now);
                this.playTone(440, 'triangle', 0.08, now + 0.08);
                break;
            case 'wipWarning':
                this.playTone(400, 'square', 0.05, now);
                setTimeout(() => this.playTone(400, 'square', 0.05), 100);
                break;
            case 'modalOpen':
                this.playTone(600, 'sine', 0.05, now);
                break;
            case 'modalClose':
                this.playTone(500, 'sine', 0.05, now);
                break;
            case 'success':
                this.playTone(523, 'sine', 0.1, now);
                this.playTone(659, 'sine', 0.1, now + 0.1);
                break;
        }
    },

    playTone(frequency, type, duration, startTime) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
};
