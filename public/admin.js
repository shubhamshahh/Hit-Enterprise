// Executive Admin Dashboard Logic — Hit Enterprise

let activeTab = "overview";
let activeFilter = "all";
let inquiriesData = [];
let productsData = [];

// DOM Elements
const loginScreen = document.getElementById("loginScreen");
const adminScreen = document.getElementById("adminScreen");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const searchInput = document.getElementById("searchInput");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// Theme Switcher Logic
function initTheme() {
  const currentTheme = localStorage.getItem("hitAdminTheme") || "dark";
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
    if (themeToggleBtn) themeToggleBtn.innerHTML = "🌙 Dark Mode";
  } else {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
    if (themeToggleBtn) themeToggleBtn.innerHTML = "☀️ Light Mode";
  }
  localStorage.setItem("hitAdminTheme", theme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.classList.contains("theme-light");
    applyTheme(isLight ? "dark" : "light");
  });
}

initTheme();

// Auth helper
function getStoredPassword() {
  return sessionStorage.getItem("hitAdminPassword");
}

function showAdmin() {
  loginScreen.style.display = "none";
  adminScreen.style.display = "block";
  loadAllData();
}

function showLogin() {
  loginScreen.style.display = "flex";
  adminScreen.style.display = "none";
}

async function attemptLogin(password) {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    sessionStorage.setItem("hitAdminPassword", password);
    return true;
  } catch (err) {
    return false;
  }
}

loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value;
  loginError.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Verifying...";
  const ok = await attemptLogin(password);
  loginBtn.disabled = false;
  loginBtn.textContent = "Log In to Dashboard";
  if (ok) {
    showAdmin();
  } else {
    loginError.style.display = "block";
  }
});

passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("hitAdminPassword");
  showLogin();
});

// CSV Export
exportCsvBtn.addEventListener("click", () => {
  const password = getStoredPassword();
  if (!password) return;
  window.open(`/api/admin/export?x_pass=${encodeURIComponent(password)}`, "_blank");
});

// -------------------------------------------------------------
// TAB NAVIGATION
// -------------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const targetTab = btn.getAttribute("data-tab");
    switchTab(targetTab);
  });
});

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetBtn) targetBtn.classList.add("active");
  if (targetPane) targetPane.classList.add("active");

  if (tabId === "overview") loadStats();
  if (tabId === "inquiries") loadInquiries();
  if (tabId === "products") loadProducts();
}

document.getElementById("viewAllInquiriesBtn").addEventListener("click", () => {
  switchTab("inquiries");
});

document.getElementById("refreshStatsBtn").addEventListener("click", () => {
  loadAllData();
});

// -------------------------------------------------------------
// DATA FETCHING
// -------------------------------------------------------------
async function fetchAdmin(endpoint, options = {}) {
  const password = getStoredPassword();
  if (!password) {
    showLogin();
    return null;
  }
  const headers = {
    "x-admin-password": password,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(endpoint, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem("hitAdminPassword");
    showLogin();
    return null;
  }
  return res;
}

async function loadAllData() {
  await Promise.all([loadStats(), loadInquiries(), loadProducts()]);
}

// STATS / OVERVIEW
async function loadStats() {
  const res = await fetchAdmin("/api/admin/stats");
  if (!res || !res.ok) return;
  const stats = await res.json();

  document.getElementById("kpiTotal").textContent = stats.total || 0;
  document.getElementById("kpiNew").textContent = stats.newCount || 0;
  document.getElementById("kpiActive").textContent = (stats.contactedCount || 0) + (stats.quotedCount || 0);
  document.getElementById("kpiTopChemical").textContent = stats.topChemical || "N/A";

  if (stats.newCount > 0) {
    newInquiriesBadge.textContent = stats.newCount;
    newInquiriesBadge.style.display = "inline-block";
  } else {
    newInquiriesBadge.style.display = "none";
  }
}

// -------------------------------------------------------------
// INQUIRIES & QUOTES PIPELINE
// -------------------------------------------------------------
async function loadInquiries() {
  const res = await fetchAdmin(`/api/admin/inquiries?status=${activeFilter}&search=${encodeURIComponent(searchInput.value || "")}`);
  if (!res || !res.ok) return;
  inquiriesData = await res.json();

  renderInquiriesTable(inquiriesData, "inquiriesTableWrap");

  // Render recent preview on overview tab if visible
  if (activeTab === "overview") {
    renderInquiriesTable(inquiriesData.slice(0, 5), "recentTableWrap", true);
  }
}

// Search & Filter event handlers
let searchTimeout = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadInquiries();
  }, 250);
});

document.querySelectorAll("#statusFilterGroup .filter-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#statusFilterGroup .filter-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.getAttribute("data-filter");
    loadInquiries();
  });
});

function renderInquiriesTable(rows, containerId, isCompact = false) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  if (!rows || !rows.length) {
    wrap.innerHTML = '<div class="empty-state">No chemical inquiries match your search or filter criteria.</div>';
    return;
  }

  const html = `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Contact Client</th>
            <th>Chemical & Qty</th>
            <th>Industry</th>
            <th>Notes</th>
            <th>Status</th>
            <th>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => rowHtml(r, isCompact)).join("")}
        </tbody>
      </table>
    </div>
  `;
  wrap.innerHTML = html;

  // Status Change handler
  wrap.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.getAttribute("data-id");
      const newStatus = e.target.value;
      await fetchAdmin(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadStats();
      loadInquiries();
    });
  });

  // Admin Notes button handler
  wrap.querySelectorAll(".btn-notes").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-id");
      openNotesModal(id);
    });
  });

  // Delete button handler
  wrap.querySelectorAll(".btn-delete-inquiry").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm(`Are you sure you want to delete inquiry #${id}?`)) {
        await fetchAdmin(`/api/admin/inquiries/${id}`, { method: "DELETE" });
        loadStats();
        loadInquiries();
      }
    });
  });
}

function cleanPhoneNumber(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function rowHtml(r, isCompact) {
  const date = new Date(r.createdAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cleanPhone = cleanPhoneNumber(r.phone);
  const whatsappUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(
    `Hello ${r.name}, thank you for contacting Hit Enterprise regarding your chemical request for ${r.chemical}.`
  )}`;

  return `
    <tr class="status-row-${r.status}">
      <td class="td-date">${date}</td>
      <td class="td-contact">
        <strong class="client-name">${escapeHtml(r.name)}</strong>
        ${r.company ? `<div class="client-company">${escapeHtml(r.company)}</div>` : ""}
        <div class="contact-links">
          <a href="tel:${cleanPhone}" class="contact-link call" title="Call Phone">📞 ${escapeHtml(r.phone)}</a>
          <a href="${whatsappUrl}" target="_blank" class="contact-link whatsapp" title="Chat on WhatsApp">💬 WhatsApp</a>
          ${r.email ? `<br><a href="mailto:${escapeHtml(r.email)}" class="contact-link email">✉️ ${escapeHtml(r.email)}</a>` : ""}
        </div>
      </td>
      <td class="td-chemical">
        <strong class="chem-title">${escapeHtml(r.chemical)}</strong>
        <div class="chem-qty">${escapeHtml(r.quantity)} ${escapeHtml(r.unit || "kg")}</div>
      </td>
      <td class="td-industry">${escapeHtml(r.industry) || "&mdash;"}</td>
      <td class="td-notes">
        ${r.message ? `<div class="customer-msg">${escapeHtml(r.message)}</div>` : ""}
        ${r.adminNotes ? `<div class="admin-notes-badge">📝 ${escapeHtml(r.adminNotes)}</div>` : ""}
      </td>
      <td class="td-status">
        <select class="status-select badge-${r.status}" data-id="${r.id}">
          <option value="new" ${r.status === "new" ? "selected" : ""}>🟢 New</option>
          <option value="contacted" ${r.status === "contacted" ? "selected" : ""}>🟡 Contacted</option>
          <option value="quoted" ${r.status === "quoted" ? "selected" : ""}>🔵 Quoted</option>
          <option value="closed" ${r.status === "closed" ? "selected" : ""}>⚪ Closed</option>
        </select>
      </td>
      <td class="td-actions">
        <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp-btn btn-sm">WhatsApp</a>
        <button class="btn btn-secondary btn-sm btn-notes" data-id="${r.id}">Notes</button>
        ${!isCompact ? `<button class="btn btn-danger-icon btn-sm btn-delete-inquiry" data-id="${r.id}">&times;</button>` : ""}
      </td>
    </tr>
  `;
}

// -------------------------------------------------------------
// NOTES MODAL
// -------------------------------------------------------------
const notesModal = document.getElementById("notesModal");
const notesInquiryId = document.getElementById("notesInquiryId");
const notesInquiryHeader = document.getElementById("notesInquiryHeader");
const adminNotesInput = document.getElementById("adminNotesInput");
const saveNotesBtn = document.getElementById("saveNotesBtn");

function openNotesModal(id) {
  const record = inquiriesData.find((r) => String(r.id) === String(id));
  if (!record) return;
  notesInquiryId.value = id;
  notesInquiryHeader.textContent = `Inquiry #${record.id} — ${record.name} (${record.chemical})`;
  adminNotesInput.value = record.adminNotes || "";
  notesModal.style.display = "flex";
}

document.getElementById("closeNotesModal").addEventListener("click", () => (notesModal.style.display = "none"));
document.getElementById("cancelNotesModal").addEventListener("click", () => (notesModal.style.display = "none"));

saveNotesBtn.addEventListener("click", async () => {
  const id = notesInquiryId.value;
  const adminNotes = adminNotesInput.value;
  saveNotesBtn.disabled = true;
  saveNotesBtn.textContent = "Saving...";
  await fetchAdmin(`/api/admin/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ adminNotes }),
  });
  saveNotesBtn.disabled = false;
  saveNotesBtn.textContent = "Save Notes";
  notesModal.style.display = "none";
  loadInquiries();
});

// -------------------------------------------------------------
// PRODUCT CATALOG MANAGER
// -------------------------------------------------------------
async function loadProducts() {
  const res = await fetchAdmin("/api/admin/products");
  if (!res || !res.ok) return;
  productsData = await res.json();
  renderProductsTable(productsData);
}

function renderProductsTable(products) {
  const wrap = document.getElementById("productsTableWrap");
  if (!wrap) return;

  if (!products || !products.length) {
    wrap.innerHTML = '<div class="empty-state">No products in catalogue. Click "+ Add New Chemical Product" to add one.</div>';
    return;
  }

  const html = `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Chemical Name</th>
            <th>Category</th>
            <th>CAS No</th>
            <th>Purity / Grade</th>
            <th>Packaging</th>
            <th>Applications</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (p) => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td><span class="category-pill">${escapeHtml(p.category)}</span></td>
              <td><code>${escapeHtml(p.cas) || "&mdash;"}</code></td>
              <td>${escapeHtml(p.purity || p.grade || "&mdash;")}</td>
              <td>${escapeHtml(p.packaging) || "&mdash;"}</td>
              <td style="max-width:200px;">${escapeHtml(p.applications) || "&mdash;"}</td>
              <td>
                <button class="btn btn-secondary btn-sm btn-edit-prod" data-id="${p.id}">Edit</button>
                <button class="btn btn-danger-icon btn-sm btn-del-prod" data-id="${p.id}">&times;</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
  wrap.innerHTML = html;

  wrap.querySelectorAll(".btn-edit-prod").forEach((b) => {
    b.addEventListener("click", () => openProductModal(b.getAttribute("data-id")));
  });

  wrap.querySelectorAll(".btn-del-prod").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      if (confirm("Delete this product from catalog?")) {
        await fetchAdmin(`/api/admin/products/${id}`, { method: "DELETE" });
        loadProducts();
      }
    });
  });
}

// Product Modal
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");

document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
document.getElementById("closeProductModal").addEventListener("click", () => (productModal.style.display = "none"));
document.getElementById("cancelProductModal").addEventListener("click", () => (productModal.style.display = "none"));

function openProductModal(id) {
  document.getElementById("modalTitle").textContent = id ? "Edit Chemical Product" : "Add Chemical Product";
  document.getElementById("prodId").value = id || "";

  if (id) {
    const prod = productsData.find((p) => String(p.id) === String(id));
    if (prod) {
      document.getElementById("prodName").value = prod.name || "";
      document.getElementById("prodCategory").value = prod.category || "";
      document.getElementById("prodCas").value = prod.cas || "";
      document.getElementById("prodGrade").value = prod.grade || "";
      document.getElementById("prodPurity").value = prod.purity || "";
      document.getElementById("prodPackaging").value = prod.packaging || "";
      document.getElementById("prodApplications").value = prod.applications || "";
    }
  } else {
    productForm.reset();
  }
  productModal.style.display = "flex";
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("prodId").value;
  const payload = {
    name: document.getElementById("prodName").value,
    category: document.getElementById("prodCategory").value,
    cas: document.getElementById("prodCas").value,
    grade: document.getElementById("prodGrade").value,
    purity: document.getElementById("prodPurity").value,
    packaging: document.getElementById("prodPackaging").value,
    applications: document.getElementById("prodApplications").value,
  };

  if (id) {
    await fetchAdmin(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } else {
    await fetchAdmin("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  productModal.style.display = "none";
  loadProducts();
});

// -------------------------------------------------------------
// SETTINGS / TEST NOTIFICATION
// -------------------------------------------------------------
const testNotifyBtn = document.getElementById("testNotifyBtn");
const testNotifyResult = document.getElementById("testNotifyResult");

testNotifyBtn.addEventListener("click", async () => {
  testNotifyResult.textContent = "Sending test notification...";
  testNotifyResult.className = "notify-result pending";
  testNotifyBtn.disabled = true;

  const res = await fetchAdmin("/api/admin/test-notify", { method: "POST" });
  testNotifyBtn.disabled = false;

  if (res && res.ok) {
    const data = await res.json();
    testNotifyResult.textContent = data.message || "Test alert sent successfully!";
    testNotifyResult.className = "notify-result success";
  } else {
    const errData = res ? await res.json() : {};
    testNotifyResult.textContent = `Failed: ${errData.error || "Check server console or .env variables."}`;
    testNotifyResult.className = "notify-result error";
  }
});

// Helper for escaping HTML
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// Initial Load
if (getStoredPassword()) {
  showAdmin();
} else {
  showLogin();
}
