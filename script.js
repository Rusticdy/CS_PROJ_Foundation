"use strict";
// Shared mobile navigation.
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton?.getAttribute("aria-expanded") === "true"
  ) {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    menuButton.focus();
  }
});

// Client-side demonstration only. No data is transmitted or persisted.
const form = document.querySelector("#access-form");
if (form) {
  const personnel = document.querySelector("#personnel");
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const status = document.querySelector("#form-status");
  const loginPanel = document.querySelector("#login-panel");
  const classifiedPanel = document.querySelector("#classified-panel");
  const toggle = document.querySelector("#toggle-password");
  const fields = [personnel, email, password];
  function getError(field) {
    if (field === personnel)
      return /^UC-\d{4}$/.test(field.value.trim())
        ? ""
        : "Enter an ID in the format UC-0001 (7 characters).";
    if (field === email) {
      const value = field.value.trim();
      if (
        !value ||
        value.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      )
        return "Enter a valid email address (up to 100 characters).";
      if (!/^[^\s@]+@umbrella\.corp$/i.test(value))
        return "Use your @umbrella.corp address.";
      return "";
    }
    if (field === password) {
      if (field.value.length < 8 || field.value.length > 32)
        return "Your password must contain 8–32 characters.";
      if (
        !/[a-z]/.test(field.value) ||
        !/[A-Z]/.test(field.value) ||
        !/[0-9]/.test(field.value)
      )
        return "Include an uppercase letter, a lowercase letter and a number.";
      return "";
    }
    return "";
  }
  function validate(field) {
    const message = getError(field);
    document.querySelector(`#${field.id}-error`).textContent = message;
    field.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  }
  fields.forEach((field) => {
    field.addEventListener("blur", () => validate(field));
    field.addEventListener(
      field.type === "checkbox" ? "change" : "input",
      () => {
        status.textContent = "";
        if (field.hasAttribute("aria-invalid")) validate(field);
      },
    );
  });
  toggle.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.textContent = show ? "Hide" : "Show";
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(show));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    personnel.value = personnel.value.trim();
    email.value = email.value.trim();
    const valid = fields.map(validate).every(Boolean);
    if (!valid) {
      status.textContent = "Please check the highlighted fields.";
      fields
        .find((field) => field.getAttribute("aria-invalid") === "true")
        .focus();
      return;
    }
    loginPanel.hidden = true;
    classifiedPanel.hidden = false;
    form.reset();
    password.type = "password";
    toggle.textContent = "Show";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");
    classifiedPanel.focus();
  });
  document.querySelector("#sign-out").addEventListener("click", () => {
    classifiedPanel.hidden = true;
    loginPanel.hidden = false;
    form.reset();
    status.textContent = "";
    fields.forEach((field) => {
      field.removeAttribute("aria-invalid");
      document.querySelector(`#${field.id}-error`).textContent = "";
    });
    personnel.focus();
  });
}

// Add another .hero-slide inside .carousel-track to extend the carousel.
// data-interval on .hero-carousel controls the rotation delay in milliseconds.
const carousel = document.querySelector(".hero-carousel");
if (carousel) {
  const track = carousel.querySelector(".carousel-track");
  const slides = Array.from(track.querySelectorAll(".hero-slide"));
  const selectors = carousel.querySelector(".slide-selectors");
  const controls = carousel.querySelector(".slide-controls");
  const counter = carousel.querySelector(".slide-counter");
  const toggle = carousel.querySelector(".rotation-toggle");
  const timerLabel = carousel.querySelector(".timer-label");
  const progress = carousel.querySelector(".timer-progress");
  const configuredInterval = Number(carousel.dataset.interval);
  const interval =
    Number.isFinite(configuredInterval) && configuredInterval >= 1000
      ? configuredInterval
      : 18000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentSlide = 0;
  let remaining = interval;
  let deadline = 0;
  let ticker = null;
  let pausedByUser = reducedMotion.matches;
  let hovered = false;
  let focused = false;
  let inView = true;
  let touchStart = null;

  // Build selectors and accessible labels from the actual slide count.
  const dots = slides.map((slide, index) => {
    slide.id ||= `hero-slide-${index + 1}`;
    const title = slide.dataset.title || `Highlight ${index + 1}`;
    slide.setAttribute(
      "aria-label",
      `${index + 1} of ${slides.length}: ${title}`,
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slide-dot";
    button.setAttribute("aria-label", `Show slide ${index + 1}: ${title}`);
    button.setAttribute("aria-controls", slide.id);
    button.addEventListener("click", () => goToSlide(index));
    selectors.append(button);
    return button;
  });

  function renderTimer() {
    const paused = ticker === null;
    timerLabel.textContent = paused
      ? "Paused"
      : `Next in ${Math.ceil(remaining / 1000)}s`;
    progress.style.transform = `scaleX(${1 - remaining / interval})`;
    toggle.textContent = pausedByUser ? "Play" : "Pause";
    toggle.setAttribute(
      "aria-label",
      pausedByUser ? "Start automatic slides" : "Pause automatic slides",
    );
    toggle.setAttribute("aria-pressed", String(pausedByUser));
  }

  function stopTimer() {
    if (ticker !== null) {
      remaining = Math.max(0, deadline - performance.now());
      window.clearInterval(ticker);
      ticker = null;
    }
  }

  function syncTimer() {
    const shouldPlay =
      slides.length > 1 &&
      !pausedByUser &&
      !hovered &&
      !focused &&
      !document.hidden &&
      inView;
    if (!shouldPlay) {
      stopTimer();
    } else if (ticker === null) {
      deadline = performance.now() + remaining;
      ticker = window.setInterval(() => {
        remaining = Math.max(0, deadline - performance.now());
        if (remaining === 0) goToSlide(currentSlide + 1);
        else renderTimer();
      }, 200);
    }
    renderTimer();
  }

  function goToSlide(index) {
    stopTimer();
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentSlide;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.inert = !active;
    });
    dots.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === currentSlide));
    });
    counter.textContent = `${String(currentSlide + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    remaining = interval;
    syncTimer();
  }

  carousel.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      goToSlide(currentSlide + Number(button.dataset.direction));
    });
  });
  controls.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(currentSlide + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  toggle.addEventListener("click", () => {
    pausedByUser = !pausedByUser;
    syncTimer();
  });
  carousel.addEventListener("mouseenter", () => {
    hovered = true;
    syncTimer();
  });
  carousel.addEventListener("mouseleave", () => {
    hovered = false;
    syncTimer();
  });
  carousel.addEventListener("focusin", () => {
    focused = true;
    syncTimer();
  });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      focused = false;
      syncTimer();
    }
  });
  document.addEventListener("visibilitychange", syncTimer);
  reducedMotion.addEventListener("change", (event) => {
    pausedByUser = event.matches;
    syncTimer();
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncTimer();
      },
      { threshold: 0 },
    );
    observer.observe(carousel);
  }

  // Horizontal touch gestures leave normal vertical scrolling available.
  track.addEventListener(
    "touchstart",
    (event) => {
      touchStart =
        event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
    },
    { passive: true },
  );
  track.addEventListener(
    "touchend",
    (event) => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goToSlide(currentSlide + (dx < 0 ? 1 : -1));
      }
      touchStart = null;
    },
    { passive: true },
  );
  track.addEventListener(
    "touchcancel",
    () => {
      touchStart = null;
    },
    { passive: true },
  );

  if (slides.length) {
    // All slides share a grid cell, keeping the page height steady during swaps.
    slides.forEach((slide) => {
      slide.hidden = false;
    });
    carousel.classList.add("is-ready");
    controls.hidden = slides.length < 2;
    goToSlide(0);
  }
}
