(() => {
  const { DELETE_TIMINGS } = window.DD_CONFIG;
  const { getFileTypeConfig } = window.DD_FILE_TYPES;

  let audioContext;

  function getAudioContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
  }

  function primeAudioContext() {
    const context = getAudioContext();
    if (!context || context.state !== "suspended") {
      return;
    }

    context.resume().catch(() => {
      // Ignore: some browsers block sound until stronger user activation.
    });
  }

  function playTearSound(fileType = "generic") {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    primeAudioContext();
    const profile = getFileTypeConfig(fileType).tearSound;

    const start = context.currentTime + DELETE_TIMINGS.audioStartLeadSec;
    const duration = DELETE_TIMINGS.tearSoundDurationSec;
    const noiseBuffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * duration),
      context.sampleRate,
    );
    const channel = noiseBuffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = noiseBuffer;

    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(profile.frequency, start);
    bandpass.Q.setValueAtTime(profile.q, start);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      profile.gain,
      start + DELETE_TIMINGS.tearAttackSec,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(context.destination);

    source.start(start);
    source.stop(start + duration);
  }

  function playPoofSound(fileType = "generic") {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    primeAudioContext();
    const profile = getFileTypeConfig(fileType).poofSound;

    const start = context.currentTime + DELETE_TIMINGS.audioStartLeadSec;
    const duration = DELETE_TIMINGS.poofSoundDurationSec;

    const oscillator = context.createOscillator();
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.startFreq, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      profile.endFreq,
      start + duration,
    );

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      profile.gain,
      start + DELETE_TIMINGS.poofAttackSec,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(profile.lowpass, start);

    oscillator.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  window.DD_AUDIO = Object.freeze({
    primeAudioContext,
    playTearSound,
    playPoofSound,
  });
})();
