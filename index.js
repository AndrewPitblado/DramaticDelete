const { FOCUSABLE_SELECTOR, reasonOptions, UNDO_WINDOW_MS } = window.DD_CONFIG;
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
  pendingUndo: null,
  undoTimer: null,
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
  finalizePendingDelete();

  if (!state.targetRow) {
    closeModal();
    return;
  }

  const rowToDelete = state.targetRow;
  const fileName = state.fileName;
  const fileType = getFileTypeFromName(fileName);
  const nextSibling = rowToDelete.nextElementSibling;
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

    state.pendingUndo = {
      row: rowToDelete,
      fileName,
      nextSibling,
    };
    showUndoBanner(fileName);
    state.undoTimer = window.setTimeout(() => {
      finalizePendingDelete(true);
    }, UNDO_WINDOW_MS);

    state.targetRow = null;
    state.triggerButton = null;
  }, deleteDelayMs);
}

function clearUndoTimer() {
  if (state.undoTimer) {
    window.clearTimeout(state.undoTimer);
    state.undoTimer = null;
  }
}

function updateFileCountPill() {
  const remaining = fileList.querySelectorAll(".delete-btn").length;
  fileCountPill.textContent = `${remaining} files`;
}

function ensureEmptyState() {
  const remaining = fileList.querySelectorAll(".delete-btn").length;
  const emptyRow = fileList.querySelector(".file-row-empty");

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

function showUndoBanner(fileName) {
  resultBanner.classList.add("is-toast");
  resultBanner.innerHTML = `"${fileName}" is gone. Are you sure you don't want to take me back? <button type="button" id="undoDeleteBtn" class="undo-btn">Take me back</button>`;

  const undoButton = document.getElementById("undoDeleteBtn");
  undoButton?.addEventListener("click", undoPendingDelete, { once: true });
  undoButton?.focus();
}

function undoPendingDelete() {
  if (!state.pendingUndo) {
    return;
  }

  clearUndoTimer();
  const { row, nextSibling, fileName } = state.pendingUndo;
  const emptyRow = fileList.querySelector(".file-row-empty");
  emptyRow?.remove();

  if (nextSibling && nextSibling.parentElement === fileList) {
    fileList.insertBefore(row, nextSibling);
  } else {
    fileList.appendChild(row);
  }

  state.pendingUndo = null;
  updateFileCountPill();
  resultBanner.classList.remove("is-toast");
  resultBanner.textContent = `"${fileName}" has been taken back. Love wins for now.`;

  const restoredButton = row.querySelector(".delete-btn");
  restoredButton?.focus();
}

function finalizePendingDelete(showFinalMessage = false) {
  if (!state.pendingUndo) {
    return;
  }

  clearUndoTimer();
  const { fileName } = state.pendingUndo;
  state.pendingUndo = null;
  resultBanner.classList.remove("is-toast");

  if (!showFinalMessage) {
    resultBanner.textContent = "";
    return;
  }

  resultBanner.textContent = `"${fileName}" has been emotionally deleted.`;
  focusPostDeleteTarget();
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
