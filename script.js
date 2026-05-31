const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const fieldCanvas = document.querySelector("#field-canvas");
const fieldButtons = document.querySelectorAll("[data-field-theme]");
const packetLane = document.querySelector("[data-packet-lane]");
const pulseButton = document.querySelector("[data-send-pulse]");
const latencyEl = document.querySelector("[data-latency]");
const cacheEl = document.querySelector("[data-cache]");
const queueEl = document.querySelector("[data-queue]");
const morphButtons = document.querySelectorAll("[data-ui-mode]");
const miniScreen = document.querySelector("[data-mini-screen]");
const revealEls = document.querySelectorAll("[data-reveal]");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const fieldThemes = {
  mesh: {
    bg: "#0d1110",
    primary: "#d9a441",
    secondary: "#6bc5d2",
    line: "rgba(217, 164, 65, 0.28)",
    speed: 0.32,
  },
  orbit: {
    bg: "#111019",
    primary: "#7d6bd2",
    secondary: "#d9a441",
    line: "rgba(125, 107, 210, 0.32)",
    speed: 0.48,
  },
  radar: {
    bg: "#0b1517",
    primary: "#6bc5d2",
    secondary: "#aa4b36",
    line: "rgba(107, 197, 210, 0.3)",
    speed: 0.22,
  },
};

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

const syncHashScroll = () => {
  const id = window.location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  target?.scrollIntoView({ block: "start" });
};

class SignalField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.themeKey = "mesh";
    this.pointer = { active: false, x: 0, y: 0 };
    this.width = 1;
    this.height = 1;
    this.nodes = Array.from({ length: 54 }, (_, index) => ({
      seed: index * 97,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }));

    this.bind();
    this.resize();

    if (prefersReducedMotion) {
      this.draw(0);
    } else {
      requestAnimationFrame((time) => this.animate(time));
    }
  }

  bind() {
    this.canvas.addEventListener("pointermove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer = {
        active: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => this.resize()).observe(this.canvas);
    } else {
      window.addEventListener("resize", () => this.resize());
    }
  }

  setTheme(themeKey) {
    this.themeKey = themeKey;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(rect.width, 1);
    this.height = Math.max(rect.height, 1);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.nodes.forEach((node, index) => {
      const column = index % 9;
      const row = Math.floor(index / 9);
      node.x = ((column + 0.5) / 9) * this.width;
      node.y = ((row + 0.5) / 6) * this.height;
      node.vx = Math.sin(index) * 0.2;
      node.vy = Math.cos(index * 1.7) * 0.2;
    });
  }

  animate(time) {
    const theme = fieldThemes[this.themeKey];
    this.nodes.forEach((node, index) => {
      const drift = theme.speed;
      node.x += Math.sin(time * 0.0004 + node.seed) * drift + node.vx;
      node.y += Math.cos(time * 0.00036 + node.seed) * drift + node.vy;

      if (this.pointer.active) {
        const dx = node.x - this.pointer.x;
        const dy = node.y - this.pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 120) {
          const push = (120 - distance) / 120;
          node.x += (dx / distance) * push * 3.4;
          node.y += (dy / distance) * push * 3.4;
        }
      }

      if (node.x < 0 || node.x > this.width) node.vx *= -1;
      if (node.y < 0 || node.y > this.height) node.vy *= -1;
      node.x = Math.max(0, Math.min(this.width, node.x));
      node.y = Math.max(0, Math.min(this.height, node.y));
    });

    this.draw(time);
    requestAnimationFrame((nextTime) => this.animate(nextTime));
  }

  draw(time) {
    const theme = fieldThemes[this.themeKey];
    const ctx = this.ctx;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.nodes.length; i += 1) {
      for (let j = i + 1; j < this.nodes.length; j += 1) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 86) {
          ctx.globalAlpha = (86 - distance) / 120;
          ctx.strokeStyle = theme.line;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    this.nodes.forEach((node, index) => {
      const radius = index % 7 === 0 ? 3.6 : 2.4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index % 5 === 0 ? theme.secondary : theme.primary;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (this.pointer.active) {
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 54 + Math.sin(time * 0.005) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = theme.secondary;
      ctx.globalAlpha = 0.36;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

const updatePulseStats = () => {
  const latency = 86 + Math.round(Math.random() * 96);
  const cache = 48 + Math.round(Math.random() * 42);
  const queue = String(Math.floor(Math.random() * 8)).padStart(2, "0");
  latencyEl.textContent = `${latency}ms`;
  cacheEl.textContent = `${cache}%`;
  queueEl.textContent = queue;
};

const sendPulse = () => {
  updatePulseStats();
  const colors = ["#d9a441", "#6bc5d2", "#aa4b36", "#7d6bd2"];
  const packets = 7;

  for (let index = 0; index < packets; index += 1) {
    const packet = document.createElement("span");
    packet.className = "packet";
    packet.style.setProperty("--packet-top", `${28 + Math.random() * 44}%`);
    packet.style.setProperty("--packet-color", colors[index % colors.length]);
    packet.style.setProperty("--packet-speed", `${900 + Math.random() * 700}ms`);
    packet.style.animationDelay = `${index * 80}ms`;
    packetLane.append(packet);
    window.setTimeout(() => packet.remove(), 2200);
  }
};

const miniScreens = {
  dashboard: `
    <div class="screen-top"><strong>Growth Console</strong><span>Live</span></div>
    <div class="screen-grid">
      <div class="screen-tile"><span>Revenue</span><strong>$18.4k</strong></div>
      <div class="screen-tile"><span>Conversion</span><strong>12.8%</strong></div>
      <div class="screen-tile wide">
        <span>Demand</span>
        <div class="screen-bars">
          <i style="height: 42%"></i><i style="height: 68%"></i><i style="height: 52%"></i>
          <i style="height: 84%"></i><i style="height: 62%"></i><i style="height: 92%"></i>
        </div>
      </div>
    </div>
  `,
  checkout: `
    <div class="screen-top"><strong>Fast Checkout</strong><span>3 steps</span></div>
    <div class="screen-grid">
      <div class="screen-tile"><span>Total</span><strong>$126</strong></div>
      <div class="screen-tile"><span>ETA</span><strong>18 min</strong></div>
      <div class="screen-tile wide">
        <span>Flow</span>
        <div class="screen-list"><i></i><i></i><i></i></div>
      </div>
    </div>
  `,
  booking: `
    <div class="screen-top"><strong>Booking Board</strong><span>Today</span></div>
    <div class="screen-grid">
      <div class="screen-tile"><span>Open slots</span><strong>07</strong></div>
      <div class="screen-tile"><span>No-shows</span><strong>2%</strong></div>
      <div class="screen-tile wide">
        <span>Queue</span>
        <div class="screen-list"><i></i><i></i><i></i></div>
      </div>
    </div>
  `,
};

const setMorphMode = (mode) => {
  miniScreen.innerHTML = miniScreens[mode];
  morphButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.uiMode === mode);
  });
};

year.textContent = new Date().getFullYear();
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("load", () => {
  window.setTimeout(syncHashScroll, 0);
});
window.addEventListener("hashchange", syncHashScroll);

let signalField;
if (fieldCanvas) {
  signalField = new SignalField(fieldCanvas);
}

fieldButtons.forEach((button) => {
  button.addEventListener("click", () => {
    signalField?.setTheme(button.dataset.fieldTheme);
    fieldButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  });
});

pulseButton?.addEventListener("click", sendPulse);
sendPulse();

morphButtons.forEach((button) => {
  button.addEventListener("click", () => setMorphMode(button.dataset.uiMode));
});
setMorphMode("dashboard");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.18 }
  );

  revealEls.forEach((element) => revealObserver.observe(element));
} else {
  revealEls.forEach((element) => element.classList.add("is-visible"));
}
