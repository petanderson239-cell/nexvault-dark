(function () {
  const chartRegistry = {};
  const DEFAULT_COLORS = [
    "#00D4AA",
    "#4F7CFF",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#22C55E",
    "#06B6D4",
    "#F97316",
    "#E879F9",
    "#94A3B8"
  ];

  function getCtx(id) {
    const el = document.getElementById(id);
    return el ? el.getContext("2d") : null;
  }

  function destroyChart(id) {
    if (chartRegistry[id]) {
      chartRegistry[id].destroy();
      delete chartRegistry[id];
    }
  }

  function createGradient(ctx, colorA = "rgba(0,212,170,0.9)", colorB = "rgba(79,124,255,0.15)") {
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(1, colorB);
    return gradient;
  }

  function pickColors(count) {
    return Array.from({ length: count }, (_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
  }

  function money(value) {
    if (window.Utils?.formatCompactMoney) return window.Utils.formatCompactMoney(value);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function buildDemoAllocation() {
    return [
      { label: "Bitcoin", value: 112400, change: 3.4 },
      { label: "Ethereum", value: 86420, change: 5.8 },
      { label: "Solana", value: 33810, change: 7.1 },
      { label: "USDC", value: 21450, change: 0.0 },
      { label: "Chainlink", value: 12560, change: 2.3 },
      { label: "TON", value: 8079, change: -1.4 }
    ];
  }

  function buildDemoHistory(days = 14) {
    const now = Date.now();
    const points = [];
    let base = 224000;

    for (let i = days - 1; i >= 0; i--) {
      const t = now - i * 86400000;
      const drift = (Math.sin(i / 2.8) * 8200) + (Math.cos(i / 4.5) * 4500);
      const noise = ((i % 3) - 1) * 1200;
      const value = Math.max(150000, base + drift + noise + (days - i) * 920);
      points.push({
        time: t,
        value: Number(value.toFixed(2))
      });
    }

    return points;
  }

  async function fetchCoinHistory(coinId = "bitcoin", days = 14) {
    const cfg = window.NEXVAULT_CONFIG;
    const base = cfg?.providers?.pricing?.publicBase;
    if (!base) return [];

    const url = new URL(`${base}/coins/${coinId}/market_chart`);
    url.searchParams.set("vs_currency", cfg.app?.defaultCurrency || "usd");
    url.searchParams.set("days", String(days));
    url.searchParams.set("interval", days <= 30 ? "hourly" : "daily");

    try {
      const data = await fetch(url.toString()).then((r) => {
        if (!r.ok) throw new Error(`Price history failed ${r.status}`);
        return r.json();
      });

      return (data?.prices || []).map(([time, price]) => ({ time, value: price }));
    } catch (err) {
      return [];
    }
  }

  async function fetchBackendAnalytics(address, family) {
    const endpoint = window.NEXVAULT_CONFIG?.providers?.data?.endpoints?.analytics;
    if (!endpoint || !address) return null;

    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set("address", address);
    if (family) url.searchParams.set("family", family);

    try {
      const data = await fetch(url.toString()).then((r) => {
        if (!r.ok) throw new Error(`Analytics failed ${r.status}`);
        return r.json();
      });
      return data;
    } catch (err) {
      return null;
    }
  }

  function normalizeAllocationFromBalances(balances) {
    if (!Array.isArray(balances) || !balances.length) return buildDemoAllocation();

    const cleaned = balances
      .map((item) => ({
        label: item.symbol || item.ticker || item.name || "Asset",
        value: Number(item.usdValue ?? item.valueUsd ?? item.quote ?? 0),
        change: Number(item.change24h ?? item.priceChange24h ?? 0)
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return cleaned.length ? cleaned : buildDemoAllocation();
  }

  function normalizeHistory(analytics) {
    const candidates =
      analytics?.history ||
      analytics?.portfolioHistory ||
      analytics?.series ||
      analytics?.points ||
      [];

    if (!Array.isArray(candidates) || !candidates.length) return [];

    return candidates
      .map((p) => ({
        time: Number(p.time || p.timestamp || p.date || 0),
        value: Number(p.value ?? p.totalValue ?? p.usdValue ?? 0)
      }))
      .filter((p) => p.time && p.value);
  }

  function updateAllocationLegend(items) {
    const legend = document.getElementById("allocationLegend");
    if (!legend) return;

    const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);

    legend.innerHTML = items.map((item, idx) => {
      const pct = total ? ((item.value / total) * 100).toFixed(1) : "0.0";
      const color = pickColors(items.length)[idx];

      return `
        <div class="legend-row">
          <div class="legend-left">
            <span class="legend-dot" style="background:${color}"></span>
            <span class="legend-label">${item.label}</span>
          </div>
          <div class="legend-right">
            <strong>${money(item.value)}</strong>
            <small>${pct}%</small>
          </div>
        </div>
      `;
    }).join("");
  }

  function updatePerformanceMeta(points) {
    const start = points[0]?.value || 0;
    const end = points[points.length - 1]?.value || 0;
    const diff = end - start;
    const pct = start ? ((diff / start) * 100) : 0;

    const totalEl = document.getElementById("chartPerformanceValue");
    const changeEl = document.getElementById("chartPerformanceChange");

    if (totalEl) totalEl.textContent = money(end);

    if (changeEl) {
      changeEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      changeEl.classList.toggle("positive", pct >= 0);
      changeEl.classList.toggle("negative", pct < 0);
    }
  }

  function renderAllocationChart(items) {
    const ctx = getCtx("allocationChart");
    if (!ctx || typeof Chart === "undefined") return;

    destroyChart("allocationChart");

    const labels = items.map((x) => x.label);
    const values = items.map((x) => Number(x.value || 0));
    const colors = pickColors(items.length);

    chartRegistry.allocationChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "rgba(8,12,20,0.88)",
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,18,28,0.96)",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.parsed;
                const pct = total ? ((value / total) * 100).toFixed(2) : "0.00";
                return `${context.label}: ${money(value)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    updateAllocationLegend(items);
  }

  function renderPerformanceChart(points) {
    const ctx = getCtx("performanceChart");
    if (!ctx || typeof Chart === "undefined" || !points.length) return;

    destroyChart("performanceChart");

    const labels = points.map((p) => {
      const d = new Date(p.time);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const values = points.map((p) => Number(p.value || 0));
    const gradient = createGradient(ctx);

    chartRegistry.performanceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Portfolio value",
          data: values,
          borderColor: "#00D4AA",
          backgroundColor: gradient,
          fill: true,
          tension: 0.34,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,18,28,0.96)",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(context) {
                return ` ${money(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "rgba(226,232,240,0.65)",
              maxTicksLimit: 7
            }
          },
          y: {
            grid: {
              color: "rgba(255,255,255,0.05)"
            },
            ticks: {
              color: "rgba(226,232,240,0.65)",
              callback(value) {
                return money(value);
              }
            }
          }
        }
      }
    });

    updatePerformanceMeta(points);
  }

  function renderMiniPriceCards() {
    const holder = document.getElementById("marketSnapshotGrid");
    if (!holder) return;

    const prices = window.AppState?.prices || {};
    const ids = Object.entries(window.NEXVAULT_CONFIG?.supportedAssets?.coingeckoIds || {}).slice(0, 6);

    if (!ids.length) return;

    holder.innerHTML = ids.map(([key, coinId]) => {
      const entry = prices[coinId] || {};
      const price = Number(entry.usd || 0);
      const change = Number(entry.usd_24h_change || 0);

      return `
        <article class="market-mini-card">
          <span class="market-mini-label">${coinId}</span>
          <strong class="market-mini-price">${money(price)}</strong>
          <span class="market-mini-change ${change >= 0 ? "positive" : "negative"}">
            ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
          </span>
        </article>
      `;
    }).join("");
  }

  async function renderCharts() {
    const balances = window.AppState?.balances || [];
    const address = window.AppState?.address;
    const family = window.AppState?.family;

    const allocation = normalizeAllocationFromBalances(balances);
    renderAllocationChart(allocation);

    let history = [];
    const analytics = address ? await fetchBackendAnalytics(address, family) : null;

    if (analytics) {
      history = normalizeHistory(analytics);
    }

    if (!history.length) {
      const btc = await fetchCoinHistory("bitcoin", 14);
      history = btc.length ? btc : buildDemoHistory(14);
    }

    renderPerformanceChart(history);
    renderMiniPriceCards();
  }

  function wireChartRefreshTriggers() {
    document.addEventListener("nexvault:portfolio-updated", () => {
      renderCharts();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") renderCharts();
    });

    const rangeButtons = [...document.querySelectorAll("[data-chart-range]")];
    rangeButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        rangeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const range = Number(btn.dataset.chartRange || 14);
        let history = [];
        const analytics = window.AppState?.address
          ? await fetchBackendAnalytics(window.AppState.address, window.AppState.family)
          : null;

        if (analytics) {
          history = normalizeHistory(analytics);
        }

        if (!history.length) {
          const baseCoin =
            window.AppState?.family === "solana" ? "solana" :
            window.AppState?.family === "bitcoin" ? "bitcoin" :
            "ethereum";

          const remote = await fetchCoinHistory(baseCoin, range);
          history = remote.length ? remote : buildDemoHistory(range);
        }

        renderPerformanceChart(history);
      });
    });
  }

  const originalHydrate = window.hydratePortfolio;
  if (typeof originalHydrate === "function") {
    window.hydratePortfolio = async function () {
      const result = await originalHydrate.apply(this, arguments);
      document.dispatchEvent(new CustomEvent("nexvault:portfolio-updated"));
      return result;
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireChartRefreshTriggers();
    setTimeout(() => renderCharts(), 180);
  });

  window.NEXVAULT_CHARTS = {
    renderCharts,
    destroyChart
  };
})();
