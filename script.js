const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");

const HEADER_OFFSET = 96;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  });
});
