const modal = document.getElementById("deleteModal");
const modalCard = modal.querySelector(".modal-card");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalProgress = document.getElementById("modalProgress");
const modalBody = document.getElementById("modalBody");
const backBtn = document.getElementById("modalBack");
const cancelBtn = document.getElementById("modalCancel");
const nextBtn = document.getElementById("modalNext");
const resultBanner = document.getElementById("resultBanner");
const fileCountPill = document.querySelector(".pill");
const fileList = document.querySelector(".file-list");
const appShell = document.querySelector(".app-shell");
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let audioContext;

const reasonOptions = [
  "You deserve a cleaner desktop.",
  "This file keeps bringing up bad memories.",
  "We have grown in different folder directions.",
  "The recycle bin counselor recommended this.",
];

const state = {
  isOpen: false,
  currentStep: 0,
  targetRow: null,
  fileName: "",
  reason: "",
  farewell: "",
  countdownValue: 3,
  countdownDone: false,
  countdownTimer: null,
  triggerButton: null,
};

const steps = [
  {
    title: "Step 1: Confirm The Breakup",
    subtitle:
      "Before we continue, please acknowledge this relationship is ending.",
    nextLabel: "Yes, continue",
    render: () => {
      modalBody.innerHTML = `<p>You are about to delete <strong>${state.fileName}</strong>. This action is wildly dramatic and permanent in this prototype.</p>`;
    },
    validate: () => true,
  },
  {
    title: "Step 2: Choose A Reason",
    subtitle:
      "Every dramatic ending needs a thoughtful reason. Pick one to proceed.",
    nextLabel: "Reason selected",
    render: () => {
      const optionsMarkup = reasonOptions
        .map((reason) => {
          const selectedClass = state.reason === reason ? "is-selected" : "";
          const isPressed = state.reason === reason;
          return `<button type="button" class="reason-option ${selectedClass}" data-reason="${reason}" aria-pressed="${isPressed}">${reason}</button>`;
        })
        .join("");

      modalBody.innerHTML = `<div class="reason-grid">${optionsMarkup}</div>`;

      modalBody.querySelectorAll(".reason-option").forEach((optionButton) => {
        optionButton.addEventListener("click", () => {
          state.reason = optionButton.dataset.reason || "";
          renderCurrentStep();
        });
      });
    },
    validate: () => Boolean(state.reason),
  },
  {
    title: "Step 3: Final Message",
    subtitle:
      "Type a farewell note to the file. Minimum 10 characters for emotional closure.",
    nextLabel: "Message written",
    render: () => {
      const charCount = state.farewell.trim().length;
      modalBody.innerHTML = `
				<label class="farewell-label" for="farewellInput">Dear ${state.fileName},</label>
				<textarea id="farewellInput" class="farewell-input" placeholder="It's not you, it's my storage anxiety...">${state.farewell}</textarea>
				<p class="farewell-meta">${charCount}/10 characters</p>
			`;

      const farewellInput = document.getElementById("farewellInput");

      farewellInput.addEventListener("input", () => {
        state.farewell = farewellInput.value;
        const nextCount = state.farewell.trim().length;
        const meta = modalBody.querySelector(".farewell-meta");
        meta.textContent = `${nextCount}/10 characters`;
        updateActionButtons();
      });
    },
    validate: () => state.farewell.trim().length >= 10,
  },
  {
    title: "Step 4: Point Of No Return",
    subtitle:
      "Start the countdown. Once it reaches zero, the delete button unlocks.",
    nextLabel: "Delete forever",
    render: () => {
      const actionCopy = state.countdownDone
        ? "Countdown complete. You may now finalize deletion."
        : "Press start and wait for the dramatic countdown.";

      modalBody.innerHTML = `
				<div class="countdown-wrap">
					<p><strong>Reason:</strong> ${state.reason || "Not chosen"}</p>
					<p><strong>Farewell:</strong> ${state.farewell || "No message"}</p>
					<p>${actionCopy}</p>
					<p id="countdownValue" class="countdown-number">${state.countdownValue}</p>
					<button type="button" id="startCountdown" class="mini-btn" ${
            state.countdownDone ? "disabled" : ""
          }>Start dramatic countdown</button>
				</div>
			`;

      const startButton = document.getElementById("startCountdown");
      startButton.addEventListener("click", startCountdown);
    },
    validate: () => state.countdownDone,
  },
];

document.querySelectorAll(".delete-btn").forEach((deleteButton) => {
  deleteButton.addEventListener("click", () => {
    const row = deleteButton.closest(".file-row");
    const fileName = row?.querySelector(".file-name")?.textContent?.trim();
    if (!row || !fileName) {
      return;
    }
    openModalForRow(row, fileName, deleteButton);
  });
});

backBtn.addEventListener("click", () => {
  if (state.currentStep === 0) {
    return;
  }
  state.currentStep -= 1;
  stopCountdown();
  renderCurrentStep();
});

cancelBtn.addEventListener("click", closeModal);

nextBtn.addEventListener("click", () => {
  const activeStep = steps[state.currentStep];
  if (!activeStep.validate()) {
    return;
  }

  if (state.currentStep === steps.length - 1) {
    performDelete();
    return;
  }

  state.currentStep += 1;
  renderCurrentStep();
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

modal.addEventListener("keydown", handleModalKeyDown);

function openModalForRow(row, fileName, triggerButton) {
  primeAudioContext();

  state.isOpen = true;
  state.currentStep = 0;
  state.targetRow = row;
  state.fileName = fileName;
  state.triggerButton = triggerButton;
  state.reason = "";
  state.farewell = "";
  state.countdownValue = 3;
  state.countdownDone = false;

  resultBanner.textContent = "";
  document.body.classList.add("modal-open");
  appShell?.setAttribute("inert", "");
  appShell?.setAttribute("aria-hidden", "true");
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  renderCurrentStep();
}

function closeModal(options = {}) {
  const { restoreFocus = true } = options;

  state.isOpen = false;
  stopCountdown();
  document.body.classList.remove("modal-open");
  appShell?.removeAttribute("inert");
  appShell?.removeAttribute("aria-hidden");
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");

  if (!restoreFocus) {
    return;
  }

  const fallbackButton = document.contains(state.triggerButton)
    ? state.triggerButton
    : document.querySelector(".delete-btn");
  fallbackButton?.focus();
}

function renderCurrentStep() {
  const activeStep = steps[state.currentStep];

  modalTitle.textContent = activeStep.title;
  modalSubtitle.textContent = activeStep.subtitle;
  modalProgress.textContent = `Step ${state.currentStep + 1} of ${steps.length}`;

  activeStep.render();
  nextBtn.textContent = activeStep.nextLabel;
  backBtn.style.visibility = state.currentStep === 0 ? "hidden" : "visible";
  updateActionButtons();
  setStepFocus();
}

function updateActionButtons() {
  const activeStep = steps[state.currentStep];
  nextBtn.disabled = !activeStep.validate();
}

function startCountdown() {
  if (state.countdownDone || state.countdownTimer) {
    return;
  }

  const startButton = document.getElementById("startCountdown");
  const countdownValueNode = document.getElementById("countdownValue");
  startButton.disabled = true;
  state.countdownTimer = window.setInterval(() => {
    state.countdownValue -= 1;

    if (countdownValueNode) {
      countdownValueNode.textContent = String(
        Math.max(state.countdownValue, 0),
      );
    }

    if (state.countdownValue <= 0) {
      stopCountdown();
      state.countdownDone = true;
      updateActionButtons();
      renderCurrentStep();
    }
  }, 1000);
}

function stopCountdown() {
  if (state.countdownTimer) {
    window.clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function setStepFocus() {
  if (!state.isOpen) {
    return;
  }

  if (state.currentStep === 1) {
    const selectedReason = modalBody.querySelector(
      ".reason-option.is-selected",
    );
    const firstReason = modalBody.querySelector(".reason-option");
    (selectedReason || firstReason || nextBtn)?.focus();
    return;
  }

  if (state.currentStep === 2) {
    const farewellInput = document.getElementById("farewellInput");
    if (farewellInput) {
      farewellInput.focus();
      farewellInput.setSelectionRange(
        farewellInput.value.length,
        farewellInput.value.length,
      );
      return;
    }
  }

  if (state.currentStep === 3) {
    const countdownStart = document.getElementById("startCountdown");
    if (!state.countdownDone && countdownStart) {
      countdownStart.focus();
      return;
    }
  }

  if (!nextBtn.disabled) {
    nextBtn.focus();
    return;
  }

  const firstFocusable = getModalFocusableElements()[0];
  (firstFocusable || modalCard)?.focus();
}

function handleModalKeyDown(event) {
  if (!state.isOpen) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    trapFocus(event);
  }
}

function trapFocus(event) {
  const focusableElements = getModalFocusableElements();

  if (focusableElements.length === 0) {
    event.preventDefault();
    modalCard?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey) {
    if (!modal.contains(activeElement) || activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (!modal.contains(activeElement) || activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function getModalFocusableElements() {
  return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

function performDelete() {
  if (!state.targetRow) {
    closeModal();
    return;
  }

  const rowToDelete = state.targetRow;
  const fileName = state.fileName;
  const fileType = getFileTypeFromName(fileName);
  const reducedMotion = reducedMotionQuery.matches;
  const poofDelay = reducedMotion ? 0 : 260;
  const deleteDelay = reducedMotion ? 180 : 1180;

  closeModal({ restoreFocus: false });
  rowToDelete.classList.add("is-tearing");
  addTearFragment(rowToDelete);
  playTearSound(fileType);

  window.setTimeout(() => {
    if (!document.contains(rowToDelete)) {
      return;
    }

    addDustParticles(rowToDelete, fileType);
    rowToDelete.classList.add("is-poofing", "is-fading");
    playPoofSound(fileType);
  }, poofDelay);

  window.setTimeout(() => {
    if (!document.contains(rowToDelete)) {
      return;
    }

    rowToDelete.remove();

    const remaining = fileList.querySelectorAll(".file-row").length;
    fileCountPill.textContent = `${remaining} files`;

    if (remaining === 0) {
      fileList.innerHTML =
        '<li class="file-row"><p class="file-name">All files deleted. The drama is complete.</p></li>';
    }

    resultBanner.textContent = `"${fileName}" has been emotionally deleted.`;
    focusPostDeleteTarget();
    state.targetRow = null;
    state.triggerButton = null;
  }, deleteDelay);
}

function addTearFragment(rowElement) {
  const tearFragment = document.createElement("span");
  const randomX = 16 + Math.random() * 28;
  const randomY = 16 + Math.random() * 30;
  const randomRotation = 70 + Math.random() * 120;

  tearFragment.className = "tear-fragment";
  tearFragment.setAttribute("aria-hidden", "true");
  tearFragment.style.setProperty("--tear-x", `${randomX}px`);
  tearFragment.style.setProperty("--tear-y", `${randomY}px`);
  tearFragment.style.setProperty("--tear-rot", `${randomRotation}deg`);
  rowElement.appendChild(tearFragment);

  tearFragment.addEventListener(
    "animationend",
    () => {
      tearFragment.remove();
    },
    { once: true },
  );
}

function addDustParticles(rowElement, fileType) {
  const particleCount = reducedMotionQuery.matches ? 2 : 12;
  const palette = getDustPalette(fileType);

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const xDirection = (Math.random() * 2 - 1) * 76;
    const yDirection = -20 - Math.random() * 54;
    const delay = Math.random() * 120;
    const duration = 680 + Math.random() * 360;
    const size = 5 + Math.random() * 6;
    const color = palette[Math.floor(Math.random() * palette.length)];

    particle.className = "dust-particle";
    particle.setAttribute("aria-hidden", "true");
    particle.style.setProperty("--dust-x", `${xDirection.toFixed(1)}px`);
    particle.style.setProperty("--dust-y", `${yDirection.toFixed(1)}px`);
    particle.style.setProperty("--dust-size", `${size.toFixed(1)}px`);
    particle.style.setProperty("--dust-delay", `${delay.toFixed(0)}ms`);
    particle.style.setProperty("--dust-duration", `${duration.toFixed(0)}ms`);
    particle.style.setProperty("--dust-color", color);
    rowElement.appendChild(particle);

    particle.addEventListener(
      "animationend",
      () => {
        particle.remove();
      },
      { once: true },
    );
  }
}

function getDustPalette(fileType) {
  const palettes = {
    doc: ["#ffe9bf", "#fff5dd", "#f2dbc1"],
    archive: ["#f8d9b8", "#ffd5b8", "#ffbf88"],
    pdf: ["#ffd7ce", "#ffc4b9", "#ffe6db"],
    media: ["#d2f5ff", "#b7e9ff", "#e4fbff"],
    generic: ["#ffe4cc", "#ffedd9", "#f8dcc6"],
  };

  return palettes[fileType] || palettes.generic;
}

function getFileTypeFromName(fileName) {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "";

  if (["doc", "docx", "txt", "rtf", "md"].includes(extension)) {
    return "doc";
  }

  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "archive";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (["png", "jpg", "jpeg", "gif", "svg", "mp4", "mov"].includes(extension)) {
    return "media";
  }

  return "generic";
}

function focusPostDeleteTarget() {
  const nextDeleteButton = document.querySelector(".delete-btn");
  if (nextDeleteButton) {
    nextDeleteButton.focus();
    return;
  }

  resultBanner.setAttribute("tabindex", "-1");
  resultBanner.focus();
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

function playTearSound(fileType = "generic") {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  primeAudioContext();
  const profiles = {
    doc: { frequency: 1560, q: 1.1, gain: 0.12 },
    archive: { frequency: 980, q: 0.85, gain: 0.14 },
    pdf: { frequency: 1760, q: 1.25, gain: 0.15 },
    media: { frequency: 1320, q: 0.95, gain: 0.11 },
    generic: { frequency: 1800, q: 0.9, gain: 0.16 },
  };
  const profile = profiles[fileType] || profiles.generic;

  const start = context.currentTime + 0.01;
  const duration = 0.14;
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
  gain.gain.exponentialRampToValueAtTime(profile.gain, start + 0.02);
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
  const profiles = {
    doc: {
      type: "sine",
      startFreq: 210,
      endFreq: 86,
      gain: 0.06,
      lowpass: 760,
    },
    archive: {
      type: "square",
      startFreq: 160,
      endFreq: 72,
      gain: 0.05,
      lowpass: 640,
    },
    pdf: {
      type: "triangle",
      startFreq: 250,
      endFreq: 104,
      gain: 0.08,
      lowpass: 780,
    },
    media: {
      type: "sine",
      startFreq: 280,
      endFreq: 130,
      gain: 0.055,
      lowpass: 920,
    },
    generic: {
      type: "triangle",
      startFreq: 260,
      endFreq: 92,
      gain: 0.07,
      lowpass: 720,
    },
  };
  const profile = profiles[fileType] || profiles.generic;

  const start = context.currentTime + 0.01;
  const duration = 0.3;

  const oscillator = context.createOscillator();
  oscillator.type = profile.type;
  oscillator.frequency.setValueAtTime(profile.startFreq, start);
  oscillator.frequency.exponentialRampToValueAtTime(
    profile.endFreq,
    start + duration,
  );

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(profile.gain, start + 0.04);
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
