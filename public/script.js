// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Ticket date stamp
const ticketDate = document.getElementById("ticketDate");
if (ticketDate) {
  ticketDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Header scroll state (transparent-over-hero -> solid on scroll)
const siteHeader = document.getElementById("siteHeader");
function updateHeaderState() {
  if (window.scrollY > 40) siteHeader.classList.add("is-scrolled");
  else siteHeader.classList.remove("is-scrolled");
}
updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });
  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

// Duplicate marquee content once so the CSS keyframe (-50%) loops seamlessly
const marqueeTrack = document.getElementById("marqueeTrack");
if (marqueeTrack) {
  marqueeTrack.innerHTML += marqueeTrack.innerHTML;
}

// Scroll reveal (also triggers staggered children via the .stagger class)
const revealEls = document.querySelectorAll(".reveal");
const countEls = document.querySelectorAll("[data-count]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateCount(el) {
  const target = parseInt(el.getAttribute("data-count"), 10);
  const suffix = el.getAttribute("data-suffix") || "";
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if ("IntersectionObserver" in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

if ("IntersectionObserver" in window && countEls.length) {
  const countIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countIo.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  countEls.forEach((el) => countIo.observe(el));
} else {
  countEls.forEach(animateCount);
}

// Prefill chemical field from product cards
document.querySelectorAll("[data-chemical]").forEach((link) => {
  link.addEventListener("click", () => {
    const field = document.getElementById("chemical");
    if (field) field.value = link.getAttribute("data-chemical");
  });
});

// Rotating hero certificate card — cycles through a few stock chemicals
const heroCerts = [
  { name: "Hydrochloric Acid, 32%", status: "QC Passed", cas: "7647-01-0", purity: "32% ± 0.5%", packing: "35 kg Carboy", batch: "HE-2026-0714" },
  { name: "Caustic Lye, Flakes", status: "QC Passed", cas: "1310-73-2", purity: "98% min", packing: "50 kg Bag", batch: "HE-2026-0522" },
  { name: "Citric Acid, Anhydrous", status: "QC Passed", cas: "77-92-9", purity: "99.5%", packing: "25 kg Bag", batch: "HE-2026-0389" },
  { name: "SMBS (Sodium Metabisulfite)", status: "QC Passed", cas: "7681-57-4", purity: "97%", packing: "50 kg Bag", batch: "HE-2026-0661" },
  { name: "IPA (Isopropyl Alcohol)", status: "QC Passed", cas: "67-63-0", purity: "99.9%", packing: "Drum", batch: "HE-2026-0247" },
];

(function initHeroCertRotation() {
  const card = document.getElementById("heroCert");
  if (!card) return;

  const fields = {
    name: document.getElementById("certName"),
    status: document.getElementById("certStatus"),
    cas: document.getElementById("certCas"),
    purity: document.getElementById("certPurity"),
    packing: document.getElementById("certPacking"),
    batch: document.getElementById("certBatch"),
  };
  const dotsWrap = document.getElementById("certDots");

  heroCerts.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("is-active");
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll("span");

  let index = 0;

  function applyCert(data) {
    fields.name.textContent = data.name;
    fields.status.textContent = data.status;
    fields.cas.textContent = data.cas;
    fields.purity.textContent = data.purity;
    fields.packing.textContent = data.packing;
    fields.batch.textContent = data.batch;
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  }

  function goTo(i) {
    if (i === index && card.dataset.inited) return;
    index = i;
    card.dataset.inited = "1";
    card.classList.add("is-fading");
    setTimeout(() => {
      applyCert(heroCerts[index]);
      card.classList.remove("is-fading");
    }, 280);
  }

  function showNext() {
    goTo((index + 1) % heroCerts.length);
  }

  setInterval(showNext, 3400);

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => goTo(i));
  });
})();

// Request form submission
const form = document.getElementById("requestForm");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "";

    const payload = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      chemical: form.chemical.value.trim(),
      quantity: form.quantity.value.trim(),
      unit: form.unit.value,
      industry: form.industry.value,
      message: form.message.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      status.textContent = `Request received (Ref #${data.id}). Our team will contact you shortly.`;
      status.classList.add("show", "ok");
      form.reset();
    } catch (err) {
      status.textContent = err.message || "Could not submit request. Please try again.";
      status.classList.add("show", "err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    }
  });
}
