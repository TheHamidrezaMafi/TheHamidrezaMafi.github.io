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
    this.frozen = true;
    this.stop();
    this.render();
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
    this.glyphRoots = [sourceElement, campfire?.element].filter(Boolean);
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

    this.tick = this.tick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  async init() {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.measure();
    this.bindEvents();
    this.handleScroll();
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
  }

  handleResize() {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.measure(), 120);
  }

  measure() {
    const previousWidth = this.width;
    const previousHeight = this.height;
    const stageRect = this.stage.getBoundingClientRect();
    this.width = Math.max(1, stageRect.width);
    this.height = Math.max(1, stageRect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const priorByElement = new Map(this.particles.map((particle) => [particle.element, particle]));
    const visibleCharacters = this.glyphRoots.flatMap((root) => [...root.querySelectorAll("[data-glyph]")]).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).display !== "none";
    });

    const nextParticles = [];
    const scaleX = previousWidth > 1 ? this.width / previousWidth : 1;
    const scaleY = previousHeight > 1 ? this.height / previousHeight : 1;

    visibleCharacters.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const homeX = rect.left - stageRect.left + rect.width / 2;
      const homeY = rect.top - stageRect.top + rect.height / 2;
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const kind = element.dataset.particleKind || "terminal";
      const radiusScale = Number.parseFloat(element.dataset.radiusScale) || 1;
      const radius = kind === "fire"
        ? clamp(rect.width * 0.57 * radiusScale, 2.2, 5.1)
        : clamp(rect.width * 0.57 * radiusScale, 3.8, 7.2);
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
      particle.color = style.color;
      particle.alpha = Number.isFinite(Number.parseFloat(style.opacity)) ? Number.parseFloat(style.opacity) : 1;
      particle.font = font;
      particle.fontSize = Number.parseFloat(style.fontSize) || 14;
      particle.index = index;
      nextParticles.push(particle);
    });

    const yValues = nextParticles.map((particle) => particle.homeY);
    const minY = Math.min(...yValues, 0);
    const maxY = Math.max(...yValues, minY + 1);

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
    this.floorPadding = this.width < 700 ? 11 : 15;

    if (projectDeckReady) {
      this.measureCardObstacles();
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

    if (releasedAny) this.startLoop();
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
    if (projectDeckReady || this.mode !== "falling" || this.progress < this.projectRevealProgress) return;
    const active = this.particles.filter((particle) => particle.released);
    if (!active.length || active.length !== this.particles.length) return;

    const potentialObstacles = this.readCardObstacles();
    if (!potentialObstacles.length) return;
    const clearanceY = Math.max(...potentialObstacles.map((obstacle) => obstacle.bottom)) + 3;
    const cleared = active.filter((particle) => particle.y - particle.radius >= clearanceY).length;

    // Reveal only after the fall has genuinely cleared the card area. A tiny
    // tolerance keeps one late bouncing glyph from withholding the whole deck.
    if (cleared / active.length < 0.94) return;
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
    });
  }

  beginReturn() {
    if (this.mode === "returning") return;
    this.deactivateProjectDeck(false);
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
      particle.vy += lerp(10, 55, seeded(particle.index, 10));
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
    const fixedStep = 1 / 120;
    let steps = 0;

    while (this.accumulator >= fixedStep && steps < 6) {
      if (this.mode === "falling") this.stepFalling(fixedStep);
      if (this.mode === "returning") this.stepReturning(fixedStep);
      this.accumulator -= fixedStep;
      steps += 1;
    }

    this.maybeActivateProjectDeck(false);

    this.draw();

    if (this.mode === "returning" && this.returnStableFrames > 7) {
      this.finishReturn();
      return;
    }

    const moving = this.particles.some((particle) => particle.released && (!particle.sleeping || particle.dragging));
    if (this.mode === "falling" && !moving) {
      this.allSleepingFrames += 1;
    } else {
      this.allSleepingFrames = 0;
    }

    if (this.mode === "returning" || (this.mode === "falling" && (moving || this.allSleepingFrames < 2))) {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  stepFalling(dt) {
    const gravity = 1450;
    const floor = this.height - this.floorPadding;
    const linearAirRetention = Math.exp(-0.2 * dt);
    const angularAirRetention = Math.exp(-0.28 * dt);

    this.particles.forEach((particle) => {
      particle.contactCount = 0;
      particle.grounded = false;
      particle.supported = false;
      particle.obstacleSupported = false;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
    });

    this.particles.forEach((particle) => {
      if (!particle.released || particle.dragging || particle.sleeping) return;

      particle.vy += gravity * dt;
      particle.vx *= linearAirRetention;
      particle.vy *= linearAirRetention;
      particle.angularVelocity *= angularAirRetention;

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += particle.angularVelocity * dt;
    });

    this.resolveCollisions(floor);
    this.reconcileConstraintVelocities(dt);
    this.applyContactFriction(dt);
    this.updateSleeping(dt);
  }

  reconcileConstraintVelocities(dt) {
    this.particles.forEach((particle) => {
      if (!particle.released || particle.dragging || particle.sleeping) return;
      particle.vx = (particle.x - particle.previousX) / dt;
      particle.vy = (particle.y - particle.previousY) / dt;
    });
  }

  solveBounds(floor) {
    this.particles.forEach((particle) => {
      if (!particle.released || particle.dragging) return;

      if (particle.x - particle.radius < 0) {
        particle.x = particle.radius;
      } else if (particle.x + particle.radius > this.width) {
        particle.x = this.width - particle.radius;
      }

      if (particle.y + particle.radius > floor) {
        particle.y = floor - particle.radius;
        particle.grounded = true;
        particle.supported = true;
      }

      if (particle.y - particle.radius < 0) {
        particle.y = particle.radius;
      }
    });
  }

  resolveCardParticle(particle, activationProjection = false) {
    let collided = false;
    const slop = 0.025;

    this.cardObstacles.forEach((obstacle) => {
      const closestX = clamp(particle.x, obstacle.left, obstacle.right);
      const closestY = clamp(particle.y, obstacle.top, obstacle.bottom);
      let dx = particle.x - closestX;
      let dy = particle.y - closestY;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = particle.radius * particle.radius;

      if (distanceSquared >= radiusSquared) return;

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
    });

    return collided;
  }

  solveCardCollisions(active) {
    if (!this.cardObstacles.length) return;
    active.forEach((particle) => this.resolveCardParticle(particle));
  }

  isSupportedByCard(particle) {
    const tolerance = 0.72;
    return this.cardObstacles.some((obstacle) => (
      particle.x + particle.radius > obstacle.left - tolerance
      && particle.x - particle.radius < obstacle.right + tolerance
      && particle.y <= obstacle.top
      && Math.abs(particle.y + particle.radius - obstacle.top) <= tolerance
    ));
  }

  resolveCollisions(floor) {
    const active = this.particles.filter((particle) => particle.released);
    const cellSize = 18;

    // Re-solve both the floor and pair constraints several times. This lets a
    // resting impulse propagate through the full stack instead of allowing the
    // bottom row to be pushed through the floor and corrected next frame.
    for (let pass = 0; pass < 6; pass += 1) {
      this.solveBounds(floor);
      this.solveCardCollisions(active);
      const grid = new Map();

      active.forEach((particle, index) => {
        const cellX = Math.floor(particle.x / cellSize);
        const cellY = Math.floor(particle.y / cellSize);
        const key = `${cellX},${cellY}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(index);
      });

      active.forEach((a, indexA) => {
        const cellX = Math.floor(a.x / cellSize);
        const cellY = Math.floor(a.y / cellSize);

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const bucket = grid.get(`${cellX + offsetX},${cellY + offsetY}`);
            if (!bucket) continue;

            bucket.forEach((indexB) => {
              if (indexB <= indexA) return;
              this.resolvePair(a, active[indexB]);
            });
          }
        }
      });

      this.solveCardCollisions(active);
      this.solveBounds(floor);
    }

    this.updateSupportGraph(active, floor, cellSize);
  }

  updateSupportGraph(active, floor, cellSize) {
    const adjacency = new Map();
    const grid = new Map();
    const queue = [];
    const reached = new Set();

    active.forEach((particle, index) => {
      particle.supported = false;
      adjacency.set(particle, []);

      const cellX = Math.floor(particle.x / cellSize);
      const cellY = Math.floor(particle.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(index);

      const supportedByCard = !particle.dragging && this.isSupportedByCard(particle);
      particle.obstacleSupported = supportedByCard;

      if (!particle.dragging && (particle.y + particle.radius >= floor - 0.35 || supportedByCard)) {
        reached.add(particle);
        queue.push(particle);
        particle.grounded = particle.y + particle.radius >= floor - 0.35;
      }
    });

    active.forEach((a, indexA) => {
      const cellX = Math.floor(a.x / cellSize);
      const cellY = Math.floor(a.y / cellSize);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const bucket = grid.get(`${cellX + offsetX},${cellY + offsetY}`);
          if (!bucket) continue;

          bucket.forEach((indexB) => {
            if (indexB <= indexA) return;
            const b = active[indexB];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const contactDistance = a.radius + b.radius + 0.35;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > contactDistance * contactDistance || distanceSquared < 0.0001) return;

            const ny = dy / Math.sqrt(distanceSquared);
            if (ny > 0.32 && !b.dragging) adjacency.get(b).push(a);
            if (ny < -0.32 && !a.dragging) adjacency.get(a).push(b);
          });
        }
      }
    });

    while (queue.length) {
      const lower = queue.shift();
      adjacency.get(lower).forEach((upper) => {
        if (reached.has(upper)) return;
        reached.add(upper);
        queue.push(upper);
      });
    }

    active.forEach((particle) => {
      particle.supported = reached.has(particle);
      if (particle.sleeping && !particle.supported) {
        particle.sleeping = false;
        particle.sleepTimer = 0;
        particle.energyAverage = 0;
      }
    });
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

    if (ny > 0.28) a.supported = true;
    if (ny < -0.28) b.supported = true;

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

    this.particles.forEach((particle) => {
      if (!particle.released || particle.dragging || particle.sleeping || !particle.supported) return;

      // Coulomb sliding friction and rolling resistance are driven by the
      // normal load (m*g). Rotation therefore loses energy because the glyph
      // is under gravity and in contact—not because a timer expired.
      const linearLoss = slidingCoefficient * gravity * dt;
      const angularLoss = (2 * rollingCoefficient * gravity / particle.radius) * dt;
      particle.vx = Math.sign(particle.vx) * Math.max(0, Math.abs(particle.vx) - linearLoss);
      particle.angularVelocity = Math.sign(particle.angularVelocity)
        * Math.max(0, Math.abs(particle.angularVelocity) - angularLoss);
    });
  }

  updateSleeping(dt) {
    this.particles.forEach((particle) => {
      if (!particle.released || particle.dragging || particle.sleeping) return;
      const kineticEnergy = 0.5 * (particle.vx * particle.vx + particle.vy * particle.vy)
        + 0.25 * (particle.radius * particle.angularVelocity) ** 2;
      const energyBlend = 1 - Math.exp(-dt / 0.12);
      particle.energyAverage += (kineticEnergy - particle.energyAverage) * energyBlend;

      // This is energy-based sleeping, not a deadline. A glyph can sleep only
      // while physically supported and continuously below the kinetic-energy
      // threshold. Any sufficiently energetic impact wakes it again.
      if (particle.supported && particle.energyAverage < 4.5) {
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
    });
  }

  stepReturning(dt) {
    const spring = 240;
    const damping = 29;
    let allHome = true;

    this.particles.forEach((particle) => {
      if (!particle.released) return;

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
    });

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

  draw() {
    this.clearCanvas();
    if (this.mode === "intact") return;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.particles.forEach((particle) => {
      if (!particle.released) return;
      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.angle);
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.font = particle.font;
      this.ctx.fillText(particle.glyph, 0, particle.fontSize * 0.04);
      this.ctx.restore();
    });
  }

  clearCanvas() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
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
