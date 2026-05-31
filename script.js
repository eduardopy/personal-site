const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");

const scenarioButtons = document.querySelectorAll("[data-scenario]");
const planName = document.querySelector("[data-plan-name]");
const planScore = document.querySelector("[data-plan-score]");
const planSummary = document.querySelector("[data-plan-summary]");
const modelSummary = document.querySelector("[data-model-summary]");
const routeLines = document.querySelector("[data-route-lines]");
const mapNodes = document.querySelector("[data-map-nodes]");
const scheduleList = document.querySelector("[data-schedule-list]");
const demoMiles = document.querySelector("[data-demo-miles]");
const demoBalance = document.querySelector("[data-demo-balance]");
const demoChecked = document.querySelector("[data-demo-checked]");

const technicians = [
  { id: "North", label: "North crew", x: 126, y: 118, color: "#2c5d7d" },
  { id: "Central", label: "Central crew", x: 366, y: 258, color: "#244536" },
  { id: "South", label: "South crew", x: 604, y: 374, color: "#aa4b36" },
];

const jobs = [
  { id: "clinic", label: "Clinic intake", x: 210, y: 318, urgency: 8, minutes: 52 },
  { id: "bakery", label: "Bakery order", x: 318, y: 128, urgency: 1, minutes: 38 },
  { id: "warehouse", label: "Warehouse sync", x: 500, y: 198, urgency: 6, minutes: 46 },
  { id: "studio", label: "Studio setup", x: 650, y: 264, urgency: 2, minutes: 32 },
  { id: "office", label: "Office follow-up", x: 430, y: 408, urgency: 5, minutes: 42 },
];

const scenarios = {
  balanced: {
    name: "Balanced day",
    summary: "Keeps the crew workload even while still handling the highest-value stops early.",
    model: "Scores each plan by travel time, urgency, and workload balance.",
    weights: { travel: 1, urgency: 12, balance: 5, nextUrgency: 8 },
  },
  rush: {
    name: "Rush orders",
    summary: "Pulls urgent work forward, even when that means a little extra travel.",
    model: "Increases urgency weight so time-sensitive jobs move earlier in the route.",
    weights: { travel: 0.3, urgency: 80, balance: 0.1, nextUrgency: 80 },
  },
  travel: {
    name: "Shortest drive",
    summary: "Minimizes windshield time and clusters nearby stops into tighter routes.",
    model: "Raises the cost of distance so the optimizer prefers compact routes.",
    weights: { travel: 4, urgency: 0, balance: 0, nextUrgency: 0 },
  },
};

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

const scrollToTarget = (target, behavior = "smooth") => {
  const headerOffset = 86;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior });
};

const syncHashScroll = () => {
  const id = window.location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (target) scrollToTarget(target, "auto");
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / 7.8;

const buildAssignments = (jobCount, techCount) => {
  const total = techCount ** jobCount;
  return Array.from({ length: total }, (_, candidateIndex) => {
    let value = candidateIndex;
    return Array.from({ length: jobCount }, () => {
      const techIndex = value % techCount;
      value = Math.floor(value / techCount);
      return techIndex;
    });
  });
};

const orderRoute = (tech, assignedJobs, weights) => {
  const remaining = [...assignedJobs];
  const ordered = [];
  let current = tech;

  while (remaining.length) {
    remaining.sort((a, b) => {
      const nextUrgency = weights.nextUrgency ?? weights.urgency;
      const scoreA = distance(current, a) * weights.travel - a.urgency * nextUrgency;
      const scoreB = distance(current, b) * weights.travel - b.urgency * nextUrgency;
      return scoreA - scoreB;
    });

    const next = remaining.shift();
    ordered.push(next);
    current = next;
  }

  return ordered;
};

const scoreRoutes = (routes, weights) => {
  const loads = routes.map((route) => route.jobs.reduce((sum, job) => sum + job.minutes, 0));
  const averageLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
  const balancePenalty = loads.reduce((sum, load) => sum + Math.abs(load - averageLoad), 0);

  const travelMiles = routes.reduce((total, route) => {
    const points = [route.tech, ...route.jobs];
    return total + points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
  }, 0);

  const urgencyPenalty = routes.reduce((total, route) => {
    return total + route.jobs.reduce((sum, job, index) => sum + job.urgency * index, 0);
  }, 0);

  const score = travelMiles * weights.travel + urgencyPenalty * weights.urgency + balancePenalty * weights.balance;
  const balance = Math.max(0, 100 - balancePenalty / 3.4);

  return { score, travelMiles, balance };
};

const optimizeDispatch = (scenarioKey) => {
  const scenario = scenarios[scenarioKey];
  const assignments = buildAssignments(jobs.length, technicians.length);

  return assignments.reduce(
    (best, assignment) => {
      const grouped = technicians.map((tech) => ({ tech, jobs: [] }));

      assignment.forEach((techIndex, jobIndex) => {
        grouped[techIndex].jobs.push(jobs[jobIndex]);
      });

      const routes = grouped.map((route) => ({
        tech: route.tech,
        jobs: orderRoute(route.tech, route.jobs, scenario.weights),
      }));
      const metrics = scoreRoutes(routes, scenario.weights);

      if (!best || metrics.score < best.metrics.score) {
        return { routes, metrics, checked: assignments.length, scenario };
      }

      return best;
    },
    null,
  );
};

const createSvgElement = (tag, attributes) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

const renderRoutes = (result) => {
  routeLines.innerHTML = "";
  mapNodes.innerHTML = "";

  result.routes.forEach((route, index) => {
    const points = [route.tech, ...route.jobs];
    const pathData = points.map((point, pointIndex) => `${pointIndex ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
    const path = createSvgElement("path", {
      d: pathData,
      class: "route-path",
      stroke: route.tech.color,
      "data-route-index": index,
    });
    routeLines.append(path);
  });

  jobs.forEach((job) => {
    const group = createSvgElement("g", { class: "job-node", transform: `translate(${job.x} ${job.y})` });
    group.append(
      createSvgElement("circle", { r: 16, class: "job-dot" }),
      createSvgElement("text", { y: 5, "text-anchor": "middle" }),
    );
    group.querySelector("text").textContent = job.urgency;
    mapNodes.append(group);
  });

  technicians.forEach((tech) => {
    const group = createSvgElement("g", {
      class: "tech-node",
      transform: `translate(${tech.x} ${tech.y})`,
      filter: "url(#soft-shadow)",
    });
    group.append(
      createSvgElement("rect", { x: -40, y: -18, width: 80, height: 36, rx: 8, fill: tech.color }),
      createSvgElement("text", { y: 5, "text-anchor": "middle" }),
    );
    group.querySelector("text").textContent = tech.id;
    mapNodes.append(group);
  });
};

const renderSchedule = (result) => {
  scheduleList.innerHTML = result.routes
    .map((route) => {
      const routeMiles = [route.tech, ...route.jobs]
        .slice(1)
        .reduce((sum, point, index, points) => {
          const previous = index === 0 ? route.tech : points[index - 1];
          return sum + distance(previous, point);
        }, 0);
      const jobNames = route.jobs.map((job) => job.label).join(" -> ") || "Standby";

      return `
        <article class="schedule-item">
          <span style="--crew-color: ${route.tech.color}"></span>
          <div>
            <strong>${route.tech.label}</strong>
            <p>${jobNames}</p>
          </div>
          <em>${routeMiles.toFixed(1)} mi</em>
        </article>
      `;
    })
    .join("");
};

const renderScenario = (scenarioKey) => {
  const result = optimizeDispatch(scenarioKey);

  planName.textContent = result.scenario.name;
  planScore.textContent = `Score ${Math.round(result.metrics.score)}`;
  planSummary.textContent = result.scenario.summary;
  modelSummary.textContent = result.scenario.model;
  demoMiles.textContent = result.metrics.travelMiles.toFixed(1);
  demoBalance.textContent = `${Math.round(result.metrics.balance)}%`;
  demoChecked.textContent = result.checked;

  scenarioButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scenario === scenarioKey);
  });

  renderRoutes(result);
  renderSchedule(result);
};

year.textContent = new Date().getFullYear();
updateHeader();
renderScenario("balanced");
window.setTimeout(syncHashScroll, 0);

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("load", () => {
  window.setTimeout(syncHashScroll, 0);
});
window.addEventListener("hashchange", syncHashScroll);

scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderScenario(button.dataset.scenario);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    history.pushState(null, "", `#${id}`);
    scrollToTarget(target);
  });
});
