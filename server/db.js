const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "inquiries.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("Failed to read inquiries store:", err);
    return [];
  }
}

function writeAll(records) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

function addInquiry(entry) {
  const records = readAll();
  const nextId = records.length ? Math.max(...records.map((r) => r.id)) + 1 : 1;
  const record = {
    id: nextId,
    status: "new",
    createdAt: new Date().toISOString(),
    ...entry,
  };
  records.push(record);
  writeAll(records);
  return record;
}

function listInquiries() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function updateStatus(id, status) {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === Number(id));
  if (idx === -1) return null;
  records[idx].status = status;
  writeAll(records);
  return records[idx];
}

module.exports = { addInquiry, listInquiries, updateStatus };
