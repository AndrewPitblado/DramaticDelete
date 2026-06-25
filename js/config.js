(() => {
  const config = {
    FOCUSABLE_SELECTOR:
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    reasonOptions: [
      "You deserve a cleaner desktop.",
      "This file keeps bringing up bad memories.",
      "We have grown in different folder directions.",
      "The recycle bin counselor recommended this.",
    ],
    MORSE_OATH_CONFIG: {
      deletePattern: ".-.",
      keepPattern: "-.-",
      maxSymbols: 9,
    },
    DAMAGE_METER_CONFIG: {
      windowMs: 2500,
      minTaps: 3,
    },
    EXILE_VECTOR_CONFIG: {
      sequenceLength: 3,
    },
    DELETE_TIMINGS: {
      poofDelayMs: 600,
      deleteDelayMs: 3200,
      reducedMotionPoofDelayMs: 0,
      reducedMotionDeleteDelayMs: 180,
      audioStartLeadSec: 0.01,
      tearSoundDurationSec: 0.42,
      poofSoundDurationSec: 1.05,
      tearAttackSec: 0.08,
      poofAttackSec: 0.2,
    },
    DUST_CONFIG: {
      count: 12,
      reducedMotionCount: 2,
      xRangePx: 76,
      yBasePx: -20,
      yRangePx: 54,
      delayMaxMs: 280,
      durationMinMs: 1400,
      durationRangeMs: 700,
      sizeMinPx: 5,
      sizeRangePx: 6,
    },
    TEAR_FRAGMENT_CONFIG: {
      xMinPx: 16,
      xRangePx: 28,
      yMinPx: 16,
      yRangePx: 30,
      rotationMinDeg: 70,
      rotationRangeDeg: 120,
    },
    FILE_TYPE_EXTENSION_GROUPS: {
      doc: ["doc", "docx", "txt", "rtf", "md"],
      archive: ["zip", "rar", "7z", "tar", "gz"],
      pdf: ["pdf"],
      media: ["png", "jpg", "jpeg", "gif", "svg", "mp4", "mov"],
    },
    FILE_TYPE_CONFIG: {
      doc: {
        dustPalette: ["#ffe9bf", "#fff5dd", "#f2dbc1"],
        tearSound: { frequency: 1560, q: 1.1, gain: 0.12 },
        poofSound: {
          type: "sine",
          startFreq: 210,
          endFreq: 86,
          gain: 0.06,
          lowpass: 760,
        },
      },
      archive: {
        dustPalette: ["#f8d9b8", "#ffd5b8", "#ffbf88"],
        tearSound: { frequency: 980, q: 0.85, gain: 0.14 },
        poofSound: {
          type: "square",
          startFreq: 160,
          endFreq: 72,
          gain: 0.05,
          lowpass: 640,
        },
      },
      pdf: {
        dustPalette: ["#ffd7ce", "#ffc4b9", "#ffe6db"],
        tearSound: { frequency: 1760, q: 1.25, gain: 0.15 },
        poofSound: {
          type: "triangle",
          startFreq: 250,
          endFreq: 104,
          gain: 0.08,
          lowpass: 780,
        },
      },
      media: {
        dustPalette: ["#d2f5ff", "#b7e9ff", "#e4fbff"],
        tearSound: { frequency: 1320, q: 0.95, gain: 0.11 },
        poofSound: {
          type: "sine",
          startFreq: 280,
          endFreq: 130,
          gain: 0.055,
          lowpass: 920,
        },
      },
      generic: {
        dustPalette: ["#ffe4cc", "#ffedd9", "#f8dcc6"],
        tearSound: { frequency: 1800, q: 0.9, gain: 0.16 },
        poofSound: {
          type: "triangle",
          startFreq: 260,
          endFreq: 92,
          gain: 0.07,
          lowpass: 720,
        },
      },
    },
  };

  window.DD_CONFIG = Object.freeze(config);
})();
