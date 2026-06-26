const {
  FOCUSABLE_SELECTOR,
  MORSE_OATH_CONFIG,
  DAMAGE_METER_CONFIG,
  EXILE_VECTOR_CONFIG,
} = window.DD_CONFIG;
const { getFileTypeFromName } = window.DD_FILE_TYPES;
const { primeAudioContext, playTearSound, playPoofSound } = window.DD_AUDIO;
const { addDustParticles, addTearFragment, getDeleteAnimationTimings } =
  window.DD_EFFECTS;

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
const EMPTY_STATE_SELECTOR = ".file-row-empty";
const DELETE_BUTTON_SELECTOR = ".delete-btn";

const state = {
  isOpen: false,
  currentStep: 0,
  targetRow: null,
  fileName: "",
  morseSequence: "",
  morseDecision: "",
  damageMeter: {
    taps: [],
    running: false,
    done: false,
    score: null,
    startedAt: 0,
  },
  exileVector: {
    sequence: [],
    zone: "",
  },
  damageMeterTimer: null,
  triggerButton: null,
};

const exileZoneMap = {
  UUR: "Upper-Right Realm",
  UUL: "Upper-Left Realm",
  UUD: "Top-Center Ridge",
  DDR: "Lower-Right Wastes",
  DDL: "Lower-Left Wastes",
  DDU: "Bottom-Center Catacombs",
  LLR: "Center-Right Limbo",
  RRL: "Center-Left Limbo",
  LLD: "Midnight South Sector",
  RRU: "Sunrise North Sector",
};

const steps = [
  {
    title: "Step 1: Morse Breakup Oath",
    subtitle:
      "Send your oath in dots and dashes. .-. means DELETE, -.- means KEEP.",
    nextLabel: "Transmission accepted",
    render: () => {
      const morseView = state.morseSequence || "(no signal yet)";
      const decoded = getMorseDecisionLabel(state.morseDecision);
      modalBody.innerHTML = `
        <div class="offdiag-block">
          <p>You are about to evaluate <strong>${state.fileName}</strong>.</p>
          <p class="offdiag-label">Signal</p>
          <p class="morse-display" aria-live="polite">${morseView}</p>
          <p class="offdiag-hint">Tap Dot or Dash, then decode transmission.</p>
          <div class="offdiag-actions">
            <button type="button" class="mini-btn" data-morse-value=".">Dot</button>
            <button type="button" class="mini-btn" data-morse-value="-">Dash</button>
            <button type="button" id="decodeMorseBtn" class="mini-btn">Decode signal</button>
            <button type="button" id="clearMorseBtn" class="mini-btn">Clear</button>
          </div>
          <p class="offdiag-result" aria-live="polite">${decoded}</p>
        </div>
      `;

      modalBody.querySelectorAll("[data-morse-value]").forEach((button) => {
        button.addEventListener("click", () => {
          appendMorseSymbol(button.dataset.morseValue || "");
        });
      });

      const decodeButton = document.getElementById("decodeMorseBtn");
      decodeButton?.addEventListener("click", () => {
        state.morseDecision = decodeMorseSequence(state.morseSequence);
        renderCurrentStep();
      });

      const clearButton = document.getElementById("clearMorseBtn");
      clearButton?.addEventListener("click", () => {
        state.morseSequence = "";
        state.morseDecision = "";
        renderCurrentStep();
      });
    },
    validate: () => state.morseDecision === "delete",
  },
  {
    title: "Step 2: Emotional Damage Meter",
    subtitle:
      "Tap the panic pad for 2.5 seconds. Rhythm determines your confidence score.",
    nextLabel: "Damage quantified",
    render: () => {
      const meter = state.damageMeter;
      const status = meter.done
        ? `Result: ${meter.score}/10 confidence in this deletion.`
        : meter.running
          ? "Meter running. Keep tapping the pad."
          : "Press Start, then mash the panic pad.";

      modalBody.innerHTML = `
        <div class="offdiag-block">
          <p class="offdiag-label">Cadence analyzer</p>
          <p class="offdiag-hint">Need at least ${DAMAGE_METER_CONFIG.minTaps} taps for a valid reading.</p>
          <div class="offdiag-actions">
            <button type="button" id="startDamageMeter" class="mini-btn" ${meter.running || meter.done ? "disabled" : ""}>Start meter</button>
            <button type="button" id="damagePad" class="panic-pad" ${meter.running ? "" : "disabled"}>PANIC PAD</button>
            <button type="button" id="resetDamageMeter" class="mini-btn">Reset</button>
          </div>
          <p class="offdiag-result" aria-live="polite">${status}</p>
          <p class="offdiag-label">Taps recorded: ${meter.taps.length}</p>
        </div>
      `;

      const startButton = document.getElementById("startDamageMeter");
      startButton?.addEventListener("click", startDamageMeter);

      const padButton = document.getElementById("damagePad");
      padButton?.addEventListener("click", registerDamageTap);

      const resetButton = document.getElementById("resetDamageMeter");
      resetButton?.addEventListener("click", () => {
        resetDamageMeter();
        renderCurrentStep();
      });
    },
    validate: () => Boolean(state.damageMeter.done && state.damageMeter.score),
  },
  {
    title: "Step 3: Exile Vector Spell",
    subtitle: "Cast a 3-arrow sequence. The spell maps to an exile zone.",
    nextLabel: "Delete forever",
    render: () => {
      const sequence = state.exileVector.sequence.join("") || "(empty)";
      const zone = state.exileVector.zone || "No exile zone selected.";
      modalBody.innerHTML = `
        <div class="offdiag-block">
          <p>Confidence lock-in: <strong>${state.damageMeter.score || "?"}/10</strong></p>
          <p class="offdiag-label">Spell sequence (${EXILE_VECTOR_CONFIG.sequenceLength} arrows)</p>
          <p class="vector-display" aria-live="polite">${sequence}</p>
          <div class="offdiag-actions">
            <button type="button" class="mini-btn" data-vector="U">Up</button>
            <button type="button" class="mini-btn" data-vector="D">Down</button>
            <button type="button" class="mini-btn" data-vector="L">Left</button>
            <button type="button" class="mini-btn" data-vector="R">Right</button>
            <button type="button" id="clearVectorBtn" class="mini-btn">Clear</button>
          </div>
          <p class="offdiag-result" aria-live="polite">${zone}</p>
        </div>
      `;

      modalBody.querySelectorAll("[data-vector]").forEach((button) => {
        button.addEventListener("click", () => {
          appendVectorSymbol(button.dataset.vector || "");
        });
      });

      const clearButton = document.getElementById("clearVectorBtn");
      clearButton?.addEventListener("click", () => {
        state.exileVector.sequence = [];
        state.exileVector.zone = "";
        renderCurrentStep();
      });
    },
    validate: () => Boolean(state.exileVector.zone),
  },
];

fileList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(DELETE_BUTTON_SELECTOR);
  if (!deleteButton || !fileList.contains(deleteButton)) {
    return;
  }

  const row = deleteButton.closest(".file-row");
  const fileName = row?.querySelector(".file-name")?.textContent?.trim();
  if (!row || !fileName) {
    return;
  }

  openModalForRow(row, fileName, deleteButton);
});

backBtn.addEventListener("click", () => {
  if (state.currentStep === 0) {
    return;
  }
  state.currentStep -= 1;
  stopDamageMeter();
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
  resetDeleteFlowState(row, fileName, triggerButton);

  state.isOpen = true;
  resultBanner.textContent = "";
  setModalOpenState(true);
  renderCurrentStep();
}

function closeModal(options = {}) {
  const { restoreFocus = true } = options;

  state.isOpen = false;
  stopDamageMeter();
  setModalOpenState(false);

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

function appendMorseSymbol(symbol) {
  if (![".", "-"].includes(symbol)) {
    return;
  }

  state.morseSequence = `${state.morseSequence}${symbol}`.slice(
    -MORSE_OATH_CONFIG.maxSymbols,
  );
  state.morseDecision = "";
  renderCurrentStep();
}

function decodeMorseSequence(sequence) {
  if (sequence === MORSE_OATH_CONFIG.deletePattern) {
    return "delete";
  }
  if (sequence === MORSE_OATH_CONFIG.keepPattern) {
    return "keep";
  }
  return "invalid";
}

function getMorseDecisionLabel(decision) {
  if (decision === "delete") {
    return "Transmission received: DELETE oath accepted.";
  }
  if (decision === "keep") {
    return "Transmission says KEEP. Use the delete oath pattern to proceed.";
  }
  if (decision === "invalid") {
    return "Signal undecodable. Try .-. for delete.";
  }
  return "Awaiting transmission decode.";
}

function startDamageMeter() {
  const meter = state.damageMeter;
  if (meter.running || meter.done) {
    return;
  }

  meter.running = true;
  meter.startedAt = performance.now();
  meter.taps = [];

  stopDamageMeter();
  state.damageMeterTimer = window.setTimeout(() => {
    finalizeDamageMeter();
  }, DAMAGE_METER_CONFIG.windowMs);
  renderCurrentStep();
}

function registerDamageTap() {
  const meter = state.damageMeter;
  if (!meter.running) {
    return;
  }

  meter.taps.push(performance.now());
  updateActionButtons();
  renderCurrentStep();
}

function finalizeDamageMeter() {
  const meter = state.damageMeter;
  meter.running = false;
  stopDamageMeter();

  if (meter.taps.length < DAMAGE_METER_CONFIG.minTaps) {
    meter.done = false;
    meter.score = null;
    renderCurrentStep();
    return;
  }

  const intervals = [];
  for (let index = 1; index < meter.taps.length; index += 1) {
    intervals.push(meter.taps[index] - meter.taps[index - 1]);
  }

  const averageInterval =
    intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const normalizedPace = Math.max(
    0,
    Math.min(1, (520 - averageInterval) / 320),
  );
  const score = Math.round(1 + normalizedPace * 9);

  meter.score = Math.max(1, Math.min(10, score));
  meter.done = true;
  renderCurrentStep();
}

function stopDamageMeter() {
  if (state.damageMeterTimer) {
    window.clearTimeout(state.damageMeterTimer);
    state.damageMeterTimer = null;
  }
}

function resetDamageMeter() {
  stopDamageMeter();
  state.damageMeter = {
    taps: [],
    running: false,
    done: false,
    score: null,
    startedAt: 0,
  };
}

function appendVectorSymbol(symbol) {
  if (!["U", "D", "L", "R"].includes(symbol)) {
    return;
  }

  if (state.exileVector.sequence.length >= EXILE_VECTOR_CONFIG.sequenceLength) {
    return;
  }

  state.exileVector.sequence.push(symbol);

  if (
    state.exileVector.sequence.length === EXILE_VECTOR_CONFIG.sequenceLength
  ) {
    const key = state.exileVector.sequence.join("");
    state.exileVector.zone = exileZoneMap[key] || "Uncharted Exile Quadrant";
  }

  renderCurrentStep();
}

function setStepFocus() {
  if (!state.isOpen) {
    return;
  }

  if (state.currentStep === 0) {
    const firstSignalButton = modalBody.querySelector("[data-morse-value]");
    (firstSignalButton || nextBtn)?.focus();
    return;
  }

  if (state.currentStep === 1) {
    const startMeterButton = document.getElementById("startDamageMeter");
    if (startMeterButton && !startMeterButton.disabled) {
      startMeterButton.focus();
      return;
    }
  }

  if (state.currentStep === 2) {
    const firstVectorButton = modalBody.querySelector("[data-vector]");
    if (firstVectorButton) {
      firstVectorButton.focus();
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
    return;
  }

  if (state.currentStep === 2) {
    const vectorKeys = {
      ArrowUp: "U",
      ArrowDown: "D",
      ArrowLeft: "L",
      ArrowRight: "R",
    };

    const symbol = vectorKeys[event.key];
    if (!symbol) {
      return;
    }

    event.preventDefault();
    appendVectorSymbol(symbol);
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
  const { poofDelayMs, deleteDelayMs } = getDeleteAnimationTimings(
    reducedMotionQuery.matches,
  );

  closeModal({ restoreFocus: false });
  rowToDelete.classList.add("is-tearing");
  addTearFragment(rowToDelete);
  playTearSound(fileType);

  window.setTimeout(() => {
    if (!document.contains(rowToDelete)) {
      return;
    }

    addDustParticles(rowToDelete, fileType, reducedMotionQuery.matches);
    rowToDelete.classList.add("is-poofing", "is-fading");
    playPoofSound(fileType);
  }, poofDelayMs);

  window.setTimeout(() => {
    if (!document.contains(rowToDelete)) {
      return;
    }

    rowToDelete.remove();
    updateFileCountPill();
    ensureEmptyState();
    resultBanner.textContent = `"${fileName}" has been emotionally deleted.`;
    focusPostDeleteTarget();

    state.targetRow = null;
    state.triggerButton = null;
  }, deleteDelayMs);
}

function resetDeleteFlowState(row, fileName, triggerButton) {
  state.currentStep = 0;
  state.targetRow = row;
  state.fileName = fileName;
  state.triggerButton = triggerButton;
  state.morseSequence = "";
  state.morseDecision = "";
  resetDamageMeter();
  state.exileVector = {
    sequence: [],
    zone: "",
  };
}

function setModalOpenState(isOpen) {
  document.body.classList.toggle("modal-open", isOpen);

  if (isOpen) {
    appShell?.setAttribute("inert", "");
    appShell?.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-hidden");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  appShell?.removeAttribute("inert");
  appShell?.removeAttribute("aria-hidden");
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function getRemainingDeleteCount() {
  return fileList.querySelectorAll(DELETE_BUTTON_SELECTOR).length;
}

function updateFileCountPill() {
  const remaining = getRemainingDeleteCount();
  fileCountPill.textContent = `${remaining} files`;
}

function ensureEmptyState() {
  const remaining = getRemainingDeleteCount();
  const emptyRow = fileList.querySelector(EMPTY_STATE_SELECTOR);

  if (remaining === 0 && !emptyRow) {
    const placeholder = document.createElement("li");
    placeholder.className = "file-row file-row-empty";
    placeholder.innerHTML =
      '<p class="file-name">All files deleted. The drama is complete.</p>';
    fileList.appendChild(placeholder);
    return;
  }

  if (remaining > 0 && emptyRow) {
    emptyRow.remove();
  }
}

function focusPostDeleteTarget() {
  const nextDeleteButton = document.querySelector(DELETE_BUTTON_SELECTOR);
  if (nextDeleteButton) {
    nextDeleteButton.focus();
    return;
  }

  resultBanner.setAttribute("tabindex", "-1");
  resultBanner.focus();
}
