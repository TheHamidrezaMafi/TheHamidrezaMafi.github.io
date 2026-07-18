const terminalSource = document.querySelector("#terminalSource");
const stage = document.querySelector("#terminalStage");
const hero = document.querySelector(".terminal-hero");
const canvas = document.querySelector("#physicsCanvas");
const restoreButton = document.querySelector("#restoreButton");
const campfireElement = document.querySelector("#asciiCampfire");
const projectDeck = document.querySelector("#projectDeck");
const projectOverlay = document.querySelector("#terminalProjects");
let projectDeckReady = null;

const TONES = {
  dim: "tone-dim",
  green: "tone-green",
  cyan: "tone-cyan",
  amber: "tone-amber",
  bone: "tone-bone",
  coral: "tone-coral",
};

const segmenter = "Segmenter" in Intl
  ? new Intl.Segmenter("en", { granularity: "grapheme" })
  : null;

const glyphsOf = (text) => segmenter
  ? [...segmenter.segment(text)].map(({ segment }) => segment)
  : Array.from(text);

const segment = (text, tone = "bone", cursor = false) => ({ text, tone, cursor });
const blank = (device = "all") => ({ segments: [segment(" ")], device });
const prompt = (command, device = "all") => ({
  device,
  segments: [
    segment("hamidreza@portfolio", "green"),
    segment(" ~ ", "cyan"),
    segment("% ", "dim"),
    segment(command, "bone"),
  ],
});

// Edit this data to personalize the terminal without touching the physics code.
const TERMINAL_LINES = [
  { segments: [segment("HAMIDREZA MAFI", "coral"), segment("  // PERSONAL SYSTEM", "dim")] },
  blank(),

  // Full desktop banner: an HM monogram with identity metadata.
  {
    segments: [segment("██╗  ██╗", "green"), segment(" ███╗   ███╗", "cyan"), segment("   HAMIDREZA MAFI", "bone")],
    device: "desktop",
  },
  {
    segments: [segment("██║  ██║", "green"), segment(" ████╗ ████║", "cyan"), segment("   AI ENGINEER", "amber")],
    device: "desktop",
  },
  {
    segments: [segment("███████║", "green"), segment(" ██╔████╔██║", "cyan"), segment("   FOUNDER / BUILDER", "amber")],
    device: "desktop",
  },
  {
    segments: [segment("██╔══██║", "green"), segment(" ██║╚██╔╝██║", "cyan"), segment("   TEHRAN, IR", "dim")],
    device: "desktop",
  },
  {
    segments: [segment("██║  ██║", "green"), segment(" ██║ ╚═╝ ██║", "cyan"), segment("   STATUS: ONLINE", "green")],
    device: "desktop",
  },
  {
    segments: [segment("╚═╝  ╚═╝", "green"), segment(" ╚═╝     ╚═╝", "cyan"), segment("   BUILD: 2026.07", "dim")],
    device: "desktop",
  },

  // Compact banner for small screens.
  { segments: [segment("╔══════════════════════════════╗", "dim")], device: "mobile" },
  { segments: [segment("║ ", "dim"), segment("██╗  ██╗ ███╗   ███╗", "green"), segment("       ║", "dim")], device: "mobile" },
  { segments: [segment("║ ", "dim"), segment("███████║ ██╔████╔██║", "cyan"), segment("       ║", "dim")], device: "mobile" },
  { segments: [segment("║ ", "dim"), segment("██╔══██║ ██║╚██╔╝██║", "cyan"), segment("       ║", "dim")], device: "mobile" },
  { segments: [segment("║ ", "dim"), segment("AI ENGINEER / FOUNDER", "amber"), segment("        ║", "dim")], device: "mobile" },
  { segments: [segment("╚══════════════════════════════╝", "dim")], device: "mobile" },
  blank(),

  prompt("whoami --full"),
  {
    segments: [segment("name", "cyan"), segment("......... ", "dim"), segment("Hamidreza Mafi", "bone")],
  },
  {
    segments: [segment("current", "cyan"), segment("...... ", "dim"), segment("AI Engineer @ Kareone", "green")],
  },
  {
    segments: [segment("location", "cyan"), segment("..... ", "dim"), segment("Tehran, Iran", "bone")],
  },
  blank(),

  prompt("cat education.toml", "desktop"),
  prompt("cat edu.toml", "mobile"),
  {
    segments: [segment("degree", "cyan"), segment(" = ", "dim"), segment("\"Bachelor of Computer Science\"", "amber")],
  },
  {
    segments: [segment("university", "cyan"), segment(" = ", "dim"), segment("\"University of Tehran\"", "amber")],
  },
  blank(),

  prompt("ps aux | grep founder", "desktop"),
  prompt("ps | grep founder", "mobile"),
  {
    segments: [segment("001", "dim"), segment("  CEO / Founder", "green"), segment("  ggbaaz", "bone")],
  },
  {
    segments: [segment("002", "dim"), segment("  CEO / Founder", "green"), segment("  konkurstudy", "bone")],
  },
  blank("desktop"),
  {
    segments: [
      segment("hamidreza@portfolio", "green"), segment(" ~ ", "cyan"), segment("% ", "dim"), segment("█", "green", true),
    ],
    device: "desktop",
  },
];

function renderTerminal() {
  TERMINAL_LINES.forEach((line, lineIndex) => {
    const lineElement = document.createElement("span");
    lineElement.className = "terminal-line";
    lineElement.style.setProperty("--line-index", lineIndex);
    lineElement.setAttribute("aria-hidden", "true");

    if (line.device === "desktop") lineElement.classList.add("desktop-only");
    if (line.device === "mobile") lineElement.classList.add("mobile-only");

    line.segments.forEach(({ text, tone, cursor }) => {
      glyphsOf(text).forEach((glyph) => {
        const character = document.createElement("span");
        character.className = `char ${TONES[tone] || TONES.bone}`;
        character.textContent = glyph === " " ? "\u00a0" : glyph;

        if (glyph.trim()) {
          character.dataset.glyph = glyph;
          if (cursor && glyph === "█") character.classList.add("char-cursor");
        }

        lineElement.append(character);
      });
    });

    terminalSource.append(lineElement);
  });

  terminalSource.setAttribute(
    "aria-label",
    "Terminal introduction for Hamidreza Mafi, AI Engineer at Kareone in Tehran, Computer Science graduate of the University of Tehran, and CEO and Founder of ggbaaz and konkurstudy. Scroll to reveal selected projects.",
  );
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const FIXED_STEP = 1 / 120;
const GRID_CELL = 18;
const lerp = (start, end, amount) => start + (end - start) * amount;
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const seeded = (index, salt = 0) => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

function setProjectDeckReady(ready) {
  if (projectDeckReady === ready) return false;
  projectDeckReady = ready;
  document.body.classList.toggle("terminal-complete", ready);
  projectOverlay?.setAttribute("aria-hidden", String(!ready));
  if (!projectDeck) return true;

  projectDeck.toggleAttribute("inert", !ready);
  if (ready) {
    projectDeck.removeAttribute("aria-hidden");
  } else {
    projectDeck.setAttribute("aria-hidden", "true");
  }

  return true;
}

class AsciiCampfire {
  constructor(element) {
    this.element = element;
    this.columns = 33;
    this.rows = 25;
    this.heat = new Float32Array(this.columns * this.rows);
    this.nextHeat = new Float32Array(this.heat.length);
    this.cells = [];
    this.sparks = [];
    this.frame = 0;
    this.randomState = 0x5f3759df;
    this.raf = null;
    this.lastFrameTime = 0;
    this.frozen = false;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.animate = this.animate.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
  }

  init() {
    this.buildCells();
    for (let index = 0; index < 64; index += 1) this.advanceHeat();
    this.render();
    document.addEventListener("visibilitychange", this.handleVisibility);
    if (!this.reducedMotion) this.start();
  }

  buildCells() {
    const fragment = document.createDocumentFragment();
    const center = (this.columns - 1) / 2;

    for (let y = 0; y < this.rows; y += 1) {
      const vertical = y / (this.rows - 1);
      const lean = Math.sin(y * 0.72) * 0.55;
      const halfWidth = 1.4 + Math.pow(vertical, 0.63) * 13.1;

      for (let x = 0; x < this.columns; x += 1) {
        if (Math.abs(x - center - lean) > halfWidth) continue;

        const cell = document.createElement("span");
        cell.className = "char fire-cell";
        cell.textContent = "·";
        cell.dataset.particleKind = "fire";
        cell.dataset.radiusScale = "0.67";
        cell.style.left = `${(x / (this.columns - 1)) * 100}%`;
        cell.style.top = `${(y / (this.rows - 1)) * 100}%`;
        fragment.append(cell);
        this.cells.push({ element: cell, x, y, index: y * this.columns + x });
      }
    }

    for (let index = 0; index < 10; index += 1) {
      const spark = document.createElement("span");
      spark.className = "char fire-cell fire-spark";
      spark.textContent = "·";
      spark.dataset.particleKind = "fire";
      spark.dataset.radiusScale = "0.54";
      fragment.append(spark);

      this.sparks.push({
        element: spark,
        progress: 0.04 + seeded(index, 21) * 0.9,
        speed: 0.0038 + seeded(index, 22) * 0.0044,
        origin: (seeded(index, 23) - 0.5) * 36,
        drift: 3 + seeded(index, 24) * 9,
        phase: seeded(index, 25) * Math.PI * 2,
        index,
      });
    }

    this.element.append(fragment);
  }

  random() {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4294967296;
  }

  indexAt(x, y) {
    const safeX = clamp(x, 0, this.columns - 1);
    const safeY = clamp(y, 0, this.rows - 1);
    return safeY * this.columns + safeX;
  }

  advanceHeat() {
    const bottom = this.rows - 1;
    const center = (this.columns - 1) / 2;
    const wind = Math.sin(this.frame * 0.043) * 0.72;

    for (let y = 0; y < this.rows - 2; y += 1) {
      const altitude = 1 - y / bottom;

      for (let x = 0; x < this.columns; x += 1) {
        const turbulentOffset = Math.round(wind + (this.random() - 0.5) * 1.65);
        const sourceX = clamp(x + turbulentOffset, 0, this.columns - 1);
        const below = this.heat[this.indexAt(sourceX, y + 1)];
        const belowLeft = this.heat[this.indexAt(sourceX - 1, y + 1)];
        const belowRight = this.heat[this.indexAt(sourceX + 1, y + 1)];
        const deep = this.heat[this.indexAt(sourceX, y + 2)];
        const cooling = 0.009 + altitude * 0.007 + this.random() * 0.023;
        const diffused = below * 0.36 + belowLeft * 0.19 + belowRight * 0.19 + deep * 0.26;
        this.nextHeat[this.indexAt(x, y)] = Math.max(0, diffused * 0.991 - cooling);
      }
    }

    for (let y = bottom - 1; y <= bottom; y += 1) {
      for (let x = 0; x < this.columns; x += 1) {
        const distance = Math.abs(x - center) / (this.columns * 0.39);
        const envelope = Math.pow(clamp(1 - distance * distance, 0, 1), 0.62);
        const pulse = 0.73 + this.random() * 0.27 + Math.sin(this.frame * 0.11 + x * 0.52) * 0.055;
        const previous = this.heat[this.indexAt(x, y)];
        this.nextHeat[this.indexAt(x, y)] = clamp(envelope * pulse + previous * 0.05, 0, 1);
      }
    }

    [this.heat, this.nextHeat] = [this.nextHeat, this.heat];
    this.nextHeat.fill(0);
    this.frame += 1;

    this.sparks.forEach((spark) => {
      spark.progress += spark.speed;
      if (spark.progress <= 1) return;
      spark.progress = 0;
      spark.origin = (this.random() - 0.5) * 34;
      spark.drift = 3 + this.random() * 9;
      spark.speed = 0.0038 + this.random() * 0.0044;
    });
  }

  fireGlyph(heat, isFuel) {
    if (isFuel && heat > 0.67) return heat > 0.87 ? "█" : "▓";
    if (heat < 0.19) return "·";
    if (heat < 0.3) return ":";
    if (heat < 0.43) return "░";
    if (heat < 0.59) return "▒";
    if (heat < 0.77) return "▓";
    return "█";
  }

  fireColor(heat) {
    if (heat < 0.22) return "#062648";
    if (heat < 0.38) return "#07538d";
    if (heat < 0.56) return "#087fc7";
    if (heat < 0.75) return "#1aa9f1";
    if (heat < 0.91) return "#65c9f7";
    return "#d8f6ff";
  }

  render() {
    this.cells.forEach(({ element, x, y, index }) => {
      const heat = this.heat[this.indexAt(x, y)];
      const isFuel = y >= this.rows - 2;
      const visible = heat > (isFuel ? 0.08 : 0.105);
      const glyph = this.fireGlyph(heat, isFuel);
      const alpha = visible ? clamp((heat - 0.065) / 0.34, 0.09, 1) : 0;

      if (element.textContent !== glyph) element.textContent = glyph;
      element.style.color = this.fireColor(heat);
      element.style.setProperty("--fire-alpha", alpha.toFixed(3));

      if (visible) {
        element.dataset.glyph = glyph;
        const vertical = y / (this.rows - 1);
        const releaseAt = 0.035 + Math.pow(vertical, 0.9) * 0.885 + seeded(index, 31) * 0.055;
        element.dataset.releaseAt = clamp(releaseAt, 0.025, 0.985).toFixed(4);
      } else {
        delete element.dataset.glyph;
        delete element.dataset.releaseAt;
      }
    });

    this.sparks.forEach((spark) => {
      const { element, progress, origin, drift, phase, index } = spark;
      const arc = Math.sin(progress * Math.PI);
      const x = 50 + origin + Math.sin(progress * Math.PI * 2.15 + phase) * drift;
      const y = 88 - progress * 84;
      const shimmer = 0.78 + Math.sin(this.frame * 0.16 + phase) * 0.18;
      const alpha = Math.pow(Math.max(0, arc), 0.58) * shimmer;
      const visible = alpha > 0.16;
      const glyph = progress > 0.72 ? "'" : progress > 0.42 ? "·" : "*";

      element.style.left = `${x.toFixed(2)}%`;
      element.style.top = `${y.toFixed(2)}%`;
      element.style.color = progress > 0.64 ? "#d8f6ff" : "#70cef8";
      element.style.setProperty("--fire-alpha", visible ? alpha.toFixed(3) : "0");
      if (element.textContent !== glyph) element.textContent = glyph;

      if (visible) {
        element.dataset.glyph = glyph;
        element.dataset.releaseAt = clamp(0.02 + (1 - progress) * 0.14 + seeded(index, 32) * 0.018, 0.02, 0.18).toFixed(4);
      } else {
        delete element.dataset.glyph;
        delete element.dataset.releaseAt;
      }
    });
  }

  animate(now) {
    this.raf = null;
    if (this.frozen || document.hidden) return;

    if (!this.lastFrameTime || now - this.lastFrameTime >= 32) {
      this.advanceHeat();
      this.render();
      this.lastFrameTime = now;
    }

    this.raf = requestAnimationFrame(this.animate);
  }

  start() {
    if (this.raf || this.frozen || this.reducedMotion || document.hidden) return;
    this.lastFrameTime = 0;
    this.raf = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastFrameTime = 0;
  }

  freeze() {
    // The DOM already shows the last advanceHeat frame (advance and render
    // always run as a pair), so no re-render is needed here — one would only
    // dirty ~480 elements right before measure() reads their geometry.
    this.frozen = true;
    this.stop();
  }

  resume() {
    this.frozen = false;
    this.start();
  }

  handleVisibility() {
    if (document.hidden) {
      this.stop();
    } else if (!this.frozen) {
      this.start();
    }
  }
}

class GlyphPhysics {
  constructor({ stageElement, heroElement, sourceElement, canvasElement, restoreElement, campfire }) {
    this.stage = stageElement;
    this.hero = heroElement;
    this.source = sourceElement;
    this.canvas = canvasElement;
    this.restoreButton = restoreElement;
    this.campfire = campfire;
    this.ctx = this.canvas.getContext("2d", { alpha: true });

    this.mode = "intact";
    this.particles = [];
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.progress = 0;
    this.releaseAmount = 0;
    this.dragged = null;
    this.pointerId = null;
    this.pointerSamples = [];
    this.raf = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.returnStableFrames = 0;
    this.resizeTimer = null;
    this.allSleepingFrames = 0;
    this.floorPadding = 13;
    this.cardObstacles = [];
    this.projectRevealProgress = 0.38;
    this.projectHideProgress = 0.27;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Released-particle list, maintained incrementally so the solver never
    // re-filters per substep.
    this.activeParticles = [];

    // Reusable integer-keyed spatial grid (counting-sort layout) and support
    // graph buffers — the solver allocates nothing per pass.
    this.gridCellStart = null;
    this.gridCursor = null;
    this.gridEntries = null;
    this.gridCellOf = null;
    this.gridW = 0;
    this.gridH = 0;
    this.gridCells = 0;
    this.adjacencyHead = null;
    this.edgeTo = null;
    this.edgeNext = null;
    this.reachedFlags = null;
    this.supportQueue = null;

    // Pre-rendered glyph sprites keyed by font|color|glyph; rebuilt on measure.
    this.spriteAtlas = new Map();
    this.spriteScratch = null;

    // Terminal glyph geometry cached off the hot path (idle pre-measure), so
    // activation inside the scroll handler avoids ~700 rect reads.
    this.terminalGeometry = null;
    this.resizePending = false;
    this.idleMeasureTimer = null;
    this.createdAt = performance.now();
    this.maxHeightQuery = window.matchMedia("(max-height: 600px)");
    this.lastMaxHeightMatch = this.maxHeightQuery.matches;

    // Device-tilt gravity. The unit vector is in page coordinates (x right,
    // y down); strength scales toward 0 as the phone approaches lying flat,
    // where the screen plane holds no gravity. Defaults reproduce the
    // original straight-down behavior exactly until a sensor sample arrives.
    this.gravityUnitX = 0;
    this.gravityUnitY = 1;
    this.gravityStrength = 1;
    this.gravityActive = false;
    this.smoothedGravityX = 0;
    this.smoothedGravityY = 0.5;
    this.appliedGravityUnitX = 0;
    this.appliedGravityUnitY = 1;
    this.appliedGravityStrength = 1;
    this.motionPermissionRequested = false;
    this.fullReleaseSince = 0;

    this.tick = this.tick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
  }

  async init() {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // No glyph harvest at startup: it would run mid entrance animation and be
    // discarded at activation anyway. Glyphs are pre-measured during idle time
    // once the intro settles; activate() falls back to a full sweep if needed.
    this.measureViewport();
    this.bindEvents();
    this.handleScroll();
    this.scheduleIdleMeasure();
  }

  bindEvents() {
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });

    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);

    this.restoreButton.addEventListener("click", () => this.restore());
    window.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key.toLowerCase() === "r" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        event.preventDefault();
        this.restore();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.mode !== "intact") {
        this.startLoop();
      }
    });

    this.setupGravitySensor();
  }

  setupGravitySensor() {
    if (this.reducedMotion || !("DeviceOrientationEvent" in window)) return;

    const attach = () => {
      window.addEventListener("deviceorientation", this.handleDeviceOrientation, { passive: true });
    };

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS: the permission prompt must come from a user gesture, so the
      // first tap on the page asks. touchend/pointerup carry user
      // activation (pointerdown does not reliably). A rejected promise
      // means the gesture lacked activation — re-arm and retry on the next
      // tap; only a real granted/denied answer latches the flag.
      const disarm = () => {
        window.removeEventListener("touchend", request);
        this.stage.removeEventListener("pointerup", request);
      };
      const arm = () => {
        window.addEventListener("touchend", request, { passive: true });
        this.stage.addEventListener("pointerup", request, { passive: true });
      };
      const request = () => {
        if (this.motionPermissionRequested) return;
        this.motionPermissionRequested = true;
        disarm();
        DeviceOrientationEvent.requestPermission()
          .then((state) => {
            if (state === "granted") attach();
          })
          .catch(() => {
            this.motionPermissionRequested = false;
            arm();
          });
      };
      arm();
    } else {
      attach();
    }
  }

  handleDeviceOrientation(event) {
    const beta = event.beta;
    const gamma = event.gamma;
    if (beta == null || gamma == null) return;

    // Screen-plane gravity in the device's natural (portrait) page frame,
    // in units of g. Derived from the spec's Z-X'-Y'' intrinsic rotations:
    // gravity_device = (sin(gamma)cos(beta), -sin(beta), -cos(gamma)cos(beta)),
    // then mapped to page coordinates (x right, y down = -device y).
    const betaRad = beta * (Math.PI / 180);
    const gammaRad = gamma * (Math.PI / 180);
    const portraitX = Math.sin(gammaRad) * Math.cos(betaRad);
    const portraitY = Math.sin(betaRad);

    // Rotate into the current screen orientation. Per the Screen Orientation
    // spec, angle is how far the screen is rotated COUNTER-clockwise from
    // its natural orientation, so device-natural page vectors map into the
    // current page frame by a -angle rotation.
    const orientationDegrees = screen.orientation && typeof screen.orientation.angle === "number"
      ? screen.orientation.angle
      : Number(window.orientation) || 0;
    const orientation = orientationDegrees * (Math.PI / 180);
    const cos = Math.cos(orientation);
    const sin = Math.sin(orientation);
    const planarX = portraitX * cos + portraitY * sin;
    const planarY = -portraitX * sin + portraitY * cos;

    // Low-pass the raw planar vector, not the unit vector: a flip through
    // flat then passes through zero (strength fades out and back in) with
    // no antipodal fixed point. A flat phone has no in-plane gravity, so
    // strength fades out instead of chasing an unstable direction; full
    // strength from ~30 degrees of tilt.
    const blend = 0.25;
    this.smoothedGravityX += (planarX - this.smoothedGravityX) * blend;
    this.smoothedGravityY += (planarY - this.smoothedGravityY) * blend;
    const magnitude = Math.hypot(this.smoothedGravityX, this.smoothedGravityY);
    const strength = clamp(magnitude / 0.5, 0, 1);
    let unitX = this.gravityUnitX;
    let unitY = this.gravityUnitY;
    if (magnitude > 0.04) {
      unitX = this.smoothedGravityX / magnitude;
      unitY = this.smoothedGravityY / magnitude;
    }

    // Sensor-bearing laptops and near-upright phones stay on the exact
    // default behavior; only a deliberate tilt away from straight-down
    // (~8 degrees) or toward flat switches the sim into tilt mode.
    if (!this.gravityActive) {
      if (unitY > 0.99 && strength > 0.75) return;
      this.gravityActive = true;
      this.fullReleaseSince = 0;
    }

    this.gravityUnitX = unitX;
    this.gravityUnitY = unitY;
    this.gravityStrength = strength;

    // A meaningful swing has to wake sleeping glyphs and restart the loop —
    // a settled pile must not stay glued mid-air when the floor effectively
    // moves. Comparing strength-scaled vectors makes direction noise
    // self-suppressing as strength fades near flat.
    if (this.mode !== "falling") return;
    const deltaX = unitX * strength - this.appliedGravityUnitX * this.appliedGravityStrength;
    const deltaY = unitY * strength - this.appliedGravityUnitY * this.appliedGravityStrength;
    if (Math.hypot(deltaX, deltaY) <= 0.15) return;

    // Tilting while the hero is scrolled out of view shouldn't grind an
    // invisible pile; the un-updated applied vector lets the first
    // in-view event catch up and wake everything then.
    if (this.hero.getBoundingClientRect().bottom <= 0) return;

    this.appliedGravityUnitX = unitX;
    this.appliedGravityUnitY = unitY;
    this.appliedGravityStrength = strength;
    const particles = this.particles;
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released || !particle.sleeping) continue;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
    }
    this.allSleepingFrames = 0;
    this.startLoop();
  }

  handleResize() {
    // Mark immediately (not in the debounce) so an activation racing a real
    // resize distrusts the terminal geometry cache and re-reads the DOM.
    this.resizePending = true;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.onResizeSettled(), 120);
  }

  onResizeSettled() {
    const stageRect = this.stage.getBoundingClientRect();
    const width = Math.max(1, stageRect.width);
    const height = Math.max(1, stageRect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const compactHeight = this.maxHeightQuery.matches;

    // Mobile URL-bar show/hide fires resize without changing the 100svh stage
    // or any glyph geometry. Skipping the re-measure keeps a settled pile
    // asleep and avoids reallocating the canvas mid-interaction.
    if (
      width === this.width
      && height === this.height
      && dpr === this.dpr
      && compactHeight === this.lastMaxHeightMatch
    ) {
      this.resizePending = false;
      return;
    }

    this.terminalGeometry = null;
    if (this.mode === "intact") {
      // Nothing is simulating; resize the canvas and let idle time re-measure.
      this.measureViewport(stageRect);
      this.resizePending = false;
      this.scheduleIdleMeasure();
    } else {
      this.measure();
      this.resizePending = false;
    }
  }

  introSettled() {
    return document.body.classList.contains("intro-skipped")
      || performance.now() - this.createdAt > 2900;
  }

  scheduleIdleMeasure() {
    if (this.reducedMotion) return;
    window.clearTimeout(this.idleMeasureTimer);

    const attempt = () => {
      try {
        if (this.mode !== "intact" || this.resizePending || this.terminalGeometry) return;
        if (!this.introSettled()) {
          this.scheduleIdleMeasure();
          return;
        }
        this.readTerminalGeometry(this.stage.getBoundingClientRect());
      } catch {
        // Activation falls back to the full synchronous sweep.
      }
    };

    const delay = this.introSettled() ? 80 : 3000;
    this.idleMeasureTimer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(attempt, { timeout: 1500 });
      } else {
        window.setTimeout(attempt, 60);
      }
    }, delay);
  }

  measureViewport(stageRect = this.stage.getBoundingClientRect()) {
    this.width = Math.max(1, stageRect.width);
    this.height = Math.max(1, stageRect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.floorPadding = this.width < 700 ? 11 : 15;
    this.lastMaxHeightMatch = this.maxHeightQuery.matches;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.spriteAtlas.clear();
    return stageRect;
  }

  readTerminalGeometry(stageRect) {
    const entries = [];
    for (const element of this.source.querySelectorAll("[data-glyph]")) {
      const rect = element.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      entries.push({
        element,
        homeX: rect.left - stageRect.left + rect.width / 2,
        homeY: rect.top - stageRect.top + rect.height / 2,
        glyphWidth: rect.width,
      });
    }

    // Only geometry read after the entrance animation settled may be cached —
    // an early sweep would bake the transient translateY(4px) into homeY.
    if (this.introSettled()) {
      this.terminalGeometry = {
        width: Math.max(1, stageRect.width),
        height: Math.max(1, stageRect.height),
        compactHeight: this.maxHeightQuery.matches,
        entries,
      };
    }
    return entries;
  }

  readFireGeometry(stageRect) {
    const campfire = this.campfire;
    if (!campfire) return [];
    const fireRect = campfire.element.getBoundingClientRect();
    if (!(fireRect.width > 0 && fireRect.height > 0)) return [];

    // Fire cells sit at known percentages of the campfire box with
    // translate(-50%, -50%) centering, so their centers are pure arithmetic —
    // no per-cell rect reads. One sample per kind supplies the 1ch width.
    const entries = [];
    const lastColumn = campfire.columns - 1;
    const lastRow = campfire.rows - 1;
    let cellWidth = 0;
    let sparkWidth = 0;

    for (const cell of campfire.cells) {
      const element = cell.element;
      if (!element.dataset.glyph) continue;
      if (!cellWidth) cellWidth = element.getBoundingClientRect().width;
      entries.push({
        element,
        homeX: fireRect.left - stageRect.left + (cell.x / lastColumn) * fireRect.width,
        homeY: fireRect.top - stageRect.top + (cell.y / lastRow) * fireRect.height,
        glyphWidth: cellWidth,
      });
    }

    for (const spark of campfire.sparks) {
      const element = spark.element;
      if (!element.dataset.glyph) continue;
      const left = Number.parseFloat(element.style.left);
      const top = Number.parseFloat(element.style.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
      if (!sparkWidth) sparkWidth = element.getBoundingClientRect().width;
      entries.push({
        element,
        homeX: fireRect.left - stageRect.left + (left / 100) * fireRect.width,
        homeY: fireRect.top - stageRect.top + (top / 100) * fireRect.height,
        glyphWidth: sparkWidth,
      });
    }

    return entries;
  }

  measure() {
    const previousWidth = this.width;
    const previousHeight = this.height;

    // ---- Read phase: every DOM read runs against one clean layout, before
    // this function performs any DOM or canvas write. ----
    const stageRect = this.stage.getBoundingClientRect();
    const width = Math.max(1, stageRect.width);
    const height = Math.max(1, stageRect.height);

    const cacheValid = this.terminalGeometry
      && !this.resizePending
      && this.terminalGeometry.width === width
      && this.terminalGeometry.height === height
      && this.terminalGeometry.compactHeight === this.maxHeightQuery.matches;
    const terminalEntries = cacheValid
      ? this.terminalGeometry.entries
      : this.readTerminalGeometry(stageRect);
    const fireEntries = this.readFireGeometry(stageRect);
    const nextCardObstacles = projectDeckReady ? this.readCardObstacles() : [];

    // Computed style is resolved once per unique class, not once per glyph:
    // tone colors and fonts are class-level constants. Alpha is pinned to 1
    // for terminal glyphs (the blinking cursor and mid-fall .released spans
    // otherwise capture a transient 0 and vanish from the canvas).
    const styleCache = new Map();
    const styleFor = (element) => {
      let entry = styleCache.get(element.className);
      if (!entry) {
        const style = getComputedStyle(element);
        entry = {
          color: style.color,
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          fontSize: Number.parseFloat(style.fontSize) || 14,
        };
        styleCache.set(element.className, entry);
      }
      return entry;
    };

    const priorByElement = new Map(this.particles.map((particle) => [particle.element, particle]));
    const nextParticles = [];
    const scaleX = previousWidth > 1 ? width / previousWidth : 1;
    const scaleY = previousHeight > 1 ? height / previousHeight : 1;

    const harvest = ({ element, homeX, homeY, glyphWidth }) => {
      const style = styleFor(element);
      const kind = element.dataset.particleKind || "terminal";
      const radiusScale = Number.parseFloat(element.dataset.radiusScale) || 1;
      const radius = kind === "fire"
        ? clamp(glyphWidth * 0.57 * radiusScale, 2.2, 5.1)
        : clamp(glyphWidth * 0.57 * radiusScale, 3.8, 7.2);
      const existing = priorByElement.get(element);

      const particle = existing || {
        element,
        glyph: element.dataset.glyph,
        x: homeX,
        y: homeY,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
        released: false,
        sleeping: false,
        sleepTimer: 0,
        energyAverage: 0,
        supported: false,
        dragging: false,
      };

      if (existing && this.mode !== "intact") {
        particle.x *= scaleX;
        particle.y *= scaleY;
      } else {
        particle.x = homeX;
        particle.y = homeY;
      }

      particle.homeX = homeX;
      particle.homeY = homeY;
      particle.glyph = element.dataset.glyph;
      particle.kind = kind;
      particle.radius = radius;
      if (kind === "fire") {
        // The campfire wrote these inline for the frozen frame; reading them
        // back avoids any computed-style resolution.
        particle.color = element.style.color;
        const inlineAlpha = Number.parseFloat(element.style.getPropertyValue("--fire-alpha"));
        particle.alpha = Number.isFinite(inlineAlpha) ? inlineAlpha : 1;
      } else {
        particle.color = style.color;
        particle.alpha = 1;
      }
      particle.font = style.font;
      particle.fontSize = style.fontSize;
      particle.index = nextParticles.length;
      particle.sprite = null;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.previousAngle = particle.angle;
      nextParticles.push(particle);
    };

    terminalEntries.forEach(harvest);
    fireEntries.forEach(harvest);

    let minY = 0;
    let maxY = 1;
    for (let i = 0; i < nextParticles.length; i += 1) {
      const homeY = nextParticles[i].homeY;
      if (homeY < minY) minY = homeY;
      if (homeY > maxY) maxY = homeY;
    }
    maxY = Math.max(maxY, minY + 1);

    nextParticles.forEach((particle, index) => {
      const verticalOrder = (particle.homeY - minY) / Math.max(1, maxY - minY);
      const explicitRelease = Number.parseFloat(particle.element.dataset.releaseAt);
      particle.releaseAt = Number.isFinite(explicitRelease)
        ? clamp(explicitRelease, 0, 1)
        : clamp(verticalOrder * 0.73 + seeded(index, 2) * 0.27, 0, 1);

      if (this.mode === "returning" && particle.released) {
        particle.element.classList.add("released");
      } else if (this.mode === "intact") {
        particle.released = false;
        particle.element.classList.remove("released");
      }
    });

    this.particles = nextParticles;
    this.activeParticles = nextParticles.filter((particle) => particle.released);

    // ---- Write phase: canvas sizing and dimension state, after all reads. ----
    this.measureViewport(stageRect);

    if (projectDeckReady) {
      this.cardObstacles = nextCardObstacles;
      this.projectParticlesOutOfCards();
    }

    if (this.mode === "falling") {
      this.releaseParticles(this.releaseAmount);
      this.particles.forEach((particle) => {
        if (!particle.released) return;
        particle.sleeping = false;
        particle.sleepTimer = 0;
        particle.energyAverage = 0;
        particle.supported = false;
      });
      this.allSleepingFrames = 0;
      this.startLoop();
    } else if (this.mode === "returning") {
      this.startLoop();
    }

    this.draw();
  }

  handleScroll() {
    const rect = this.hero.getBoundingClientRect();
    const scrollableDistance = Math.max(1, this.hero.offsetHeight - window.innerHeight);
    this.progress = clamp(-rect.top / scrollableDistance, 0, 1);
    this.stage.style.setProperty("--progress", this.progress.toFixed(4));

    if (window.scrollY > 4) document.body.classList.add("intro-skipped");

    if (this.reducedMotion) {
      if (!projectDeckReady && this.progress > this.projectRevealProgress) setProjectDeckReady(true);
      if (projectDeckReady && this.progress < this.projectHideProgress) setProjectDeckReady(false);
      return;
    }

    if (this.mode === "intact" && this.progress > 0.035) {
      this.activate();
    }

    if (this.mode === "falling") {
      this.releaseAmount = smoothstep(0.035, 0.2, this.progress);
      this.releaseParticles(this.releaseAmount);

      if (this.progress < 0.026) this.beginReturn();
    } else if (this.mode === "returning" && this.progress > 0.105) {
      this.resumeFall();
    }

    const canRestore = this.mode !== "intact" && this.progress > 0.11;
    this.restoreButton.classList.toggle("visible", canRestore);
    this.restoreButton.disabled = !canRestore;

    if (projectDeckReady && this.progress < this.projectHideProgress) {
      this.deactivateProjectDeck(true);
    } else {
      this.maybeActivateProjectDeck(true);
    }
  }

  activate() {
    // Freeze the exact live fire frame before measuring. Its visible DOM cells
    // then become the immutable glyph bodies used throughout fall and return.
    this.campfire?.freeze();
    this.measure();
    this.mode = "falling";
    this.stage.classList.add("scene-active");
    this.stage.classList.remove("returning");
    this.canvas.classList.add("active");
    const canRestore = this.progress > 0.11;
    this.restoreButton.classList.toggle("visible", canRestore);
    this.restoreButton.disabled = !canRestore;
    document.body.classList.add("physics-active", "intro-skipped");
    this.startLoop();
  }

  releaseParticles(amount) {
    let releasedAny = false;
    this.particles.forEach((particle) => {
      if (!particle.released && particle.releaseAt <= amount) {
        particle.released = true;
        particle.sleeping = false;
        particle.sleepTimer = 0;
        particle.energyAverage = 0;
        particle.supported = false;
        particle.x = particle.homeX;
        particle.y = particle.homeY;
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.previousAngle = particle.angle;
        if (particle.kind === "fire") {
          particle.vx = lerp(-24, 24, seeded(particle.index, 4));
          particle.vy = lerp(2, 25, seeded(particle.index, 6));
          particle.angularVelocity = lerp(-2.3, 2.3, seeded(particle.index, 8));
        } else {
          particle.vx = lerp(-42, 42, seeded(particle.index, 4));
          particle.vy = lerp(-34, -6, seeded(particle.index, 6));
          particle.angularVelocity = lerp(-4.2, 4.2, seeded(particle.index, 8));
        }
        particle.element.classList.add("released");
        releasedAny = true;
      }
    });

    if (releasedAny) {
      // Rebuilding via filter keeps particle-array index order, which the
      // sequential PBD solver depends on.
      this.activeParticles = this.particles.filter((particle) => particle.released);
      this.startLoop();
    }
  }

  readCardObstacles() {
    if (!projectDeck) return [];
    const stageRect = this.stage.getBoundingClientRect();
    const inset = 1.25;

    return [...projectDeck.querySelectorAll(".project-card")].map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        index,
        left: rect.left - stageRect.left + inset,
        right: rect.right - stageRect.left - inset,
        top: rect.top - stageRect.top + inset,
        bottom: rect.bottom - stageRect.top - inset,
      };
    }).filter((obstacle) => obstacle.right > obstacle.left && obstacle.bottom > obstacle.top);
  }

  measureCardObstacles() {
    this.cardObstacles = projectDeckReady ? this.readCardObstacles() : [];
  }

  maybeActivateProjectDeck(startLoop) {
    if (projectDeckReady || this.mode !== "falling" || this.progress < this.projectRevealProgress) {
      this.fullReleaseSince = 0;
      return;
    }
    const active = this.activeParticles;
    if (!active.length || active.length !== this.particles.length) {
      this.fullReleaseSince = 0;
      return;
    }
    if (!this.fullReleaseSince) this.fullReleaseSince = performance.now();

    const potentialObstacles = this.readCardObstacles();
    if (!potentialObstacles.length) return;

    if (this.gravityActive) {
      // Tilted gravity can pile glyphs anywhere, so "fell past the cards"
      // stops being meaningful. Reveal once the card area itself is clear —
      // or after a grace period, since activateProjectDeck projects any
      // overlapping glyphs out gently anyway.
      if (performance.now() - this.fullReleaseSince < 2500) {
        let cleared = 0;
        for (let i = 0; i < active.length; i += 1) {
          const particle = active[i];
          let outside = true;
          for (let j = 0; j < potentialObstacles.length; j += 1) {
            const obstacle = potentialObstacles[j];
            const margin = particle.radius + 3;
            if (
              particle.x > obstacle.left - margin
              && particle.x < obstacle.right + margin
              && particle.y > obstacle.top - margin
              && particle.y < obstacle.bottom + margin
            ) {
              outside = false;
              break;
            }
          }
          if (outside) cleared += 1;
        }
        if (cleared / active.length < 0.94) return;
      }
    } else {
      const clearanceY = Math.max(...potentialObstacles.map((obstacle) => obstacle.bottom)) + 3;
      const cleared = active.filter((particle) => particle.y - particle.radius >= clearanceY).length;

      // Reveal only after the fall has genuinely cleared the card area. A tiny
      // tolerance keeps one late bouncing glyph from withholding the whole deck.
      if (cleared / active.length < 0.94) return;
    }

    this.activateProjectDeck(startLoop);
  }

  activateProjectDeck(startLoop = true) {
    if (!setProjectDeckReady(true)) return;
    this.measureCardObstacles();
    this.projectParticlesOutOfCards();
    this.draw();
    if (startLoop) this.startLoop();
  }

  deactivateProjectDeck(startLoop = true) {
    if (!setProjectDeckReady(false)) return;
    this.cardObstacles = [];
    this.particles.forEach((particle) => {
      if (!particle.released || !particle.obstacleSupported) return;
      particle.obstacleSupported = false;
      particle.supported = false;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
    });
    if (startLoop) this.startLoop();
  }

  projectParticlesOutOfCards() {
    this.particles.forEach((particle) => {
      if (!particle.released) return;
      const collided = this.resolveCardParticle(particle, true);
      if (!collided) return;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
      particle.vx *= 0.16;
      particle.vy *= 0.16;
      particle.angularVelocity *= 0.5;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.previousAngle = particle.angle;
    });
  }

  beginReturn() {
    if (this.mode === "returning") return;
    this.deactivateProjectDeck(false);
    this.fullReleaseSince = 0;
    this.mode = "returning";
    this.stage.classList.add("returning");
    this.returnStableFrames = 0;
    this.allSleepingFrames = 0;
    this.restoreButton.classList.remove("visible");
    this.restoreButton.disabled = true;
    this.particles.forEach((particle) => {
      if (!particle.released) return;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
      particle.supported = false;
      particle.dragging = false;
    });
    this.dragged = null;
    this.canvas.classList.remove("dragging");
    this.startLoop();
  }

  resumeFall() {
    this.mode = "falling";
    this.stage.classList.remove("returning");
    this.returnStableFrames = 0;
    this.particles.forEach((particle) => {
      if (!particle.released) return;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
      particle.supported = false;
      // The nudge falls along the current gravity direction (straight down
      // by default).
      const kick = lerp(10, 55, seeded(particle.index, 10));
      particle.vx += kick * this.gravityUnitX;
      particle.vy += kick * this.gravityUnitY;
    });
    this.startLoop();
  }

  restore() {
    window.scrollTo({ top: 0, behavior: this.reducedMotion ? "auto" : "smooth" });
    if (this.mode !== "intact") this.beginReturn();
  }

  startLoop() {
    if (this.raf || document.hidden || this.reducedMotion) return;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTime = 0;
    this.accumulator = 0;
  }

  tick(now) {
    this.raf = null;
    const elapsed = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.accumulator = Math.min(this.accumulator + elapsed, 1 / 15);
    let steps = 0;

    // Cap 3, not 6: after a hitch, one 6-substep catch-up frame usually blows
    // its own deadline and decays into several more. Bleeding the excess keeps
    // at most one substep of leftover (what draw()'s interpolation expects) at
    // the cost of brief slow-motion during frames that were already dropped.
    while (this.accumulator >= FIXED_STEP && steps < 3) {
      if (this.mode === "falling") this.stepFalling(FIXED_STEP);
      if (this.mode === "returning") this.stepReturning(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    this.accumulator = Math.min(this.accumulator, FIXED_STEP);

    this.maybeActivateProjectDeck(false);

    this.draw();

    if (this.mode === "returning" && this.returnStableFrames > 7) {
      this.finishReturn();
      return;
    }

    let moving = false;
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      if (particle.released && (!particle.sleeping || particle.dragging)) {
        moving = true;
        break;
      }
    }
    if (this.mode === "falling" && !moving) {
      this.allSleepingFrames += 1;
    } else {
      this.allSleepingFrames = 0;
    }

    // A pending tilt-mode deck reveal must outlive a fully sleeping pile:
    // the 2.5s grace deadline in maybeActivateProjectDeck needs a driver,
    // so the loop keeps ticking (bounded by the grace window) until the
    // deck activates.
    const revealPending = this.gravityActive
      && !projectDeckReady
      && this.mode === "falling"
      && this.fullReleaseSince > 0
      && this.progress >= this.projectRevealProgress;

    if (
      this.mode === "returning"
      || (this.mode === "falling" && (moving || this.allSleepingFrames < 2 || revealPending))
    ) {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  stepFalling(dt) {
    const gravity = 1450;
    const floor = this.height - this.floorPadding;
    const linearAirRetention = Math.exp(-0.2 * dt);
    const angularAirRetention = Math.exp(-0.28 * dt);
    const particles = this.particles;
    const gravityX = gravity * this.gravityStrength * this.gravityUnitX;
    const gravityY = gravity * this.gravityStrength * this.gravityUnitY;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      // Flag resets and the previous-position snapshot are unconditional:
      // particles woken mid-solve reconstruct velocity from this snapshot.
      particle.contactCount = 0;
      particle.grounded = false;
      particle.supported = false;
      particle.obstacleSupported = false;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.previousAngle = particle.angle;

      if (!particle.released || particle.dragging || particle.sleeping) continue;

      particle.vx += gravityX * dt;
      particle.vy += gravityY * dt;
      particle.vx *= linearAirRetention;
      particle.vy *= linearAirRetention;
      particle.angularVelocity *= angularAirRetention;

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += particle.angularVelocity * dt;
    }

    this.resolveCollisions(floor);
    this.reconcileConstraintVelocities(dt);
    this.applyContactFriction(dt);
    this.updateSleeping(dt);
  }

  reconcileConstraintVelocities(dt) {
    const particles = this.particles;
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released || particle.dragging || particle.sleeping) continue;
      particle.vx = (particle.x - particle.previousX) / dt;
      particle.vy = (particle.y - particle.previousY) / dt;
    }
  }

  solveBounds(active, floor) {
    // A wall supports a particle only when gravity presses it into that wall.
    // With the default (0, 1) gravity this reduces exactly to the original
    // floor-only behavior.
    const leftSupports = this.gravityUnitX < -0.3;
    const rightSupports = this.gravityUnitX > 0.3;
    const floorSupports = this.gravityUnitY > 0.3;
    const ceilingSupports = this.gravityUnitY < -0.3;

    for (let i = 0; i < active.length; i += 1) {
      const particle = active[i];
      if (particle.dragging) continue;

      if (particle.x - particle.radius < 0) {
        particle.x = particle.radius;
        if (leftSupports) particle.supported = true;
      } else if (particle.x + particle.radius > this.width) {
        particle.x = this.width - particle.radius;
        if (rightSupports) particle.supported = true;
      }

      if (particle.y + particle.radius > floor) {
        particle.y = floor - particle.radius;
        particle.grounded = true;
        if (floorSupports) particle.supported = true;
      }

      if (particle.y - particle.radius < 0) {
        particle.y = particle.radius;
        if (ceilingSupports) particle.supported = true;
      }
    }
  }

  resolveCardParticle(particle, activationProjection = false) {
    let collided = false;
    const slop = 0.025;
    const obstacles = this.cardObstacles;

    for (let i = 0; i < obstacles.length; i += 1) {
      const obstacle = obstacles[i];
      const closestX = clamp(particle.x, obstacle.left, obstacle.right);
      const closestY = clamp(particle.y, obstacle.top, obstacle.bottom);
      let dx = particle.x - closestX;
      let dy = particle.y - closestY;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = particle.radius * particle.radius;

      if (distanceSquared >= radiusSquared) continue;

      let nx = 0;
      let ny = 0;
      let penetration = 0;

      if (distanceSquared > 0.000001) {
        const distance = Math.sqrt(distanceSquared);
        nx = dx / distance;
        ny = dy / distance;
        penetration = particle.radius - distance + slop;
        particle.x += nx * penetration;
        particle.y += ny * penetration;
      } else {
        // The center is inside the card. Eject through the nearest face so a
        // card revealed near one late glyph cannot manufacture an explosion.
        const faces = [
          { distance: Math.abs(particle.x - obstacle.left), nx: -1, ny: 0, axis: "x", value: obstacle.left - particle.radius - slop },
          { distance: Math.abs(obstacle.right - particle.x), nx: 1, ny: 0, axis: "x", value: obstacle.right + particle.radius + slop },
          { distance: Math.abs(particle.y - obstacle.top), nx: 0, ny: -1, axis: "y", value: obstacle.top - particle.radius - slop },
          { distance: Math.abs(obstacle.bottom - particle.y), nx: 0, ny: 1, axis: "y", value: obstacle.bottom + particle.radius + slop },
        ];
        const face = faces.reduce((nearest, candidate) => candidate.distance < nearest.distance ? candidate : nearest);
        nx = face.nx;
        ny = face.ny;
        penetration = face.distance + particle.radius + slop;
        if (face.axis === "x") particle.x = face.value;
        if (face.axis === "y") particle.y = face.value;
      }

      collided = true;
      particle.contactCount = (particle.contactCount || 0) + 1;
      particle.obstacleSupported ||= ny < -0.45;

      if (particle.sleeping && (penetration > 0.12 || activationProjection)) {
        particle.sleeping = false;
        particle.sleepTimer = 0;
        particle.energyAverage = 0;
      }

      // Static card contacts are intentionally almost inelastic. The PBD
      // velocity reconstruction removes inward speed; this trims residual spin.
      if (!particle.dragging && !activationProjection) particle.angularVelocity *= 0.985;
    }

    return collided;
  }

  solveCardCollisions(active) {
    if (!this.cardObstacles.length) return;
    for (let i = 0; i < active.length; i += 1) {
      this.resolveCardParticle(active[i]);
    }
  }

  isSupportedByCard(particle) {
    const obstacles = this.cardObstacles;
    if (!obstacles.length) return false;
    const tolerance = 0.72;

    if (!this.gravityActive) {
      // Original exact model: resting on a card's top edge.
      for (let i = 0; i < obstacles.length; i += 1) {
        const obstacle = obstacles[i];
        if (
          particle.x + particle.radius > obstacle.left - tolerance
          && particle.x - particle.radius < obstacle.right + tolerance
          && particle.y <= obstacle.top
          && Math.abs(particle.y + particle.radius - obstacle.top) <= tolerance
        ) {
          return true;
        }
      }
      return false;
    }

    // Tilt mode: a card supports the particle when the contact normal at the
    // closest point opposes gravity — any card face can be a floor.
    for (let i = 0; i < obstacles.length; i += 1) {
      const obstacle = obstacles[i];
      const closestX = clamp(particle.x, obstacle.left, obstacle.right);
      const closestY = clamp(particle.y, obstacle.top, obstacle.bottom);
      const dx = particle.x - closestX;
      const dy = particle.y - closestY;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 0.000001) continue;
      const distance = Math.sqrt(distanceSquared);
      if (distance > particle.radius + tolerance) continue;
      const normalAlignment = (dx * this.gravityUnitX + dy * this.gravityUnitY) / distance;
      if (normalAlignment < -0.45) return true;
    }
    return false;
  }

  ensureGrid(particleCount) {
    const gridW = Math.ceil(this.width / GRID_CELL) + 2;
    const gridH = Math.ceil(this.height / GRID_CELL) + 2;
    const cells = gridW * gridH;
    if (!this.gridCellStart || this.gridCellStart.length < cells + 1) {
      this.gridCellStart = new Int32Array(cells + 1);
      this.gridCursor = new Int32Array(cells);
    }
    if (!this.gridEntries || this.gridEntries.length < particleCount) {
      const capacity = Math.max(particleCount, 256);
      this.gridEntries = new Int32Array(capacity);
      this.gridCellOf = new Int32Array(capacity);
    }
    this.gridW = gridW;
    this.gridH = gridH;
    this.gridCells = cells;
  }

  fillGrid(active) {
    const gridW = this.gridW;
    const gridH = this.gridH;
    const cells = this.gridCells;
    const start = this.gridCellStart;
    const cursor = this.gridCursor;
    const entries = this.gridEntries;
    const cellOf = this.gridCellOf;

    start.fill(0, 0, cells + 1);
    for (let i = 0; i < active.length; i += 1) {
      const particle = active[i];
      // The +1 border row/column on every side holds the slightly
      // out-of-bounds cells a card ejection can produce; anything further out
      // is unreachable in practice and clamped defensively (a false pair
      // candidate is rejected by resolvePair's distance check anyway).
      let cellX = Math.floor(particle.x / GRID_CELL) + 1;
      let cellY = Math.floor(particle.y / GRID_CELL) + 1;
      if (cellX < 0) cellX = 0;
      else if (cellX >= gridW) cellX = gridW - 1;
      if (cellY < 0) cellY = 0;
      else if (cellY >= gridH) cellY = gridH - 1;
      const cell = cellY * gridW + cellX;
      cellOf[i] = cell;
      start[cell + 1] += 1;
    }
    for (let cell = 0; cell < cells; cell += 1) start[cell + 1] += start[cell];
    cursor.set(start.subarray(0, cells));
    // Filling in ascending order keeps each bucket in particle-index order,
    // matching the old push-based build — the sequential PBD solver's
    // resolution order (and therefore settle positions) depends on it.
    for (let i = 0; i < active.length; i += 1) {
      entries[cursor[cellOf[i]]] = i;
      cursor[cellOf[i]] += 1;
    }
  }

  resolveCollisions(floor) {
    const active = this.activeParticles;
    this.ensureGrid(active.length);

    // Re-solve both the floor and pair constraints several times. This lets a
    // resting impulse propagate through the full stack instead of allowing the
    // bottom row to be pushed through the floor and corrected next frame.
    // The per-pass leading bounds sweep was a provable no-op straight after
    // the previous pass's trailing one, so a single hoisted call replaces it;
    // the leading card sweep stays (narrow mobile channels can re-wedge a
    // wall-clamped glyph into a card between passes).
    this.solveBounds(active, floor);

    for (let pass = 0; pass < 6; pass += 1) {
      this.solveCardCollisions(active);
      this.fillGrid(active);
      const gridW = this.gridW;
      const gridH = this.gridH;
      const start = this.gridCellStart;
      const entries = this.gridEntries;

      for (let indexA = 0; indexA < active.length; indexA += 1) {
        const a = active[indexA];
        const cellX = Math.floor(a.x / GRID_CELL) + 1;
        const cellY = Math.floor(a.y / GRID_CELL) + 1;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const rowY = cellY + offsetY;
          if (rowY < 0 || rowY >= gridH) continue;
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const colX = cellX + offsetX;
            if (colX < 0 || colX >= gridW) continue;
            const cell = rowY * gridW + colX;
            for (let slot = start[cell]; slot < start[cell + 1]; slot += 1) {
              const indexB = entries[slot];
              if (indexB <= indexA) continue;
              this.resolvePair(a, active[indexB]);
            }
          }
        }
      }

      this.solveCardCollisions(active);
      this.solveBounds(active, floor);
    }

    this.updateSupportGraph(active, floor);
  }

  ensureSupportBuffers(count) {
    if (!this.adjacencyHead || this.adjacencyHead.length < count) {
      const capacity = Math.max(count, 256);
      this.adjacencyHead = new Int32Array(capacity);
      this.reachedFlags = new Uint8Array(capacity);
      this.supportQueue = new Int32Array(capacity);
    }
    if (!this.edgeTo) {
      const capacity = Math.max(count * 8, 1024);
      this.edgeTo = new Int32Array(capacity);
      this.edgeNext = new Int32Array(capacity);
    }
  }

  growEdgeBuffers() {
    const nextTo = new Int32Array(this.edgeTo.length * 2);
    nextTo.set(this.edgeTo);
    this.edgeTo = nextTo;
    const nextNext = new Int32Array(this.edgeNext.length * 2);
    nextNext.set(this.edgeNext);
    this.edgeNext = nextNext;
  }

  updateSupportGraph(active, floor) {
    const count = active.length;
    this.ensureSupportBuffers(count);
    // Support/sleep classification must see post-solve positions, so the grid
    // is refilled once more after the final pass moved particles.
    this.fillGrid(active);

    const adjacencyHead = this.adjacencyHead;
    const reached = this.reachedFlags;
    const queue = this.supportQueue;
    const unitX = this.gravityUnitX;
    const unitY = this.gravityUnitY;
    const leftSupports = unitX < -0.3;
    const rightSupports = unitX > 0.3;
    const floorSupports = unitY > 0.3;
    const ceilingSupports = unitY < -0.3;
    let queueTail = 0;

    for (let i = 0; i < count; i += 1) {
      const particle = active[i];
      particle.supported = false;
      adjacencyHead[i] = -1;
      reached[i] = 0;

      const supportedByCard = !particle.dragging && this.isSupportedByCard(particle);
      particle.obstacleSupported = supportedByCard;

      // Seed the BFS from every boundary gravity presses particles into —
      // with default gravity that is the floor alone, exactly as before.
      const nearFloor = particle.y + particle.radius >= floor - 0.35;
      const pressedIntoWall = (floorSupports && nearFloor)
        || (ceilingSupports && particle.y - particle.radius <= 0.35)
        || (leftSupports && particle.x - particle.radius <= 0.35)
        || (rightSupports && particle.x + particle.radius >= this.width - 0.35);

      if (!particle.dragging && (pressedIntoWall || supportedByCard)) {
        reached[i] = 1;
        queue[queueTail] = i;
        queueTail += 1;
        particle.grounded = nearFloor;
      }
    }

    const gridW = this.gridW;
    const gridH = this.gridH;
    const start = this.gridCellStart;
    const entries = this.gridEntries;
    let edgeCount = 0;

    for (let indexA = 0; indexA < count; indexA += 1) {
      const a = active[indexA];
      const cellX = Math.floor(a.x / GRID_CELL) + 1;
      const cellY = Math.floor(a.y / GRID_CELL) + 1;

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const rowY = cellY + offsetY;
        if (rowY < 0 || rowY >= gridH) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const colX = cellX + offsetX;
          if (colX < 0 || colX >= gridW) continue;
          const cell = rowY * gridW + colX;
          for (let slot = start[cell]; slot < start[cell + 1]; slot += 1) {
            const indexB = entries[slot];
            if (indexB <= indexA) continue;
            const b = active[indexB];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const contactDistance = a.radius + b.radius + 0.35;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > contactDistance * contactDistance || distanceSquared < 0.0001) continue;

            // "Below" means along the gravity direction; with default (0, 1)
            // gravity this is exactly the old ny test.
            const distance = Math.sqrt(distanceSquared);
            const alongGravity = (dx * unitX + dy * unitY) / distance;
            if (edgeCount + 2 > this.edgeTo.length) this.growEdgeBuffers();
            if (alongGravity > 0.32 && !b.dragging) {
              // b sits below a: an edge from the supporter up to the supported.
              this.edgeTo[edgeCount] = indexA;
              this.edgeNext[edgeCount] = adjacencyHead[indexB];
              adjacencyHead[indexB] = edgeCount;
              edgeCount += 1;
            }
            if (alongGravity < -0.32 && !a.dragging) {
              this.edgeTo[edgeCount] = indexB;
              this.edgeNext[edgeCount] = adjacencyHead[indexA];
              adjacencyHead[indexA] = edgeCount;
              edgeCount += 1;
            }
          }
        }
      }
    }

    const edgeTo = this.edgeTo;
    const edgeNext = this.edgeNext;
    let queueHead = 0;
    while (queueHead < queueTail) {
      const lower = queue[queueHead];
      queueHead += 1;
      for (let edge = adjacencyHead[lower]; edge !== -1; edge = edgeNext[edge]) {
        const upper = edgeTo[edge];
        if (reached[upper]) continue;
        reached[upper] = 1;
        queue[queueTail] = upper;
        queueTail += 1;
      }
    }

    for (let i = 0; i < count; i += 1) {
      const particle = active[i];
      particle.supported = reached[i] === 1;
      // Weightless glyphs (near-flat phone) are allowed to sleep without
      // support, so losing support must not wake them either — otherwise
      // the sleep/wake pair ping-pongs every substep and the loop never
      // idles. At default strength 1 this is the original rule exactly.
      if (particle.sleeping && !particle.supported && this.gravityStrength >= 0.3) {
        particle.sleeping = false;
        particle.sleepTimer = 0;
        particle.energyAverage = 0;
      }
    }
  }

  resolvePair(a, b) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const minimumDistance = a.radius + b.radius;
    let distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minimumDistance * minimumDistance) return;

    if (distanceSquared < 0.0001) {
      dx = seeded(a.index + b.index, 12) - 0.5;
      dy = -1;
      distanceSquared = dx * dx + dy * dy;
    }

    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minimumDistance - distance;
    const relativeX = b.vx - a.vx;
    const relativeY = b.vy - a.vy;
    const normalSpeed = relativeX * nx + relativeY * ny;
    const tangentSpeed = relativeX * -ny + relativeY * nx
      - a.angularVelocity * a.radius
      - b.angularVelocity * b.radius;
    const closingSpeed = Math.max(0, -normalSpeed);
    const contactEnergy = 0.5 * (closingSpeed * closingSpeed + 0.35 * tangentSpeed * tangentSpeed);
    a.contactCount = (a.contactCount || 0) + 1;
    b.contactCount = (b.contactCount || 0) + 1;

    // Projection of the contact normal onto gravity: with default (0, 1)
    // gravity this is exactly the old ny test.
    const gravityAlignment = nx * this.gravityUnitX + ny * this.gravityUnitY;
    if (gravityAlignment > 0.28) a.supported = true;
    if (gravityAlignment < -0.28) b.supported = true;

    // Sleeping bodies behave like a stable support until a real impact or a
    // direct pointer interaction contributes enough energy to wake them.
    if (contactEnergy > 450 || a.dragging || b.dragging) {
      a.sleeping = false;
      b.sleeping = false;
      a.sleepTimer = 0;
      b.sleepTimer = 0;
      a.energyAverage = 0;
      b.energyAverage = 0;
    }

    const invA = a.dragging || a.sleeping ? 0 : 1;
    const invB = b.dragging || b.sleeping ? 0 : 1;
    const inverseTotal = invA + invB;
    if (inverseTotal === 0) return;

    const correction = Math.max(0, overlap - 0.08) / inverseTotal * 0.62;
    a.x -= nx * correction * invA;
    a.y -= ny * correction * invA;
    b.x += nx * correction * invB;
    b.y += ny * correction * invB;

    // Linear velocity is reconstructed from the constraint-corrected position
    // after all solver passes. Applying another impulse here would inject the
    // same collision energy repeatedly on every iteration.
  }

  applyContactFriction(dt) {
    const gravity = 1450;
    const slidingCoefficient = 0.18;
    const rollingCoefficient = 0.014;
    const particles = this.particles;

    // Sliding friction acts along the tangent of the gravity direction; with
    // default (0, 1) gravity the tangent is the x axis and this is exactly
    // the original vx-only reduction.
    const tangentX = -this.gravityUnitY;
    const tangentY = this.gravityUnitX;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released || particle.dragging || particle.sleeping || !particle.supported) continue;

      // Coulomb sliding friction and rolling resistance are driven by the
      // normal load (m*g). Rotation therefore loses energy because the glyph
      // is under gravity and in contact—not because a timer expired.
      const linearLoss = slidingCoefficient * gravity * dt;
      const angularLoss = (2 * rollingCoefficient * gravity / particle.radius) * dt;
      const tangentSpeed = particle.vx * tangentX + particle.vy * tangentY;
      const reducedSpeed = Math.sign(tangentSpeed) * Math.max(0, Math.abs(tangentSpeed) - linearLoss);
      const speedDelta = reducedSpeed - tangentSpeed;
      particle.vx += speedDelta * tangentX;
      particle.vy += speedDelta * tangentY;
      particle.angularVelocity = Math.sign(particle.angularVelocity)
        * Math.max(0, Math.abs(particle.angularVelocity) - angularLoss);
    }
  }

  updateSleeping(dt) {
    const particles = this.particles;
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released || particle.dragging || particle.sleeping) continue;
      const kineticEnergy = 0.5 * (particle.vx * particle.vx + particle.vy * particle.vy)
        + 0.25 * (particle.radius * particle.angularVelocity) ** 2;
      const energyBlend = 1 - Math.exp(-dt / 0.12);
      particle.energyAverage += (kineticEnergy - particle.energyAverage) * energyBlend;

      // This is energy-based sleeping, not a deadline. A glyph can sleep only
      // while physically supported and continuously below the kinetic-energy
      // threshold. Any sufficiently energetic impact wakes it again. A
      // near-flat phone (gravity fading to zero) has nothing to fall toward,
      // so stationary glyphs may sleep unsupported instead of idling forever.
      if ((particle.supported || this.gravityStrength < 0.3) && particle.energyAverage < 4.5) {
        particle.sleepTimer += dt;
        if (particle.sleepTimer >= 0.38) {
          particle.sleeping = true;
          particle.vx = 0;
          particle.vy = 0;
          particle.angularVelocity = 0;
        }
      } else {
        particle.sleepTimer = 0;
      }
    }
  }

  stepReturning(dt) {
    const spring = 240;
    const damping = 29;
    let allHome = true;
    const particles = this.particles;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released) continue;

      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.previousAngle = particle.angle;

      const dx = particle.homeX - particle.x;
      const dy = particle.homeY - particle.y;
      const ax = spring * dx - damping * particle.vx;
      const ay = spring * dy - damping * particle.vy;
      const angularAcceleration = -180 * particle.angle - 24 * particle.angularVelocity;

      particle.vx += ax * dt;
      particle.vy += ay * dt;
      particle.angularVelocity += angularAcceleration * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += particle.angularVelocity * dt;

      if (Math.hypot(dx, dy) > 0.55 || Math.hypot(particle.vx, particle.vy) > 3 || Math.abs(particle.angle) > 0.015) {
        allHome = false;
      }
    }

    this.returnStableFrames = allHome ? this.returnStableFrames + 1 : 0;
  }

  finishReturn() {
    this.particles.forEach((particle) => {
      particle.x = particle.homeX;
      particle.y = particle.homeY;
      particle.vx = 0;
      particle.vy = 0;
      particle.angle = 0;
      particle.angularVelocity = 0;
      particle.released = false;
      particle.sleeping = false;
      particle.sleepTimer = 0;
      particle.energyAverage = 0;
      particle.supported = false;
      particle.element.classList.remove("released");
    });

    this.activeParticles = [];
    this.fullReleaseSince = 0;
    this.mode = "intact";
    this.releaseAmount = 0;
    this.returnStableFrames = 0;
    this.canvas.classList.remove("active", "dragging");
    this.stage.classList.remove("scene-active", "returning");
    this.restoreButton.classList.remove("visible");
    this.restoreButton.disabled = true;
    document.body.classList.remove("physics-active");
    this.deactivateProjectDeck(false);
    this.stopLoop();
    this.campfire?.resume();
    window.setTimeout(() => this.clearCanvas(), 120);
  }

  spriteFor(particle) {
    const key = `${particle.font}|${particle.color}|${particle.glyph}`;
    let sprite = this.spriteAtlas.get(key);
    if (!sprite) {
      sprite = this.buildSprite(particle);
      this.spriteAtlas.set(key, sprite);
    }
    return sprite;
  }

  buildSprite(particle) {
    // Rasterized at >= 2x so glyphs resting at a permanent angle stay crisp
    // even on dpr-1 displays. The em-box overshoot of block/box-drawing glyphs
    // is covered by actual bounding-box metrics plus padding.
    const scale = Math.max(2, this.dpr);
    const nudge = particle.fontSize * 0.04;
    const scratch = this.spriteScratch
      || (this.spriteScratch = document.createElement("canvas").getContext("2d"));
    scratch.font = particle.font;
    scratch.textAlign = "center";
    scratch.textBaseline = "middle";

    const metrics = scratch.measureText(particle.glyph);
    const fallback = particle.fontSize * 0.8;
    const left = Number.isFinite(metrics.actualBoundingBoxLeft) ? metrics.actualBoundingBoxLeft : fallback;
    const right = Number.isFinite(metrics.actualBoundingBoxRight) ? metrics.actualBoundingBoxRight : fallback;
    const ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : fallback;
    const descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : fallback;

    const padding = 2;
    const width = left + right + padding * 2;
    const height = ascent + descent + padding * 2;
    // The anchor is the particle-local origin (its rotation center); the
    // fontSize * 0.04 baseline nudge of the old fillText call is baked in.
    const anchorX = left + padding;
    const anchorY = ascent + padding - nudge;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.font = particle.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = particle.color;
    ctx.fillText(particle.glyph, anchorX, anchorY + nudge);

    return { canvas, width, height, anchorX, anchorY };
  }

  draw() {
    this.clearCanvas();
    if (this.mode === "intact") return;

    const ctx = this.ctx;
    const dpr = this.dpr;
    const particles = this.particles;
    // Render between the last two substeps: the leftover accumulator is the
    // fraction of a substep the display sits past the previous sim state.
    // Raw post-substep positions would lurch whenever the per-frame substep
    // count alternates (2/1/3 at 60Hz, 0/2 beats at 120Hz).
    const blend = Math.min(this.accumulator / FIXED_STEP, 1);
    let lastAlpha = 1;
    ctx.globalAlpha = 1;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (!particle.released) continue;

      const sprite = particle.sprite || (particle.sprite = this.spriteFor(particle));
      let x = particle.x;
      let y = particle.y;
      let angle = particle.angle;
      if (!particle.dragging) {
        x = particle.previousX + (x - particle.previousX) * blend;
        y = particle.previousY + (y - particle.previousY) * blend;
        angle = particle.previousAngle + (angle - particle.previousAngle) * blend;
      }

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, x * dpr, y * dpr);
      if (particle.alpha !== lastAlpha) {
        ctx.globalAlpha = particle.alpha;
        lastAlpha = particle.alpha;
      }
      ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY, sprite.width, sprite.height);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  clearCanvas() {
    // Self-contained: finishReturn() schedules this standalone, so it must
    // leave the base dpr transform in place when it exits.
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  pointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: performance.now(),
    };
  }

  handlePointerDown(event) {
    if (this.mode !== "falling" || event.pointerType === "touch") return;
    const point = this.pointFromEvent(event);
    let nearest = null;
    let nearestDistance = Infinity;

    this.particles.forEach((particle) => {
      if (!particle.released) return;
      const distance = Math.hypot(point.x - particle.x, point.y - particle.y);
      if (distance < particle.radius + 14 && distance < nearestDistance) {
        nearest = particle;
        nearestDistance = distance;
      }
    });

    if (!nearest) return;
    event.preventDefault();
    this.dragged = nearest;
    this.pointerId = event.pointerId;
    this.pointerSamples = [point];
    nearest.dragging = true;
    nearest.sleeping = false;
    nearest.sleepTimer = 0;
    nearest.energyAverage = 0;
    nearest.supported = false;
    nearest.vx = 0;
    nearest.vy = 0;
    this.canvas.classList.add("dragging");
    this.canvas.setPointerCapture(event.pointerId);
    this.startLoop();
  }

  handlePointerMove(event) {
    if (!this.dragged || event.pointerId !== this.pointerId) return;
    const point = this.pointFromEvent(event);
    this.pointerSamples.push(point);
    this.pointerSamples = this.pointerSamples.filter((sample) => point.time - sample.time < 110).slice(-7);

    const previous = this.pointerSamples.at(-2) || point;
    const dt = Math.max(0.008, (point.time - previous.time) / 1000);
    this.dragged.vx = clamp((point.x - previous.x) / dt, -1600, 1600);
    this.dragged.vy = clamp((point.y - previous.y) / dt, -1600, 1600);
    this.dragged.x = clamp(point.x, this.dragged.radius, this.width - this.dragged.radius);
    this.dragged.y = clamp(point.y, this.dragged.radius, this.height - this.floorPadding - this.dragged.radius);
    this.dragged.angularVelocity = this.dragged.vx * 0.012;
    this.startLoop();
  }

  handlePointerUp(event) {
    if (!this.dragged || event.pointerId !== this.pointerId) return;
    const point = this.pointFromEvent(event);
    const first = this.pointerSamples[0] || point;
    const dt = Math.max(0.02, (point.time - first.time) / 1000);
    const vx = clamp((point.x - first.x) / dt, -1450, 1450);
    const vy = clamp((point.y - first.y) / dt, -1450, 1450);

    this.dragged.dragging = false;
    this.dragged.vx = vx * 0.86;
    this.dragged.vy = vy * 0.86;
    this.dragged.angularVelocity += vx * 0.008;
    this.dragged.sleeping = false;
    this.dragged.sleepTimer = 0;
    this.dragged.energyAverage = 0;
    this.dragged.supported = false;
    // The pointer moved this particle between substeps; re-sync the
    // interpolation snapshot so the render doesn't pop back one frame.
    this.dragged.previousX = this.dragged.x;
    this.dragged.previousY = this.dragged.y;
    this.dragged.previousAngle = this.dragged.angle;

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.dragged = null;
    this.pointerId = null;
    this.pointerSamples = [];
    this.canvas.classList.remove("dragging");
    this.allSleepingFrames = 0;
    this.startLoop();
  }
}

function setupContentReveals() {
  const items = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5%" });

  items.forEach((item) => observer.observe(item));
}

async function init() {
  document.body.classList.add("cards-armed");
  if (projectOverlay) {
    stage.insertBefore(projectOverlay, stage.querySelector(".play-hint"));
  }
  setProjectDeckReady(false);
  renderTerminal();
  const campfire = new AsciiCampfire(campfireElement);
  campfire.init();
  setupContentReveals();

  const physics = new GlyphPhysics({
    stageElement: stage,
    heroElement: hero,
    sourceElement: terminalSource,
    canvasElement: canvas,
    restoreElement: restoreButton,
    campfire,
  });

  await physics.init();
}

init().catch((error) => {
  console.error("The interactive terminal could not initialize.", error);
  document.body.classList.add("intro-skipped", "terminal-complete");
  projectOverlay?.removeAttribute("aria-hidden");
  projectDeck?.removeAttribute("inert");
  projectDeck?.removeAttribute("aria-hidden");
});
