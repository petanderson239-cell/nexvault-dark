const AppState = {
  wallet: null,
  address: null,
  family: null,
  chain: null,
  connected: false,
  mode: 'disconnected',
  loading: false,
  lastUpdated: null,
  portfolio: null,
  balances: [],
  transactions: [],
  nfts: [],
  prices: {},
  health: { pricing: 'unknown', portfolio: 'unknown' }
};

const UI = {
  qs:   (sel, root = document) => root.querySelector(sel),
  qsa:  (sel, root = document) => [...root.querySelectorAll(sel)],
  byId: (id) => document.getElementById(id)
};

const Toast = {
  root() { return UI.byId('toastContainer'); },
  show(message, type = 'info', duration = 2800) {
    const root = this.root();
    if (!root) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<div class="toast-dot"></div><div class="toast-text">${message}</div>`;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 280); }, duration);
  },
  success(m) { this.show(m, 'success'); },
  error(m)   { this.show(m, 'error'); },
  info(m)    { this.show(m, 'info'); },
  warn(m)    { this.show(m, 'warn'); }
};

const Utils = {
  shortAddress(addr = '') {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
  },
  formatMoney(value, currency = 'USD', digits = 2) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: digits }).format(Number(value || 0));
  },
  formatPercent(value) {
    const n = Number(value || 0);
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  },
  timeAgoLabel(date) {
    if (!date) return 'Just now';
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  },
  setText(id, value) { const el = UI.byId(id); if (el) el.textContent = value; },
  copy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => Toast.success('Copied')).catch(() => Toast.error('Copy failed'));
  }
};

function openModal(id) {
  const m = UI.byId(id);
  if (!m) return;
  m.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  const m = UI.byId(id);
  if (!m) return;
  m.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function toggleSidebar() {
  const s = UI.byId('sidebar');
  if (s) s.classList.toggle('open');
}

function initReveal() {
  const nodes = UI.qsa('.reveal');
  if (!nodes.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  nodes.forEach((n, i) => { n.style.transitionDelay = `${i * 40}ms`; io.observe(n); });
}

function initTilt() {
  UI.qsa('.tilt-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const rx = (0.5 - (e.clientY - r.top) / r.height) * 8;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
      card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

function initParticles(canvasId = 'particleCanvas') {
  const canvas = UI.byId(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const pts = Array.from({ length: 38 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 1.6 + 0.5,
    dx: (Math.random() - 0.5) * 0.15,
    dy: (Math.random() - 0.5) * 0.15
  }));
  function draw() {
    ctx.clearRect(0, 0, w, h);
    pts.forEach((p) => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > w) p.dx *= -1;
      if (p.y < 0 || p.y > h) p.dy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,170,0.15)';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
  draw();
}

/* ─── KPI SKELETON — shown when no wallet connected ─────────────── */
function renderKpiSkeleton() {
  ['kpiPortfolio', 'kpiPnl', 'kpiPnl24h', 'kpiTokens'].forEach((id) => {
    const el = UI.byId(id);
    if (el) {
      el.textContent = '—';
      el.classList.add('kpi-empty');
    }
  });
  ['portfolioChange24h', 'kpiWallets', 'kpiNfts', 'chartPerformanceValue', 'chartPerformanceChange'].forEach((id) => {
    const el = UI.byId(id);
    if (el) el.textContent = '—';
  });
  const perf = UI.byId('chartPerformanceValue');
  if (perf) perf.textContent = 'Connect wallet to view';
}

/* ─── WALLET-GATE EMPTY STATE ───────────────────────────────────── */
function renderDisconnectedState() {
  renderKpiSkeleton();

  // Holdings table empty state
  const tbody = UI.byId('holdingsTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <polygon points="20,4 36,13 36,27 20,36 4,27 4,13" stroke="rgba(0,212,170,0.4)" stroke-width="1.5" fill="none"/>
              <circle cx="20" cy="20" r="5" stroke="rgba(0,212,170,0.6)" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <p class="empty-state-title">No wallet connected</p>
          <p class="empty-state-sub">Connect your wallet to view live token balances across all chains.</p>
          <button type="button" class="btn btn-primary" style="margin-top:8px;height:40px;padding:0 24px;border-radius:14px;font-size:14px;" data-wallet-trigger>Connect Wallet</button>
        </div>
      </td></tr>`;
  }

  // Market snapshot grid — still loads live prices (no wallet needed)
  const el = UI.byId('sourceStatus');
  if (el) {
    el.innerHTML = `
      <span class="status-dot is-offline" style="width:7px;height:7px;"></span>
      <span>No wallet connected</span>`;
  }
}

/* ─── APPLY REAL PORTFOLIO DATA ─────────────────────────────────── */
function applyPortfolioToKpis(portfolio) {
  if (!portfolio) return;
  ['kpiPortfolio', 'kpiTotalValue', 'portfolioValuePrimary'].forEach((id) => {
    const el = UI.byId(id);
    if (el) { el.textContent = Utils.formatMoney(portfolio.totalValue); el.classList.remove('kpi-empty'); }
  });
  ['kpiPnl24h', 'portfolioChange24h'].forEach((id) => {
    const el = UI.byId(id);
    if (el) {
      el.textContent = Utils.formatPercent(portfolio.pnl24h);
      el.classList.remove('kpi-empty');
      el.classList.toggle('positive', Number(portfolio.pnl24h) >= 0);
      el.classList.toggle('negative', Number(portfolio.pnl24h) < 0);
    }
  });
  if (portfolio.totalPnl != null) {
    const el = UI.byId('kpiPnl');
    if (el) { el.textContent = Utils.formatMoney(portfolio.totalPnl); el.classList.remove('kpi-empty'); }
  }
  if (portfolio.walletCount != null) Utils.setText('kpiWallets', String(portfolio.walletCount));
  if (portfolio.tokenCount  != null) { const el = UI.byId('kpiTokens'); if (el) { el.textContent = String(portfolio.tokenCount); el.classList.remove('kpi-empty'); } }
  if (portfolio.nftCount    != null) Utils.setText('kpiNfts', String(portfolio.nftCount));
}

/* ─── DATA FETCHERS ─────────────────────────────────────────────── */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPublicPrices(ids = []) {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg?.providers?.pricing?.publicBase || !ids.length) return {};
  const url = new URL(`${cfg.providers.pricing.publicBase}${cfg.providers.pricing.endpoints.simplePrice}`);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', 'usd');
  url.searchParams.set('include_24hr_change', 'true');
  try {
    const data = await fetchJSON(url.toString());
    AppState.health.pricing = 'online';
    AppState.prices = data || {};
    return data || {};
  } catch {
    AppState.health.pricing = 'degraded';
    return {};
  }
}

async function fetchPortfolio(address, family) {
  const ep = window.NEXVAULT_CONFIG?.providers?.data?.endpoints?.portfolio;
  if (!ep || !address) return null;
  const url = new URL(ep, window.location.origin);
  url.searchParams.set('address', address);
  if (family) url.searchParams.set('family', family);
  try { return await fetchJSON(url.toString()); } catch { return null; }
}

async function fetchBalances(address, family) {
  const ep = window.NEXVAULT_CONFIG?.providers?.data?.endpoints?.balances;
  if (!ep || !address) return [];
  const url = new URL(ep, window.location.origin);
  url.searchParams.set('address', address);
  if (family) url.searchParams.set('family', family);
  try { return await fetchJSON(url.toString()); } catch { return []; }
}

async function fetchTransactions(address, family) {
  const ep = window.NEXVAULT_CONFIG?.providers?.data?.endpoints?.transactions;
  if (!ep || !address) return [];
  const url = new URL(ep, window.location.origin);
  url.searchParams.set('address', address);
  if (family) url.searchParams.set('family', family);
  try { return await fetchJSON(url.toString()); } catch { return []; }
}

async function fetchNFTs(address, family) {
  const ep = window.NEXVAULT_CONFIG?.providers?.data?.endpoints?.nfts;
  if (!ep || !address) return [];
  const url = new URL(ep, window.location.origin);
  url.searchParams.set('address', address);
  if (family) url.searchParams.set('family', family);
  try { return await fetchJSON(url.toString()); } catch { return []; }
}

/* ─── SOURCE STATUS ─────────────────────────────────────────────── */
function renderSourceStatus() {
  const el = UI.byId('sourceStatus');
  if (!el) return;
  if (!AppState.connected) {
    el.innerHTML = `<span class="status-dot is-offline" style="width:7px;height:7px;"></span><span>No wallet connected</span>`;
    return;
  }
  const pricingOnline = AppState.health.pricing === 'online';
  el.innerHTML = `
    <span class="status-dot ${pricingOnline ? 'is-online' : 'is-warn'}" style="width:7px;height:7px;"></span>
    <span>${pricingOnline ? 'Live pricing' : 'Price data unavailable'}</span>
    <span class="status-sep" style="margin:0 6px;opacity:0.3;">·</span>
    <span>${AppState.health.portfolio === 'online' ? 'Indexed' : 'Backend unavailable'}</span>`;
}

function renderLastUpdated() {
  const el = UI.byId('lastUpdated');
  if (!el) return;
  el.textContent = AppState.lastUpdated ? `Updated ${Utils.timeAgoLabel(AppState.lastUpdated)}` : '';
}

function renderTrustIndicators() {
  const cfg = window.NEXVAULT_CONFIG;
  const el  = UI.byId('trustBar');
  if (!el || !cfg?.trust) return;
  el.innerHTML = `
    <div class="trust-pill-group">${(cfg.trust.badges || []).map(b => `<span class="trust-pill">${b}</span>`).join('')}</div>
    <p class="trust-copy">${cfg.trust.readOnlyCopy}</p>`;
}

/* ─── UPDATE WALLET UI ──────────────────────────────────────────── */
function updateWalletUI() {
  const indicator = UI.byId('walletIndicator');
  const topbar    = UI.byId('topbarWallet');
  const addrEl    = UI.byId('walletAddressLabel');
  const familyEl  = UI.byId('walletFamilyLabel');

  if (AppState.connected && AppState.address) {
    const short = Utils.shortAddress(AppState.address);
    if (indicator) { indicator.textContent = `${AppState.wallet} · ${short}`; indicator.classList.add('connected'); }
    if (topbar)    { topbar.innerHTML = `<span class="wallet-pill-dot"></span><span>${short}</span>`; topbar.classList.add('connected'); }
    if (addrEl)    addrEl.textContent = AppState.address;
    if (familyEl)  familyEl.textContent = AppState.wallet || 'Connected';
    UI.qsa('[data-wallet-trigger]').forEach(b => { b.textContent = short; });
  } else {
    if (indicator) { indicator.textContent = 'Not connected'; indicator.classList.remove('connected'); }
    if (topbar)    { topbar.innerHTML = `<span>Connect Wallet</span>`; topbar.classList.remove('connected'); }
    if (addrEl)    addrEl.textContent = 'Not connected';
    if (familyEl)  familyEl.textContent = 'Connect Wallet';
    UI.qsa('[data-wallet-trigger]').forEach(b => { b.innerHTML = '<span aria-hidden="true">&#x2B21;</span> Connect Wallet'; });
  }
}

/* ─── MAIN HYDRATION ────────────────────────────────────────────── */
async function hydratePortfolio() {
  const cfg = window.NEXVAULT_CONFIG;
  if (!cfg) return;

  document.body.classList.add('app-loading');
  AppState.loading = true;

  try {
    // Always fetch live market prices — no wallet needed
    const ids = Object.values(cfg.supportedAssets?.coingeckoIds || {});
    await fetchPublicPrices(ids);

    // Portfolio data ONLY when wallet is connected
    if (AppState.connected && AppState.address) {
      const [portfolio, balances, transactions, nfts] = await Promise.all([
        fetchPortfolio(AppState.address, AppState.family),
        fetchBalances(AppState.address, AppState.family),
        fetchTransactions(AppState.address, AppState.family),
        fetchNFTs(AppState.address, AppState.family)
      ]);

      AppState.portfolio     = portfolio;
      AppState.balances      = Array.isArray(balances)      ? balances      : [];
      AppState.transactions  = Array.isArray(transactions)  ? transactions  : [];
      AppState.nfts          = Array.isArray(nfts)          ? nfts          : [];
      AppState.mode          = portfolio ? 'live' : 'read-only';
      AppState.health.portfolio = portfolio ? 'online' : 'unavailable';

      applyPortfolioToKpis(AppState.portfolio);
      document.dispatchEvent(new CustomEvent('nexvault:portfolio-updated', { detail: AppState }));
    } else {
      // No wallet — clear all portfolio state, show empty UI
      AppState.portfolio    = null;
      AppState.balances     = [];
      AppState.transactions = [];
      AppState.nfts         = [];
      AppState.mode         = 'disconnected';
      renderDisconnectedState();
    }

    AppState.lastUpdated = new Date().toISOString();
    renderLastUpdated();
    renderSourceStatus();
    document.dispatchEvent(new CustomEvent('nexvault:prices-updated', { detail: AppState.prices }));
  } catch (err) {
    console.error('[NexVault] hydratePortfolio error:', err);
  } finally {
    AppState.loading = false;
    document.body.classList.remove('app-loading');
  }
}

function startRefreshLoop() {
  const ms = window.NEXVAULT_CONFIG?.app?.refreshMs;
  if (ms) setInterval(hydratePortfolio, ms);
}

function initAppShell() {
  renderTrustIndicators();
  renderLastUpdated();
  renderSourceStatus();
  updateWalletUI();
  renderDisconnectedState(); // default state before hydration
}

// Expose globals for wallet.js and inline scripts
window.AppState    = AppState;
window.Utils       = Utils;
window.Toast       = Toast;
window.UI          = UI;
window.openModal   = openModal;
window.closeModal  = closeModal;
window.updateWalletUI  = updateWalletUI;
window.hydratePortfolio = hydratePortfolio;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    UI.qsa('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.classList.remove('modal-open');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  initReveal();
  initTilt();
  initAppShell();
  await hydratePortfolio();
  startRefreshLoop();
});
