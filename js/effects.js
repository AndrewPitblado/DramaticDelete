(() => {
  const { DELETE_TIMINGS, DUST_CONFIG, TEAR_FRAGMENT_CONFIG } =
    window.DD_CONFIG;
  const { getFileTypeConfig } = window.DD_FILE_TYPES;

  function randomInRange(min, range) {
    return min + Math.random() * range;
  }

  function getDeleteAnimationTimings(isReducedMotion) {
    return {
      poofDelayMs: isReducedMotion
        ? DELETE_TIMINGS.reducedMotionPoofDelayMs
        : DELETE_TIMINGS.poofDelayMs,
      deleteDelayMs: isReducedMotion
        ? DELETE_TIMINGS.reducedMotionDeleteDelayMs
        : DELETE_TIMINGS.deleteDelayMs,
    };
  }

  function addTearFragment(rowElement) {
    const tearFragment = document.createElement("span");
    const randomX = randomInRange(
      TEAR_FRAGMENT_CONFIG.xMinPx,
      TEAR_FRAGMENT_CONFIG.xRangePx,
    );
    const randomY = randomInRange(
      TEAR_FRAGMENT_CONFIG.yMinPx,
      TEAR_FRAGMENT_CONFIG.yRangePx,
    );
    const randomRotation = randomInRange(
      TEAR_FRAGMENT_CONFIG.rotationMinDeg,
      TEAR_FRAGMENT_CONFIG.rotationRangeDeg,
    );

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

  function addDustParticles(rowElement, fileType, isReducedMotion) {
    const particleCount = isReducedMotion
      ? DUST_CONFIG.reducedMotionCount
      : DUST_CONFIG.count;
    const palette = getFileTypeConfig(fileType).dustPalette;

    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("span");
      const xDirection = (Math.random() * 2 - 1) * DUST_CONFIG.xRangePx;
      const yDirection =
        DUST_CONFIG.yBasePx - Math.random() * DUST_CONFIG.yRangePx;
      const delay = Math.random() * DUST_CONFIG.delayMaxMs;
      const duration = randomInRange(
        DUST_CONFIG.durationMinMs,
        DUST_CONFIG.durationRangeMs,
      );
      const size = randomInRange(
        DUST_CONFIG.sizeMinPx,
        DUST_CONFIG.sizeRangePx,
      );
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

  window.DD_EFFECTS = Object.freeze({
    addDustParticles,
    addTearFragment,
    getDeleteAnimationTimings,
  });
})();
