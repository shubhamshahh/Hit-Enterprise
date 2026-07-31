const fs = require("fs");
const path = require("path");

// Load .env file automatically
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valParts] = trimmed.split("=");
      const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

const express = require("express");
const {
  addInquiry,
  listInquiries,
  updateInquiry,
  deleteInquiry,
  getStats,
  exportInquiriesCSV,
  readAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("./db");
const { sendNotification } = require("./notify");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Explicit page routes for Render/Linux deployment compatibility
app.get(["/admin", "/admin.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Simple in-memory rate limiter for quote submissions & admin logins
const rateLimitMap = new Map();
function rateLimiter(maxRequests = 10, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "global";
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count++;
    }

    rateLimitMap.set(ip, clientData);

    if (clientData.count > maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please try again in a minute." });
    }
    next();
  };
}

const REQUIRED_FIELDS = ["name", "phone", "chemical", "quantity"];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -------------------------------------------------------------
// PUBLIC API ENDPOINTS
// -------------------------------------------------------------

// Public: Chemical Request / Quote submission
app.post("/api/inquiries", rateLimiter(5, 60 * 1000), (req, res) => {
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

  // Direct Instant Admin Notification (WhatsApp/SMS/Telegram/Email)
  sendNotification(record);

  return res.status(201).json({ ok: true, id: record.id });
});

// Public: Get product catalog
app.get("/api/products", (req, res) => {
  const products = readAllProducts().filter((p) => p.status === "active");
  res.json(products);
});

// -------------------------------------------------------------
// ADMIN AUTH MIDDLEWARE
// -------------------------------------------------------------

function requireAdmin(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password." });
  }
  next();
}

app.post("/api/admin/login", rateLimiter(10, 60 * 1000), (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password." });
  }
  res.json({ ok: true });
});

// -------------------------------------------------------------
// ADMIN API ENDPOINTS
// -------------------------------------------------------------

// Get KPI Stats
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  res.json(getStats());
});

// List Inquiries (with Search & Filter)
app.get("/api/admin/inquiries", requireAdmin, (req, res) => {
  const { search, status } = req.query;
  const data = listInquiries({ search, status });
  res.json(data);
});

// Update Inquiry (Status or Admin Notes)
app.patch("/api/admin/inquiries/:id", requireAdmin, (req, res) => {
  const { status, adminNotes } = req.body || {};

  const updates = {};
  if (status !== undefined) {
    const allowed = ["new", "contacted", "quoted", "closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    }
    updates.status = status;
  }

  if (adminNotes !== undefined) {
    updates.adminNotes = String(adminNotes).trim();
  }

  const updated = updateInquiry(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: "Inquiry not found." });
  res.json(updated);
});

// Delete Inquiry
app.delete("/api/admin/inquiries/:id", requireAdmin, (req, res) => {
  const deleted = deleteInquiry(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Inquiry not found." });
  res.json({ ok: true });
});

// Export Inquiries as CSV
app.get("/api/admin/export", requireAdmin, (req, res) => {
  const csv = exportInquiriesCSV();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=Hit_Enterprise_Inquiries_${Date.now()}.csv`);
  res.send(csv);
});

// Product Catalog CRUD (Admin)
app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(readAllProducts());
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.category) {
    return res.status(400).json({ error: "Product name and category are required." });
  }
  const product = addProduct(body);
  res.status(201).json(product);
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const updated = updateProduct(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json(updated);
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const deleted = deleteProduct(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Product not found." });
  res.json({ ok: true });
});

// Test Notification Endpoint
app.post("/api/admin/test-notify", requireAdmin, async (req, res) => {
  const testRecord = {
    id: 9999,
    name: "Test Customer",
    company: "Test Enterprise",
    phone: "+919876543210",
    email: "test@example.com",
    chemical: "Hydrochloric Acid 37%",
    quantity: "1000",
    unit: "Liters",
    industry: "Pharmaceutical",
    message: "This is a test notification from Hit Enterprise Admin Dashboard.",
    createdAt: new Date().toISOString(),
  };

  try {
    await sendNotification(testRecord);
    res.json({ ok: true, message: "Test notification sent! Check your phone/email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 Hit Enterprise server running on http://localhost:${PORT}`);
});
