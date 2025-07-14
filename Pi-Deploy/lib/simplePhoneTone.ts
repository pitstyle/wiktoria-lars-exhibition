/**
 * Simple Phone Tone Generator
 * 
 * Lightweight dial tone generator that works immediately
 * Based on the working red button code
 */

export class SimplePhoneTone {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private isPlaying = false;

  constructor(private volume: number = 0.08) {}

  async start(): Promise<void> {
    if (this.isPlaying) {
      console.log('📞 Simple tone already playing');
      return;
    }

    try {
      console.log('📞 Starting simple dial tone...');

      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('📞 Simple AudioContext state:', this.audioContext.state);

      // Resume if needed
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('📞 Simple AudioContext resumed');
      }

      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      // Create oscillators for 350Hz + 440Hz dial tone
      this.osc1 = this.audioContext.createOscillator();
      this.osc2 = this.audioContext.createOscillator();

      this.osc1.frequency.setValueAtTime(350, this.audioContext.currentTime);
      this.osc2.frequency.setValueAtTime(440, this.audioContext.currentTime);

      this.osc1.connect(this.gainNode);
      this.osc2.connect(this.gainNode);

      this.osc1.start();
      this.osc2.start();

      this.isPlaying = true;
      console.log('✅ Simple dial tone playing!');

    } catch (error) {
      console.error('❌ Simple tone failed:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.isPlaying) {
      return;
    }

    console.log('📞 Stopping simple dial tone');

    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
        this.osc1 = null;
      }

      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
        this.osc2 = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.isPlaying = false;
      console.log('✅ Simple dial tone stopped');

    } catch (error) {
      console.error('❌ Error stopping simple tone:', error);
    }
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      hasAudioContext: !!this.audioContext
    };
  }
}