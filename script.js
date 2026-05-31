const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const showcaseSteps = document.querySelectorAll("[data-showcase-step]");
const showcaseVisuals = document.querySelectorAll("[data-showcase-visual]");
const memoryButtons = document.querySelectorAll("[data-memory-query]");
const memoryQuestion = document.querySelector("[data-memory-question]");
const memoryResults = document.querySelector("[data-memory-results]");
const rubricButtons = document.querySelectorAll("[data-rubric-mode]");
const rubricScore = document.querySelector("[data-rubric-score]");
const rubricBars = document.querySelectorAll("[data-rubric-bar]");

const HEADER_OFFSET = 96;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let showcaseLockUntil = 0;

const memoryData = {
  constraints: {
    question: "Query: what will make this idea fail in the real world?",
    results: [
      { text: "The hidden constraint is usually operational, not technical.", score: 94 },
      { text: "A good system exposes what it assumes before it acts.", score: 86 },
      { text: "Human workflow beats elegant architecture if the two disagree.", score: 78 },
    ],
  },
  handoff: {
    question: "Query: how does the next person understand the system?",
    results: [
      { text: "The README and the code should explain each other.", score: 92 },
      { text: "A handoff is successful when the boring path is obvious.", score: 83 },
      { text: "Every clever shortcut becomes debt unless it is named.", score: 76 },
    ],
  },
  taste: {
    question: "Query: what kind of engineering taste does Eduardo have?",
    results: [
      { text: "He prefers small systems that make the trade-offs visible.", score: 90 },
      { text: "He likes code that feels calm after the demo is over.", score: 84 },
      { text: "He treats ambiguity as a design material, not a blocker.", score: 81 },
    ],
  },
};

const rubricData = {
  clinical: { score: 84, risk: 86, recency: 64, action: 92 },
  ops: { score: 76, risk: 58, recency: 88, action: 82 },
  launch: { score: 91, risk: 72, recency: 94, action: 96 },
};

/* ============== Header scroll state ============== */
const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

/* ============== Smooth scroll ============== */
const scrollToTarget = (target, behavior = "smooth") => {
  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior });
};

const syncHashScroll = () => {
  const id = window.location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (target) scrollToTarget(target, "auto");
};

/* ============== Scroll reveal ============== */
const initReveal = () => {
  const items = document.querySelectorAll("[data-reveal]");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -40px 0px" },
  );
  items.forEach((el) => observer.observe(el));
};

/* ============== Showcase stage ============== */
const setShowcase = (key, options = {}) => {
  if (options.lock) showcaseLockUntil = Date.now() + 1200;
  showcaseSteps.forEach((step) => {
    step.classList.toggle("is-active", step.dataset.showcaseStep === key);
  });
  showcaseVisuals.forEach((visual) => {
    visual.classList.toggle("is-active", visual.dataset.showcaseVisual === key);
  });
};

const initShowcase = () => {
  if (!showcaseSteps.length || !showcaseVisuals.length) return;

  showcaseSteps.forEach((step) => {
    step.addEventListener("click", () => setShowcase(step.dataset.showcaseStep, { lock: true }));
    step.addEventListener("focus", () => setShowcase(step.dataset.showcaseStep, { lock: true }));
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (Date.now() < showcaseLockUntil) return;
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setShowcase(visible.target.dataset.showcaseStep);
    },
    { threshold: [0.35, 0.55, 0.75], rootMargin: "-20% 0px -30% 0px" },
  );

  showcaseSteps.forEach((step) => observer.observe(step));
};

const renderMemory = (key) => {
  const preset = memoryData[key];
  if (!preset || !memoryQuestion || !memoryResults) return;

  memoryQuestion.textContent = preset.question;
  memoryResults.innerHTML = preset.results
    .map(
      (item) => `
        <div class="memory-row">
          <span>${item.text}</span>
          <strong>${item.score}%</strong>
          <i style="--score: ${item.score}%"></i>
        </div>
      `,
    )
    .join("");

  memoryButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.memoryQuery === key);
  });
};

const renderRubric = (key) => {
  const preset = rubricData[key];
  if (!preset || !rubricScore) return;

  rubricScore.textContent = preset.score;
  rubricBars.forEach((bar) => {
    const value = preset[bar.dataset.rubricBar];
    bar.style.setProperty("--score", `${value}%`);
  });
  rubricButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.rubricMode === key);
  });
};

/* ============== Marquee duplication ============== */
const initMarquee = () => {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  // Clone children once so the -50% transform loops seamlessly. Clones are
  // hidden from assistive tech so the content reads cleanly.
  const source = track.cloneNode(true);
  while (source.firstChild) {
    const node = source.firstChild;
    if (node.nodeType === 1) node.setAttribute("aria-hidden", "true");
    track.append(node);
  }
};

/* ============== Boot ============== */
if (year) year.textContent = new Date().getFullYear();
updateHeader();
initMarquee();
initReveal();
initShowcase();
renderMemory("constraints");
renderRubric("clinical");
window.setTimeout(syncHashScroll, 0);

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("load", () => window.setTimeout(syncHashScroll, 0));
window.addEventListener("hashchange", syncHashScroll);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href").slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    history.pushState(null, "", `#${id}`);
    scrollToTarget(target);
    if (link.dataset.demoJump) {
      setShowcase(link.dataset.demoJump, { lock: true });
      window.setTimeout(() => setShowcase(link.dataset.demoJump, { lock: true }), 520);
    }
  });
});

memoryButtons.forEach((button) => {
  button.addEventListener("click", () => renderMemory(button.dataset.memoryQuery));
});

rubricButtons.forEach((button) => {
  button.addEventListener("click", () => renderRubric(button.dataset.rubricMode));
});
