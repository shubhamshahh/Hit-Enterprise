const path = require("path");
const express = require("express");
const { addInquiry, listInquiries, updateStatus } = require("./db");
const { sendWhatsAppNotification } = require("./notify");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const REQUIRED_FIELDS = ["name", "phone", "chemical", "quantity"];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Public: submit a chemical request / quote inquiry
app.post("/api/inquiries", (req, res) => {
  const body = req.body || {};

  const missing = REQUIRED_FIELDS.filter((field) => !String(body[field] || "").trim());
  if (missing.length) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(", ")}`,
    });
  }
  if (body.email && !isValidEmail(body.email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  const record = addInquiry({
    name: String(body.name).trim(),
    company: String(body.company || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone).trim(),
    chemical: String(body.chemical).trim(),
    quantity: String(body.quantity).trim(),
    unit: String(body.unit || "kg").trim(),
    industry: String(body.industry || "").trim(),
    message: String(body.message || "").trim(),
  });

  // Fire-and-forget: don't make the person wait on WhatsApp delivery,
  // and never fail their submission if the notification fails.
  sendWhatsAppNotification(record);

  return res.status(201).json({ ok: true, id: record.id });
});

// Admin auth middleware — checks a shared password sent as a header
function requireAdmin(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password." });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password." });
  }
  res.json({ ok: true });
});

app.get("/api/admin/inquiries", requireAdmin, (req, res) => {
  res.json(listInquiries());
});

app.patch("/api/admin/inquiries/:id", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  const allowed = ["new", "contacted", "closed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }
  const updated = updateStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: "Inquiry not found." });
  res.json(updated);
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Hit Enterprise server running on http://localhost:${PORT}`);
});
