// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Ticket date stamp
const ticketDate = document.getElementById("ticketDate");
if (ticketDate) {
  ticketDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Hero Ticket Rotation
const heroTickets = [
  { name: "Hydrochloric Acid, 32%", hazard: "Corrosive", cas: "7647-01-0", purity: "32% ± 0.5%", packing: "35 kg Carboy", batch: "HE-2026-0714" },
  { name: "Caustic Soda, Flakes", hazard: "Corrosive", cas: "1310-73-2", purity: "98% min", packing: "50 kg Bag", batch: "HE-2026-0522" },
  { name: "Sulphuric Acid, 98%", hazard: "Corrosive", cas: "7664-93-9", purity: "98% ± 0.3%", packing: "230 kg Drum", batch: "HE-2026-0389" },
  { name: "Sodium Hypochlorite", hazard: "Oxidizer", cas: "7681-52-9", purity: "10–12%", packing: "35 kg Carboy", batch: "HE-2026-0661" },
  { name: "Poly Aluminium Chloride", hazard: "Irritant", cas: "1327-41-9", purity: "30%", packing: "25 kg Bag", batch: "HE-2026-0247" },
];

(function initHeroTicketRotation() {
  const ticket = document.getElementById("heroTicket");
  if (!ticket) return;

  const fields = {
    name: document.getElementById("ticketName"),
    hazard: document.getElementById("ticketHazard"),
    cas: document.getElementById("ticketCas"),
    purity: document.getElementById("ticketPurity"),
    packing: document.getElementById("ticketPacking"),
    batch: document.getElementById("ticketBatch"),
  };
  const dotsWrap = document.getElementById("ticketDots");

  heroTickets.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("is-active");
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll("span");

  let index = 0;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function applyTicket(data) {
    fields.name.textContent = data.name;
    fields.hazard.textContent = data.hazard;
    fields.cas.textContent = data.cas;
    fields.purity.textContent = data.purity;
    fields.packing.textContent = data.packing;
    fields.batch.textContent = data.batch;
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  }

  function showNext() {
    index = (index + 1) % heroTickets.length;
    if (prefersReducedMotion) {
      applyTicket(heroTickets[index]);
      return;
    }
    ticket.classList.add("is-fading");
    setTimeout(() => {
      applyTicket(heroTickets[index]);
      ticket.classList.remove("is-fading");
    }, 250);
  }

  if (!prefersReducedMotion) {
    setInterval(showNext, 3200);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      if (i === index) return;
      index = i;
      ticket.classList.add("is-fading");
      setTimeout(() => {
        applyTicket(heroTickets[index]);
        ticket.classList.remove("is-fading");
      }, 250);
    });
  });
})();

// Scroll reveal
const revealEls = document.querySelectorAll(".reveal");
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

// Prefill chemical field from product cards
document.querySelectorAll("[data-chemical]").forEach((link) => {
  link.addEventListener("click", () => {
    const field = document.getElementById("chemical");
    if (field) field.value = link.getAttribute("data-chemical");
  });
});

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
    submitBtn.textContent = "Submitting…";

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
      submitBtn.textContent = "Submit Request";
    }
  });
}