let products = [
  {
    id: "PL",
    name: "Personal Loan",
    type: "Unsecured",
    rate: 15.5,
    min: 50000,
    max: 2500000,
    tenure: "6-60 months",
    rules: ["Bureau score above 680", "FOIR below 55%", "Verified income", "Active mandate before disbursement"]
  },
  {
    id: "BL",
    name: "Business Loan",
    type: "Unsecured",
    rate: 18,
    min: 100000,
    max: 5000000,
    tenure: "12-48 months",
    rules: ["Business vintage above 18 months", "GST or bank statement verified", "Bureau score above 650", "Underwriter review for deviations"]
  },
  {
    id: "LAP",
    name: "Loan Against Property",
    type: "Secured",
    rate: 11.25,
    min: 500000,
    max: 50000000,
    tenure: "36-180 months",
    rules: ["LTV below 70%", "Legal clearance required", "Technical valuation required", "Insurance tracked until closure"]
  },
  {
    id: "VL",
    name: "Vehicle Loan",
    type: "Secured",
    rate: 12.5,
    min: 75000,
    max: 3500000,
    tenure: "12-84 months",
    rules: ["Vehicle RC verification", "LTV below 85%", "Dealer or customer disbursement", "Hypothecation confirmation"]
  }
];

const defaultLoans = [
  {
    id: "APP-1001",
    name: "Aarav Mehta",
    mobile: "+91 98765 43210",
    product: "Personal Loan",
    secured: false,
    amount: 650000,
    tenure: 36,
    income: 95000,
    purpose: "Home renovation",
    status: "Underwriting",
    stage: 4,
    bureau: 742,
    dpd: 0,
    emiPaid: 8,
    emiTotal: 36,
    outstanding: 521440,
    collateral: null
  },
  {
    id: "APP-1002",
    name: "Kavya Textiles Pvt Ltd",
    mobile: "+91 98400 24590",
    product: "Business Loan",
    secured: false,
    amount: 1800000,
    tenure: 36,
    income: 325000,
    purpose: "Working capital",
    status: "Disbursed",
    stage: 7,
    bureau: 689,
    dpd: 7,
    emiPaid: 14,
    emiTotal: 36,
    outstanding: 1198020,
    collateral: null
  },
  {
    id: "APP-1003",
    name: "Neel Shah",
    mobile: "+91 99887 11220",
    product: "Loan Against Property",
    secured: true,
    amount: 5200000,
    tenure: 120,
    income: 210000,
    purpose: "Business expansion",
    status: "Collateral Review",
    stage: 3,
    bureau: 718,
    dpd: 0,
    emiPaid: 0,
    emiTotal: 120,
    outstanding: 5200000,
    collateral: {
      type: "Residential property",
      value: 8200000,
      ltv: 63,
      legal: "In progress",
      valuation: "Complete",
      insurance: "Pending"
    }
  },
  {
    id: "APP-1004",
    name: "Riya Kapoor",
    mobile: "+91 90044 77551",
    product: "Vehicle Loan",
    secured: true,
    amount: 940000,
    tenure: 60,
    income: 125000,
    purpose: "New car purchase",
    status: "Collections",
    stage: 8,
    bureau: 701,
    dpd: 34,
    emiPaid: 19,
    emiTotal: 60,
    outstanding: 648750,
    collateral: {
      type: "Vehicle",
      value: 1120000,
      ltv: 84,
      legal: "Complete",
      valuation: "Complete",
      insurance: "Active"
    }
  }
];

const navItems = [
  ["dashboard", "Dashboard", "▦"],
  ["origination", "Origination", "◎"],
  ["products", "Products", "◫"],
  ["servicing", "Servicing", "▤"],
  ["collections", "Collections", "◉"],
  ["collateral", "Collateral", "⌂"],
  ["reports", "Reports", "↗"]
];

const stages = [
  "Lead",
  "KYC/KYB",
  "Document Check",
  "Credit Decision",
  "Underwriting",
  "Offer",
  "Agreement",
  "Disbursement",
  "Servicing",
  "Collections",
  "Closure"
];

const state = {
  view: "dashboard",
  loans: [],
  audit: [],
  online: false,
  error: null
};

const view = document.querySelector("#view");
const pageTitle = document.querySelector("#pageTitle");
const nav = document.querySelector("#nav");
const dialog = document.querySelector("#applicationDialog");
const form = document.querySelector("#applicationForm");
const loginDialog = document.querySelector("#loginDialog");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const sessionBadge = document.querySelector("#sessionBadge");

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "API request failed");
  return payload;
}

async function checkSession() {
  const session = await api("/api/session");
  state.user = session.user;
  return session.authenticated;
}

async function loadLiveData() {
  const [productPayload, loanPayload] = await Promise.all([api("/api/products"), api("/api/loans")]);
  products = productPayload.products;
  state.loans = loanPayload.loans;
  state.audit = loanPayload.audit || [];
  state.online = true;
  state.error = null;
}

function renderNav() {
  nav.innerHTML = navItems
    .map(([id, label, icon]) => `<button data-view="${id}" class="${state.view === id ? "active" : ""}"><span>${icon}</span>${label}</button>`)
    .join("");
}

function renderSession() {
  sessionBadge.textContent = state.user ? `${state.user.role} · ${state.user.email}` : "Signed out";
}

function setView(name) {
  state.view = name;
  pageTitle.textContent = navItems.find(([id]) => id === name)?.[1] || "Dashboard";
  renderNav();
  render();
}

function statusClass(status, dpd = 0) {
  if (dpd > 30 || status === "Collections") return "red";
  if (status.includes("Review") || status === "Underwriting") return "amber";
  if (status === "Disbursed" || status === "Active") return "green";
  return "blue";
}

function metrics() {
  const totalBook = state.loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const overdue = state.loans.filter((loan) => loan.dpd > 0);
  const secured = state.loans.filter((loan) => loan.secured);
  return [
    ["Portfolio outstanding", money(totalBook), "Live loan book across products"],
    ["Active applications", state.loans.length, "Origination and servicing cases"],
    ["Overdue cases", overdue.length, `${money(overdue.reduce((sum, loan) => sum + loan.outstanding, 0))} at risk`],
    ["Secured exposure", secured.length, `${money(secured.reduce((sum, loan) => sum + loan.outstanding, 0))} with collateral`]
  ];
}

function renderDashboard() {
  const recent = state.loans.slice(-4).reverse();
  view.innerHTML = `
    <div class="metric-grid">
      ${metrics().map(([label, value, hint]) => `<article class="metric"><span>${label}</span><strong>${value}</strong><span>${hint}</span></article>`).join("")}
    </div>
    <div class="content-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Loan Command Center</h2>
            <p class="muted">Applications, disbursements, repayments, delinquency, and collateral health in one operating layer.</p>
          </div>
          <button class="mini-button" data-action="open-new">Add Case</button>
        </div>
        <div class="card-grid">
          ${recent.map(loanCard).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Lifecycle Workflow</h2>
            <p class="muted">The platform keeps every loan moving through controlled stages.</p>
          </div>
        </div>
        <div class="timeline">
          ${stages.map((stage, index) => `<div class="timeline-item ${index < 8 ? "done" : ""}"><div class="timeline-dot">${index + 1}</div><div><strong>${stage}</strong><span class="muted">${stageCopy(stage)}</span></div></div>`).join("")}
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Live Activity</h2>
          <p class="muted">These events are coming from the backend audit log.</p>
        </div>
        <span class="pill ${state.online ? "green" : "red"}">${state.online ? "API Online" : "API Offline"}</span>
      </div>
      <div class="rule-list">
        ${(state.audit.length ? state.audit : [{ at: new Date().toISOString(), type: "NoAuditYet" }])
          .slice(0, 6)
          .map((event) => `<div class="rule-row"><span>${event.type}${event.loanId ? ` · ${event.loanId}` : ""}${event.action ? ` · ${event.action}` : ""}</span><span class="muted">${new Date(event.at).toLocaleString()}</span></div>`)
          .join("")}
      </div>
    </section>
  `;
}

function stageCopy(stage) {
  const copy = {
    Lead: "Customer, partner, branch, or digital source.",
    "KYC/KYB": "Identity, address, business, and consent checks.",
    "Document Check": "Dynamic checklist by product and risk.",
    "Credit Decision": "Bureau, FOIR, LTV, rules, and scorecards.",
    Underwriting: "Manual review, deviations, and approval matrix.",
    Offer: "Sanction terms, charges, and repayment structure.",
    Agreement: "Document generation, e-sign, mandate, and conditions.",
    Disbursement: "Maker-checker payout and GL posting.",
    Servicing: "Schedule, interest, charges, statements, and requests.",
    Collections: "DPD buckets, agent queues, PTP, legal, and recovery.",
    Closure: "Foreclosure, settlement, NOC, and collateral release."
  };
  return copy[stage];
}

function loanCard(loan) {
  return `
    <article class="loan-card">
      <header>
        <div>
          <h3>${loan.name}</h3>
          <p class="muted">${loan.id} · ${loan.product}</p>
        </div>
        <span class="pill ${statusClass(loan.status, loan.dpd)}">${loan.status}</span>
      </header>
      <div class="loan-meta">
        <div><span class="muted">Amount</span><strong>${money(loan.amount)}</strong></div>
        <div><span class="muted">Outstanding</span><strong>${money(loan.outstanding)}</strong></div>
        <div><span class="muted">Bureau</span><strong>${loan.bureau}</strong></div>
        <div><span class="muted">DPD</span><strong>${loan.dpd}</strong></div>
      </div>
      <div>
        <div class="split-head"><span class="muted">Lifecycle progress</span><span class="muted">${loan.stage}/${stages.length}</span></div>
        <div class="progress"><span style="width:${Math.round((loan.stage / stages.length) * 100)}%"></span></div>
      </div>
      <div class="row-actions">
        <button class="mini-button" data-action="advance" data-id="${loan.id}">Advance</button>
        <button class="mini-button" data-action="pay" data-id="${loan.id}">Post EMI</button>
        <button class="mini-button" data-action="delinquent" data-id="${loan.id}">Mark DPD</button>
      </div>
    </article>
  `;
}

function renderOrigination() {
  view.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Origination Pipeline</h2>
          <p class="muted">Lead capture, KYC, decisioning, underwriting, offer, agreement, and disbursement.</p>
        </div>
        <button class="primary-button" data-action="open-new">+ New Application</button>
      </div>
      ${loanTable(state.loans)}
    </section>
    <section class="workflow-grid">
      ${workflowCard("Unsecured Loan", ["Capture lead and consent", "Complete KYC and income verification", "Pull bureau and run eligibility rules", "Auto approve, reject, or refer", "Generate offer and e-sign agreement", "Create mandate and disburse"])}
      ${workflowCard("Secured Loan", ["Capture collateral and owner details", "Run legal and technical valuation", "Calculate LTV and deviation", "Issue sanction with conditions", "Complete lien, insurance, and mortgage checks", "Disburse and monitor collateral"])}
    </section>
  `;
}

function loanTable(loans) {
  return `
    <table>
      <thead>
        <tr><th>Application</th><th>Product</th><th>Amount</th><th>Status</th><th>Risk</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${loans.map((loan) => `
          <tr>
            <td><strong>${loan.name}</strong><br><span class="muted">${loan.id} · ${loan.mobile}</span></td>
            <td>${loan.product}<br><span class="muted">${loan.secured ? "Secured" : "Unsecured"}</span></td>
            <td>${money(loan.amount)}<br><span class="muted">${loan.tenure} months</span></td>
            <td><span class="pill ${statusClass(loan.status, loan.dpd)}">${loan.status}</span></td>
            <td>Bureau ${loan.bureau}<br><span class="muted">DPD ${loan.dpd}</span></td>
            <td><div class="row-actions"><button class="mini-button" data-action="advance" data-id="${loan.id}">Advance</button><button class="mini-button" data-action="reject" data-id="${loan.id}">Reject</button></div></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function workflowCard(title, steps) {
  return `
    <article class="workflow-card">
      <h3>${title}</h3>
      <div class="workflow-steps">
        ${steps.map((step, index) => `<div class="workflow-step"><span class="step-index">${index + 1}</span>${step}</div>`).join("")}
      </div>
    </article>
  `;
}

function renderProducts() {
  view.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Product Configuration</h2>
          <p class="muted">Rules, pricing, collateral, fees, tenure, and approval logic stay configurable by product.</p>
        </div>
      </div>
      <div class="card-grid">
        ${products.map((product) => `
          <article class="loan-card">
            <header>
              <div><h3>${product.name}</h3><p class="muted">${product.id} · ${product.type}</p></div>
              <span class="pill ${product.type === "Secured" ? "blue" : "green"}">${product.rate}%</span>
            </header>
            <div class="loan-meta">
              <div><span class="muted">Min</span><strong>${money(product.min)}</strong></div>
              <div><span class="muted">Max</span><strong>${money(product.max)}</strong></div>
              <div><span class="muted">Tenure</span><strong>${product.tenure}</strong></div>
              <div><span class="muted">Security</span><strong>${product.type}</strong></div>
            </div>
            <div class="rule-list">${product.rules.map((rule) => `<div class="rule-row"><span>${rule}</span><span class="pill blue">Rule</span></div>`).join("")}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderServicing() {
  view.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Loan Servicing</h2>
          <p class="muted">Repayment schedules, interest accruals, charges, statements, part-payments, and closure requests.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Account</th><th>Schedule</th><th>Outstanding</th><th>Next Operations</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.loans.map((loan) => `
            <tr>
              <td><strong>${loan.name}</strong><br><span class="muted">${loan.product}</span></td>
              <td>${loan.emiPaid}/${loan.emiTotal} EMIs paid<br><span class="muted">Allocation: charges, interest, principal</span></td>
              <td>${money(loan.outstanding)}<br><span class="muted">${loan.dpd ? `${loan.dpd} DPD` : "Current"}</span></td>
              <td>Statement · Foreclosure quote · Restructure · Waiver</td>
              <td><button class="mini-button" data-action="pay" data-id="${loan.id}">Post EMI</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCollections() {
  const buckets = [
    ["Current", state.loans.filter((loan) => loan.dpd === 0)],
    ["1-30 DPD", state.loans.filter((loan) => loan.dpd > 0 && loan.dpd <= 30)],
    ["31-60 DPD", state.loans.filter((loan) => loan.dpd > 30 && loan.dpd <= 60)],
    ["NPA Watch", state.loans.filter((loan) => loan.dpd > 60)]
  ];
  view.innerHTML = `
    <div class="metric-grid">
      ${buckets.map(([bucket, loans]) => `<article class="metric"><span>${bucket}</span><strong>${loans.length}</strong><span>${money(loans.reduce((sum, loan) => sum + loan.outstanding, 0))}</span></article>`).join("")}
    </div>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Collection Queue</h2>
          <p class="muted">DPD assignment, reminders, bounce handling, field visits, promise-to-pay, settlements, and legal escalation.</p>
        </div>
      </div>
      ${loanTable(state.loans.filter((loan) => loan.dpd > 0 || loan.status === "Collections"))}
    </section>
  `;
}

function renderCollateral() {
  const secured = state.loans.filter((loan) => loan.secured);
  view.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Collateral Management</h2>
          <p class="muted">Valuation, legal checks, LTV monitoring, insurance, lien, repossession, auction, and release.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Borrower</th><th>Collateral</th><th>Value</th><th>LTV</th><th>Controls</th></tr></thead>
        <tbody>
          ${secured.map((loan) => `
            <tr>
              <td><strong>${loan.name}</strong><br><span class="muted">${loan.id}</span></td>
              <td>${loan.collateral.type}<br><span class="muted">${loan.product}</span></td>
              <td>${money(loan.collateral.value)}<br><span class="muted">Outstanding ${money(loan.outstanding)}</span></td>
              <td><span class="pill ${loan.collateral.ltv > 80 ? "red" : "green"}">${loan.collateral.ltv}%</span></td>
              <td>Legal: ${loan.collateral.legal}<br>Valuation: ${loan.collateral.valuation}<br>Insurance: ${loan.collateral.insurance}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderReports() {
  view.innerHTML = `
    <section class="workflow-grid">
      ${workflowCard("Operations Reports", ["Application status", "Approval and rejection", "Disbursement register", "SLA ageing", "Agent productivity"])}
      ${workflowCard("Risk Reports", ["Portfolio at risk", "DPD movement", "Vintage analysis", "NPA classification", "Collateral coverage"])}
      ${workflowCard("Finance Reports", ["Interest accrual", "Fee income", "GL postings", "Payment reconciliation", "Trial balance export"])}
      ${workflowCard("Compliance Reports", ["KYC status", "Consent audit", "Document exceptions", "Regulatory classification", "Provisioning report"])}
    </section>
  `;
}

function render() {
  const renderers = {
    dashboard: renderDashboard,
    origination: renderOrigination,
    products: renderProducts,
    servicing: renderServicing,
    collections: renderCollections,
    collateral: renderCollateral,
    reports: renderReports
  };
  renderers[state.view]();
}

function openApplicationDialog() {
  form.reset();
  form.product.innerHTML = products.map((product) => `<option value="${product.name}">${product.name}</option>`).join("");
  dialog.showModal();
}

async function createApplication(data) {
  await api("/api/loans", {
    method: "POST",
    body: JSON.stringify({
      name: data.get("name"),
      mobile: data.get("mobile"),
      product: data.get("product"),
      amount: Number(data.get("amount")),
      tenure: Number(data.get("tenure")),
      income: Number(data.get("income")),
      purpose: data.get("purpose")
    })
  });
  await loadLiveData();
  setView("origination");
}

async function updateLoan(id, action) {
  await api(`/api/loans/${id}/action`, {
    method: "PATCH",
    body: JSON.stringify({ action })
  });
  await loadLiveData();
  render();
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (button) setView(button.dataset.view);
});

document.body.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "open-new") openApplicationDialog();
  if (action === "advance") {
    await updateLoan(id, "advance");
  }
  if (action === "pay") {
    await updateLoan(id, "pay");
  }
  if (action === "delinquent") {
    await updateLoan(id, "delinquent");
  }
  if (action === "reject") {
    await updateLoan(id, "reject");
  }
});

document.querySelector("#newApplicationBtn").addEventListener("click", openApplicationDialog);
document.querySelector("#seedBtn").addEventListener("click", async () => {
  await api("/api/reset", { method: "POST" });
  await loadLiveData();
  render();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createApplication(new FormData(form));
  dialog.close();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  const data = new FormData(loginForm);
  try {
    const payload = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password")
      })
    });
    state.user = payload.user;
    loginDialog.close();
    await loadLiveData();
    renderSession();
    render();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.querySelector("#logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  state.user = null;
  state.loans = [];
  renderSession();
  loginDialog.showModal();
});

async function init() {
  renderNav();
  renderSession();
  view.innerHTML = `<section class="panel"><h2>Connecting to lending backend</h2><p class="muted">Checking your session and loading live portfolio data.</p></section>`;
  try {
    const authenticated = await checkSession();
    if (!authenticated) {
      renderSession();
      loginDialog.showModal();
      view.innerHTML = `<section class="panel"><h2>Login Required</h2><p class="muted">Sign in to access loan origination, servicing, collections, collateral, and reports.</p></section>`;
      return;
    }
    await loadLiveData();
    renderSession();
  } catch (error) {
    state.error = error.message;
    state.online = false;
    state.loans = structuredClone(defaultLoans);
    view.innerHTML = `<section class="panel"><h2>Backend unavailable</h2><p class="muted">Start the live server with <code>node outputs/server.mjs</code>. Showing built-in demo data for now.</p></section>`;
  }
  render();
}

init();
