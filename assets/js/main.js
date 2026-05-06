const AppState = {
  wallet: null,
  address: null,
  family: null,
  chain: null,
  connected: false,
  mode: "demo",
  loading: false,
  lastUpdated: null,
  portfolio: null,
  balances: [],
  transactions: [],
  nfts: [],
  analytics: null,
  prices: {},
  health: {
    pricing: "unknown",
    portfolio: "unknown"
  }
};

const UI = {
  qs(selector, root = document) {
    return root.querySelector(selector);
  },

  qsa(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  },

  byId(id) {
    return document.getElementById(id);
  }
};

const Toast = {
  root() {
    return UI.byId("toastContainer");
  },

  show(message, type = "info", duration = 2800) {
    const root = this.root();
    if (!root) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-dot"></div>
      <div class="toast-text">${message}</div>
    `;

    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 280);
    }, duration);
  },

  success(msg) { this.show(msg, "success"); },
  error(msg) { this.show(msg, "error"); },
  info(msg) { this.show(msg, "info"); },
  warn(msg) { this.show(msg, "warn"); }
};

const Utils = {
  shortAddress(addr = "") {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },

  formatMoney(value, currency = "USD", digits = 2) {
    const num = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: digits
    }).format(num);
  },

  formatCompactMoney(value, currency = "USD") {
    const num = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2
    }).format(num);
  },

  formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits
    }).format(Number(value || 0));
  },

  formatPercent(value) {
    const num = Number(value || 0);
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
  },

  timeAgoLabel(date) {
    if (!date) return "Just now";
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  },

  setText(id, value) {
    const el = UI.byId(id);
    if (el) el.textContent = value;
  },

  setHTML(id, value) {
    const el = UI.byId(id);
    if (el) el.innerHTML = value;
  },

  copy(text, label = "Copied") {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => Toast.success(label))
      .catch(() => Toast.error("Copy failed"));
  }
};

function openModal(id) {
  const modal = UI.byId(id);
  if (!modal) return;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const modal = UI.byId(id);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function toggleSidebar() {
  const sidebar = UI.byId("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function initReveal() {
  const nodes = UI.qsa(".reveal");
  if (!nodes.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  nodes.forEach((node, i) => {
    node.style.transitionDelay = `${i * 45}ms`;
    io.observe(node);
  });
}

function initTilt() {
  UI.qsa(".tilt-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * 8;
      const ry = (px - 0.5) * 10;
      card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function initParticles(canvasId = "particleCanvas") {
  const canvas = UI.byId(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2 + 0.6,
    dx: (Math.random() - 0.5) * 0.18,
    dy: (Math.random() - 0.5) * 0.18
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);

    particles.forEach((p) => {
      p.x += p.dx;
      p.y += p.dy;

      if (p.x < 0 || p.x > w) p.dx *= -1;
      if (p.y < 0 || p.y > h) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 212, 170, 0.18)";
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  draw();
}

function countUp(el, target, prefix = "", suffix = "", duration = 1200) {
  if (!el) return;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = target * eased;
    el.textContent = `${prefix}${Math.round(value).toLocaleString()}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function initCounters() {
  UI.qsa("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count || 0);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    countUp(el, target, prefix, suffix);
  });
}

function setLoadingState(active) {
  AppState.loading = active;
  document.body.classList.toggle("app-loading", active);
}

function renderTrustIndicators() {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg?.trust) return;

  const trustBar = UI.byId("trustBar");
  if (!trustBar) return;

  trustBar.innerHTML = `
    <div class="trust-pill-group">
      ${(cfg.trust.badges || []).map((badge) => `<span class="trust-pill">${badge}</span>`).join("")}
    </div>
    <p class="trust-copy">${cfg.trust.readOnlyCopy}</p>
  `;
}

function renderLastUpdated() {
  const el = UI.byId("lastUpdated");
  if (!el) return;

  if (!AppState.lastUpdated) {
    el.textContent = "Updated just now";
    return;
  }

  el.textContent = `Updated ${Utils.timeAgoLabel(AppState.lastUpdated)}`;
}

function updateWalletUI() {
  const walletIndicator = UI.byId("walletIndicator");
  const topbarWallet = UI.byId("topbarWallet");
  const walletAddress = UI.byId("walletAddressLabel");
  const walletFamily = UI.byId("walletFamilyLabel");
  const triggers = UI.qsa("[data-wallet-trigger]");

  if (AppState.connected && AppState.address) {
    const short = Utils.shortAddress(AppState.address);

    if (walletIndicator) {
      walletIndicator.textContent = `${AppState.wallet} • ${short}`;
      walletIndicator.classList.add("connected");
    }

    if (topbarWallet) {
      topbarWallet.innerHTML = `
        <span class="wallet-pill-dot"></span>
        <span>${short}</span>
      `;
      topbarWallet.classList.add("connected");
    }

    if (walletAddress) walletAddress.textContent = AppState.address;
    if (walletFamily) walletFamily.textContent = AppState.family || "Universal";

    triggers.forEach((btn) => {
      btn.textContent = short;
    });
  } else {
    if (walletIndicator) {
      walletIndicator.textContent = "No Wallet";
      walletIndicator.classList.remove("connected");
    }

    if (topbarWallet) {
      topbarWallet.innerHTML = `<span>Connect Wallet</span>`;
      topbarWallet.classList.remove("connected");
    }

    if (walletAddress) walletAddress.textContent = "Not connected";
    if (walletFamily) walletFamily.textContent = "Select wallet family";

    triggers.forEach((btn) => {
      btn.textContent = "Connect Wallet";
    });
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function fetchHealth() {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg?.providers?.data?.endpoints?.health) return null;

  try {
    const data = await fetchJSON(cfg.providers.data.endpoints.health);
    AppState.health.portfolio = data?.status || "online";
    return data;
  } catch (err) {
    AppState.health.portfolio = "degraded";
    return null;
  }
}

async function fetchPublicPrices(ids = []) {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg?.providers?.pricing?.publicBase || !ids.length) return {};

  const url = new URL(`${cfg.providers.pricing.publicBase}${cfg.providers.pricing.endpoints.simplePrice}`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", cfg.app.defaultCurrency);
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_last_updated_at", "true");

  try {
    const data = await fetchJSON(url.toString());
    AppState.health.pricing = "online";
    AppState.prices = data || {};
    return data || {};
  } catch (err) {
    AppState.health.pricing = "degraded";
    return {};
  }
}

async function fetchPortfolioFromBackend(address, family) {
  const cfg = window.NEXVAULT_CONFIG;
  const endpoint = cfg?.providers?.data?.endpoints?.portfolio;
  if (!endpoint || !address) return null;

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("address", address);
  if (family) url.searchParams.set("family", family);

  try {
    return await fetchJSON(url.toString());
  } catch (err) {
    return null;
  }
}

async function fetchBalancesFromBackend(address, family) {
  const cfg = window.NEXVAULT_CONFIG;
  const endpoint = cfg?.providers?.data?.endpoints?.balances;
  if (!endpoint || !address) return [];

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("address", address);
  if (family) url.searchParams.set("family", family);

  try {
    return await fetchJSON(url.toString());
  } catch (err) {
    return [];
  }
}

async function fetchTransactionsFromBackend(address, family) {
  const cfg = window.NEXVAULT_CONFIG;
  const endpoint = cfg?.providers?.data?.endpoints?.transactions;
  if (!endpoint || !address) return [];

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("address", address);
  if (family) url.searchParams.set("family", family);

  try {
    return await fetchJSON(url.toString());
  } catch (err) {
    return [];
  }
}

async function fetchNFTsFromBackend(address, family) {
  const cfg = window.NEXVAULT_CONFIG;
  const endpoint = cfg?.providers?.data?.endpoints?.nfts;
  if (!endpoint || !address) return [];

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("address", address);
  if (family) url.searchParams.set("family", family);

  try {
    return await fetchJSON(url.toString());
  } catch (err) {
    return [];
  }
}

function renderSourceStatus() {
  const el = UI.byId("sourceStatus");
  if (!el) return;

  const pricing = AppState.health.pricing === "online" ? "Live pricing" : "Price fallback";
  const portfolio = AppState.health.portfolio === "online" ? "Indexed wallet data" : "Demo-safe mode";

  el.innerHTML = `
    <span class="status-dot ${AppState.health.pricing === "online" ? "is-online" : "is-warn"}"></span>
    <span>${pricing}</span>
    <span class="status-sep">•</span>
    <span>${portfolio}</span>
  `;
}

function applyPortfolioToKpis(portfolio) {
  if (!portfolio) return;

  if (portfolio.totalValue != null) {
    ["kpiPortfolio", "kpiTotalValue", "portfolioValuePrimary"].forEach((id) => {
      const el = UI.byId(id);
      if (el) el.textContent = Utils.formatMoney(portfolio.totalValue);
    });
  }

  if (portfolio.pnl24h != null) {
    ["kpiPnl24h", "portfolioChange24h"].forEach((id) => {
      const el = UI.byId(id);
      if (el) {
        el.textContent = Utils.formatPercent(portfolio.pnl24h);
        el.classList.toggle("positive", Number(portfolio.pnl24h) >= 0);
        el.classList.toggle("negative", Number(portfolio.pnl24h) < 0);
      }
    });
  }

  if (portfolio.totalPnl != null) {
    const el = UI.byId("kpiPnl");
    if (el) el.textContent = Utils.formatMoney(portfolio.totalPnl);
  }

  if (portfolio.walletCount != null) {
    Utils.setText("kpiWallets", String(portfolio.walletCount));
  }

  if (portfolio.tokenCount != null) {
    Utils.setText("kpiTokens", String(portfolio.tokenCount));
  }

  if (portfolio.nftCount != null) {
    Utils.setText("kpiNfts", String(portfolio.nftCount));
  }
}

function buildDemoPortfolio() {
  const cfg = window.NEXVAULT_CONFIG;
  const p = cfg?.demo ? {
    totalValue: 284719.4,
    pnl24h: 4.82,
    totalPnl: 94220.18,
    walletCount: 3,
    tokenCount: 12,
    nftCount: 9
  } : null;

  return p;
}

async function hydratePortfolio() {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg) return;

  setLoadingState(true);

  try {
    await fetchHealth();

    const trackedIds = Object.values(cfg.supportedAssets?.coingeckoIds || {});
    await fetchPublicPrices(trackedIds);

    if (AppState.connected && AppState.address && cfg.features.realPortfolio) {
      const portfolio = await fetchPortfolioFromBackend(AppState.address, AppState.family);
      const balances = await fetchBalancesFromBackend(AppState.address, AppState.family);
      const transactions = await fetchTransactionsFromBackend(AppState.address, AppState.family);
      const nfts = await fetchNFTsFromBackend(AppState.address, AppState.family);

      AppState.portfolio = portfolio || buildDemoPortfolio();
      AppState.balances = Array.isArray(balances) ? balances : [];
      AppState.transactions = Array.isArray(transactions) ? transactions : [];
      AppState.nfts = Array.isArray(nfts) ? nfts : [];
      AppState.mode = portfolio ? "live" : "demo";
    } else {
      AppState.portfolio = buildDemoPortfolio();
      AppState.mode = "demo";
    }

    applyPortfolioToKpis(AppState.portfolio);
    AppState.lastUpdated = new Date().toISOString();
    renderLastUpdated();
    renderSourceStatus();
  } catch (err) {
    AppState.portfolio = buildDemoPortfolio();
    AppState.mode = "demo";
    applyPortfolioToKpis(AppState.portfolio);
    AppState.lastUpdated = new Date().toISOString();
    renderLastUpdated();
    renderSourceStatus();
  } finally {
    setLoadingState(false);
  }
}

function startRefreshLoop() {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg?.app?.refreshMs) return;
  setInterval(() => {
    hydratePortfolio();
  }, cfg.app.refreshMs);
}

function initAppShell() {
  renderTrustIndicators();
  renderLastUpdated();
  renderSourceStatus();
  updateWalletUI();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    UI.qsa(".modal-overlay.open").forEach((modal) => modal.classList.remove("open"));
    document.body.classList.remove("modal-open");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initReveal();
  initTilt();
  initCounters();
  initAppShell();
  await hydratePortfolio();
  startRefreshLoop();
});
