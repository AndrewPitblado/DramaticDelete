const modal = document.getElementById("deleteModal");
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
          return `<button type="button" class="reason-option ${selectedClass}" data-reason="${reason}">${reason}</button>`;
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
      farewellInput.focus();
      farewellInput.setSelectionRange(
        farewellInput.value.length,
        farewellInput.value.length,
      );

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
    openModalForRow(row, fileName);
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.isOpen) {
    closeModal();
  }
});

function openModalForRow(row, fileName) {
  state.isOpen = true;
  state.currentStep = 0;
  state.targetRow = row;
  state.fileName = fileName;
  state.reason = "";
  state.farewell = "";
  state.countdownValue = 3;
  state.countdownDone = false;

  resultBanner.textContent = "";
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  renderCurrentStep();
}

function closeModal() {
  state.isOpen = false;
  stopCountdown();
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
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

function performDelete() {
  if (!state.targetRow) {
    closeModal();
    return;
  }

  const fileName = state.fileName;
  state.targetRow.classList.add("is-deleting");

  window.setTimeout(() => {
    state.targetRow?.remove();

    const remaining = fileList.querySelectorAll(".file-row").length;
    fileCountPill.textContent = `${remaining} files`;

    if (remaining === 0) {
      fileList.innerHTML =
        '<li class="file-row"><p class="file-name">All files deleted. The drama is complete.</p></li>';
    }

    resultBanner.textContent = `"${fileName}" has been emotionally deleted.`;
    closeModal();
  }, 500);
}
