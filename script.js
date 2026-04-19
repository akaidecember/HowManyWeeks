(function () {
  "use strict";

  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const today = startOfUtcDay(new Date());

  const form = document.querySelector("#week-form");
  const sidePanelEl = document.querySelector(".side-panel");
  const resultsScreenEl = document.querySelector("#results-screen");
  const themeToggleEl = document.querySelector("#theme-toggle");
  const themeIconEl = document.querySelector(".toggle-icon");
  const dobInput = document.querySelector("#dob");
  const yearsInput = document.querySelector("#years");
  const errorEl = document.querySelector("#error");
  const ageValueEl = document.querySelector("#age-value");
  const weeksLivedEl = document.querySelector("#weeks-lived");
  const mappedUntilEl = document.querySelector("#mapped-until");
  const quoteTextEl = document.querySelector("#quote-text");
  const easterEggEl = document.querySelector("#easter-egg");
  const optimismNoteEl = document.querySelector("#optimism-note");
  const milestoneListEl = document.querySelector("#milestone-list");
  const gridTitleEl = document.querySelector("#grid-title");
  const gridRangeEl = document.querySelector("#grid-range");
  const gridEl = document.querySelector("#week-grid");
  const gridWrapEl = document.querySelector(".grid-wrap");
  let currentTotalWeeks = 0;

  const quotes = [
    "The easiest week to waste is the one that feels ordinary.",
    "Later is a quiet place where plans go to disappear.",
    "Time does not need drama to become irreversible.",
    "A small start beats a perfect intention left untouched.",
    "The calendar is honest even when motivation is not.",
    "One focused hour can rescue a drifting week."
  ];

  const milestones = [
    { age: 18, title: "Adulthood", note: "Legal adulthood in many places." },
    { age: 22, title: "Early career", note: "A common age for finishing college or starting full-time work." },
    { age: 30, title: "Long-term partnership", note: "Many people marry or settle into durable partnerships around the late 20s to early 30s." },
    { age: 32, title: "Children", note: "A common window for first-time parenthood, with wide variation." },
    { age: 40, title: "Mid-career", note: "Often a period of higher responsibility and clearer tradeoffs." },
    { age: 65, title: "Retirement window", note: "A common planning age for retirement or semi-retirement." }
  ];

  dobInput.max = formatInputDate(today);
  applySavedTheme();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    renderWeeks();
  });

  dobInput.addEventListener("change", renderWeeks);
  yearsInput.addEventListener("input", renderWeeks);
  themeToggleEl.addEventListener("click", toggleTheme);
  window.addEventListener("resize", function () {
    fitGrid(currentTotalWeeks);
  });

  resetGrid();

  function renderWeeks() {
    const dob = parseInputDate(dobInput.value);
    const years = Number.parseInt(yearsInput.value, 10);

    if (!dob) {
      setError("");
      resetGrid();
      return;
    }

    if (dob > today) {
      setError("Date of birth cannot be in the future.");
      resetGrid();
      return;
    }

    if (!Number.isInteger(years) || years < 1 || years > 150) {
      setError(yearsInput.value ? "Enter a year span between 1 and 150." : "");
      resetGrid();
      return;
    }

    const end = addUtcYears(dob, years);
    const totalWeeks = Math.max(1, Math.ceil((end.getTime() - dob.getTime()) / MS_PER_WEEK));
    const elapsedWeeks = clamp(Math.floor((today.getTime() - dob.getTime()) / MS_PER_WEEK), 0, totalWeeks);
    const age = getAgeParts(dob, today);
    currentTotalWeeks = totalWeeks;
    resultsScreenEl.hidden = false;

    setError("");
    ageValueEl.textContent = formatAge(age);
    weeksLivedEl.textContent = formatNumber(elapsedWeeks);
    mappedUntilEl.textContent = formatDisplayDate(end);
    quoteTextEl.textContent = quotes[Math.abs(dob.getUTCFullYear() + dob.getUTCMonth() + dob.getUTCDate()) % quotes.length];
    easterEggEl.hidden = age.years >= 15;
    optimismNoteEl.hidden = years < 100 || age.years < 15;
    renderMilestones(dob, age.years);
    gridTitleEl.textContent = `Visualize ${years} ${years === 1 ? "year" : "years"} in weeks`;
    gridRangeEl.textContent = `${formatDisplayDate(dob)} to ${formatDisplayDate(end)}. Today is ${formatDisplayDate(today)}.`;

    gridEl.replaceChildren(buildGrid(totalWeeks, elapsedWeeks));
    gridEl.setAttribute(
      "aria-label",
      `${formatNumber(totalWeeks)} total weeks with ${formatNumber(elapsedWeeks)} elapsed.`
    );
    window.requestAnimationFrame(function () {
      fitGrid(totalWeeks);
      scrollToResults();
    });
  }

  function buildGrid(totalWeeks, elapsedWeeks) {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < totalWeeks; index += 1) {
      const week = document.createElement("span");
      const weekNumber = index + 1;
      week.className = index < elapsedWeeks ? "week elapsed" : "week";

      if (weekNumber === elapsedWeeks + 1 && elapsedWeeks < totalWeeks) {
        week.classList.add("current");
      }

      week.title = `Week ${weekNumber}`;
      fragment.appendChild(week);
    }

    return fragment;
  }

  function resetGrid() {
    currentTotalWeeks = 0;
    resultsScreenEl.hidden = true;
    ageValueEl.textContent = "--";
    weeksLivedEl.textContent = "--";
    mappedUntilEl.textContent = "--";
    quoteTextEl.textContent = "";
    easterEggEl.hidden = true;
    optimismNoteEl.hidden = true;
    milestoneListEl.replaceChildren();
    gridTitleEl.textContent = "Your weeks";
    gridRangeEl.textContent = "Choose a date to begin.";
    gridEl.replaceChildren();
    gridEl.setAttribute("aria-label", "No week grid generated yet");
    sidePanelEl.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToResults() {
    if (resultsScreenEl.hidden) {
      return;
    }

    const targetTop = resultsScreenEl.offsetTop;
    const shouldScroll = sidePanelEl.scrollTop < targetTop - 8;

    if (!shouldScroll || sidePanelEl.scrollHeight <= sidePanelEl.clientHeight) {
      return;
    }

    sidePanelEl.scrollTo({
      top: targetTop,
      behavior: "smooth"
    });

    window.setTimeout(function () {
      if (sidePanelEl.scrollTop < targetTop - 8) {
        sidePanelEl.scrollTo({
          top: targetTop,
          behavior: "smooth"
        });
      }
    }, 80);
  }

  function applySavedTheme() {
    const savedTheme = window.localStorage.getItem("weeks-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (prefersDark ? "dark" : "light");

    document.body.dataset.theme = theme;
    updateThemeToggle(theme);
  }

  function toggleTheme() {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    window.localStorage.setItem("weeks-theme", nextTheme);
    updateThemeToggle(nextTheme);
  }

  function updateThemeToggle(theme) {
    const isDark = theme === "dark";
    themeIconEl.textContent = isDark ? "☀" : "☾";
    themeToggleEl.setAttribute("aria-pressed", String(isDark));
    themeToggleEl.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  function fitGrid(totalWeeks) {
    if (!totalWeeks || !gridWrapEl) {
      return;
    }

    const bounds = gridWrapEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width) - 2);
    const height = Math.max(1, Math.floor(bounds.height) - 2);
    const gap = width < 520 ? 1 : 2;
    let best = { columns: totalWeeks, size: 1 };

    for (let columns = 1; columns <= totalWeeks; columns += 1) {
      const rows = Math.ceil(totalWeeks / columns);
      const squareByWidth = (width - gap * (columns - 1)) / columns;
      const squareByHeight = (height - gap * (rows - 1)) / rows;
      const size = Math.floor(Math.min(squareByWidth, squareByHeight, 9));

      if (size > best.size) {
        best = { columns, size };
      }

      if (columns > Math.sqrt(totalWeeks) * 3 && size < best.size) {
        break;
      }
    }

    gridEl.style.setProperty("--week-columns", String(best.columns));
    gridEl.style.setProperty("--week-size", `${Math.max(best.size, 1)}px`);
    gridEl.style.setProperty("--week-gap", `${gap}px`);
  }

  function renderMilestones(dob, ageYears) {
    const fragment = document.createDocumentFragment();

    milestones.forEach(function (milestone) {
      const li = document.createElement("li");
      const age = document.createElement("span");
      const body = document.createElement("span");
      const title = document.createElement("span");
      const note = document.createElement("span");
      const milestoneDate = addUtcYears(dob, milestone.age);
      const delta = milestone.age - ageYears;

      age.className = "milestone-age";
      age.textContent = `${milestone.age}`;
      title.className = "milestone-title";
      title.textContent = milestone.title;
      note.className = "milestone-note";
      note.textContent = `${formatDisplayDate(milestoneDate)} · ${formatMilestoneDelta(delta)}. ${milestone.note}`;

      body.append(title, note);
      li.append(age, body);
      fragment.appendChild(li);
    });

    milestoneListEl.replaceChildren(fragment);
  }

  function formatMilestoneDelta(delta) {
    if (delta === 0) {
      return "around now";
    }

    const years = Math.abs(delta);
    const label = `${years} ${years === 1 ? "year" : "years"}`;
    return delta > 0 ? `in ${label}` : `${label} ago`;
  }

  function setError(message) {
    errorEl.textContent = message;
  }

  function parseInputDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const parts = value.split("-").map(Number);
    const year = parts[0];
    const month = parts[1] - 1;
    const day = parts[2];
    const date = new Date(Date.UTC(year, month, day));

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
      return null;
    }

    return date;
  }

  function addUtcYears(date, years) {
    const year = date.getUTCFullYear() + years;
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const next = new Date(Date.UTC(year, month, day));

    if (next.getUTCMonth() !== month) {
      return new Date(Date.UTC(year, month + 1, 0));
    }

    return next;
  }

  function getAgeParts(start, end) {
    if (end <= start) {
      return { years: 0, months: 0 };
    }

    let years = end.getUTCFullYear() - start.getUTCFullYear();
    let lastBirthday = addUtcYears(start, years);

    if (lastBirthday > end) {
      years -= 1;
      lastBirthday = addUtcYears(start, years);
    }

    const nextBirthday = addUtcYears(start, years + 1);
    const daysSinceBirthday = Math.floor((end.getTime() - lastBirthday.getTime()) / (24 * 60 * 60 * 1000));
    const birthdaySpan = Math.max(1, Math.floor((nextBirthday.getTime() - lastBirthday.getTime()) / (24 * 60 * 60 * 1000)));
    const months = Math.floor((daysSinceBirthday / birthdaySpan) * 12);

    return { years, months };
  }

  function formatAge(age) {
    return `${formatNumber(age.years)}y ${age.months}m`;
  }

  function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  function formatInputDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
