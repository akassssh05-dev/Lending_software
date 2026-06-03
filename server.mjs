import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
const dbPath = join(dataDir, "lendos-db.json");
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";
const adminEmail = process.env.ADMIN_EMAIL || "admin@lendos.local";
const adminPassword = process.env.ADMIN_PASSWORD || "lendos-admin";
const secureCookies = process.env.NODE_ENV === "production";
const sessions = new Map();

const products = [
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

const seedLoans = [
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
    collateral: null,
    createdAt: "2026-06-03T05:10:00.000Z"
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
    collateral: null,
    createdAt: "2026-06-03T05:12:00.000Z"
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
    },
    createdAt: "2026-06-03T05:14:00.000Z"
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
    },
    createdAt: "2026-06-03T05:16:00.000Z"
  }
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

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeDb({ loans: seedLoans, nextId: 1005, audit: [] });
  }
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...value] = item.split("=");
        return [decodeURIComponent(key), decodeURIComponent(value.join("="))];
      })
  );
}

function currentUser(req) {
  const token = parseCookies(req).lendos_session;
  return token ? sessions.get(token) : null;
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentication required" });
    return null;
  }
  return user;
}

function sessionCookie(token) {
  const secure = secureCookies ? "; Secure" : "";
  return `lendos_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function createLoan(input, db) {
  const product = products.find((item) => item.name === input.product || item.id === input.product);
  if (!product) throw new Error("Unknown loan product");

  const amount = Number(input.amount);
  const income = Number(input.income);
  const tenure = Number(input.tenure);
  if (!input.name || !input.mobile || !amount || !income || !tenure) {
    throw new Error("Name, mobile, amount, income, and tenure are required");
  }

  const secured = product.type === "Secured";
  const bureau = Math.max(590, Math.min(790, 620 + Math.round(income / 4500) + Math.round(Math.random() * 55)));

  const loan = {
    id: `APP-${db.nextId++}`,
    name: input.name,
    mobile: input.mobile,
    product: product.name,
    secured,
    amount,
    tenure,
    income,
    purpose: input.purpose || "General purpose",
    status: secured ? "Collateral Review" : "Credit Decision",
    stage: secured ? 3 : 4,
    bureau,
    dpd: 0,
    emiPaid: 0,
    emiTotal: tenure,
    outstanding: amount,
    collateral: secured
      ? {
          type: product.id === "VL" ? "Vehicle" : "Property",
          value: Math.round(amount / 0.72),
          ltv: 72,
          legal: "Pending",
          valuation: "Pending",
          insurance: "Pending"
        }
      : null,
    createdAt: new Date().toISOString()
  };

  db.loans.push(loan);
  db.audit.push({ at: new Date().toISOString(), type: "LoanCreated", loanId: loan.id });
  return loan;
}

function applyAction(loan, action) {
  if (action === "advance") {
    loan.stage = Math.min(stages.length, loan.stage + 1);
    loan.status = stages[Math.min(stages.length - 1, loan.stage - 1)];
    if (loan.status === "Disbursement") loan.status = "Disbursed";
    return;
  }

  if (action === "pay") {
    const emi = Math.max(1, Math.round(loan.amount / loan.emiTotal));
    loan.emiPaid = Math.min(loan.emiTotal, loan.emiPaid + 1);
    loan.outstanding = Math.max(0, loan.outstanding - emi);
    loan.dpd = 0;
    loan.status = loan.outstanding === 0 ? "Closed" : "Active";
    loan.stage = loan.outstanding === 0 ? 11 : Math.max(loan.stage, 9);
    return;
  }

  if (action === "delinquent") {
    loan.dpd = loan.dpd ? loan.dpd + 15 : 7;
    loan.status = "Collections";
    loan.stage = 10;
    return;
  }

  if (action === "reject") {
    loan.status = "Rejected";
    return;
  }

  throw new Error("Unknown action");
}

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "lendos-core", mode: "live-mvp" });
    }

    if (req.method === "GET" && url.pathname === "/api/session") {
      const user = currentUser(req);
      return sendJson(res, 200, { authenticated: Boolean(user), user: user ? { email: user.email, role: user.role } : null });
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(req);
      if (body.email !== adminEmail || body.password !== adminPassword) {
        return sendJson(res, 401, { error: "Invalid email or password" });
      }
      const token = randomUUID();
      sessions.set(token, { email: adminEmail, role: "Admin", createdAt: new Date().toISOString() });
      res.setHeader("Set-Cookie", sessionCookie(token));
      return sendJson(res, 200, { user: { email: adminEmail, role: "Admin" } });
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = parseCookies(req).lendos_session;
      if (token) sessions.delete(token);
      res.setHeader("Set-Cookie", `lendos_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookies ? "; Secure" : ""}`);
      return sendJson(res, 200, { ok: true });
    }

    const user = requireUser(req, res);
    if (!user) return;

    if (req.method === "GET" && url.pathname === "/api/products") {
      return sendJson(res, 200, { products });
    }

    if (req.method === "GET" && url.pathname === "/api/loans") {
      const db = await readDb();
      return sendJson(res, 200, { loans: db.loans, audit: db.audit.slice(-20).reverse() });
    }

    if (req.method === "POST" && url.pathname === "/api/loans") {
      const db = await readDb();
      const loan = createLoan(await readBody(req), db);
      await writeDb(db);
      return sendJson(res, 201, { loan });
    }

    const actionMatch = url.pathname.match(/^\/api\/loans\/([^/]+)\/action$/);
    if (req.method === "PATCH" && actionMatch) {
      const db = await readDb();
      const loan = db.loans.find((item) => item.id === actionMatch[1]);
      if (!loan) return sendJson(res, 404, { error: "Loan not found" });
      const body = await readBody(req);
      applyAction(loan, body.action);
      db.audit.push({ at: new Date().toISOString(), type: "LoanAction", loanId: loan.id, action: body.action });
      await writeDb(db);
      return sendJson(res, 200, { loan });
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const db = { loans: structuredClone(seedLoans), nextId: 1005, audit: [{ at: new Date().toISOString(), type: "DemoReset" }] };
      await writeDb(db);
      return sendJson(res, 200, { loans: db.loans });
    }

    return sendJson(res, 404, { error: "API route not found" });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  await serveStatic(req, res, url);
});

await ensureDb();
server.listen(port, host, () => {
  console.log(`LendOS live MVP running at http://${host}:${port}`);
  console.log(`Admin login: ${adminEmail}`);
});
