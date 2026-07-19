const loginScreen = document.getElementById("loginScreen");
const adminScreen = document.getElementById("adminScreen");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const tableWrap = document.getElementById("tableWrap");

function getStoredPassword() {
  return sessionStorage.getItem("hitAdminPassword");
}

function showAdmin() {
  loginScreen.style.display = "none";
  adminScreen.style.display = "block";
  loadInquiries();
}

function showLogin() {
  loginScreen.style.display = "block";
  adminScreen.style.display = "none";
}

async function attemptLogin(password) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  sessionStorage.setItem("hitAdminPassword", password);
  return true;
}

loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value;
  loginError.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Checking…";
  const ok = await attemptLogin(password);
  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadInquiries() {
  tableWrap.innerHTML = '<div class="empty-state">Loading…</div>';
  const password = getStoredPassword();
  const res = await fetch("/api/admin/inquiries", {
    headers: { "x-admin-password": password },
  });
  if (res.status === 401) {
    sessionStorage.removeItem("hitAdminPassword");
    showLogin();
    return;
  }
  const rows = await res.json();
  renderTable(rows);
}

function renderTable(rows) {
  if (!rows.length) {
    tableWrap.innerHTML = '<div class="empty-state">No chemical requests yet. New submissions from the website will show up here.</div>';
    return;
  }

  const html = `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Contact</th>
            <th>Chemical</th>
            <th>Qty</th>
            <th>Industry</th>
            <th>Notes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join("")}
        </tbody>
      </table>
    </div>
  `;
  tableWrap.innerHTML = html;

  tableWrap.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.getAttribute("data-id");
      const status = e.target.value;
      const password = getStoredPassword();
      await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ status }),
      });
    });
  });
}

function rowHtml(r) {
  const date = new Date(r.createdAt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return `
    <tr>
      <td>${date}</td>
      <td>
        <strong>${escapeHtml(r.name)}</strong>${r.company ? `<br><span style="color:var(--color-ink-soft)">${escapeHtml(r.company)}</span>` : ""}<br>
        <a href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a>
        ${r.email ? `<br><a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a>` : ""}
      </td>
      <td>${escapeHtml(r.chemical)}</td>
      <td>${escapeHtml(r.quantity)} ${escapeHtml(r.unit)}</td>
      <td>${escapeHtml(r.industry) || "&mdash;"}</td>
      <td style="max-width:220px;">${escapeHtml(r.message) || "&mdash;"}</td>
      <td>
        <select class="status-select" data-id="${r.id}">
          <option value="new" ${r.status === "new" ? "selected" : ""}>New</option>
          <option value="contacted" ${r.status === "contacted" ? "selected" : ""}>Contacted</option>
          <option value="closed" ${r.status === "closed" ? "selected" : ""}>Closed</option>
        </select>
      </td>
    </tr>
  `;
}

// On load, try session
if (getStoredPassword()) {
  showAdmin();
} else {
  showLogin();
}
