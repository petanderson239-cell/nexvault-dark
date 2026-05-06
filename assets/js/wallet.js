(function () {
  const cfg = window.NEXVAULT_CONFIG || {};
  const walletCfg = cfg.providers?.wallet || {};
  const demoMap = cfg.demo?.fakeAddressMap || {};

  const WalletStore = {
    session: null,
    provider: null,
    family: null,
    walletId: null,
    walletName: null,
    chain: null,
    address: null,
    mode: "demo"
  };

  const WalletUI = {
    walletModal() {
      return document.getElementById("walletModal");
    },

    walletGrid() {
      return document.getElementById("walletGrid");
    },

    familyTabs() {
      return [...document.querySelectorAll("[data-wallet-family]")];
    },

    connectTriggers() {
      return [...document.querySelectorAll("[data-wallet-trigger]")];
    },

    familyLabel() {
      return document.getElementById("selectedWalletFamily");
    },

    statusLabel() {
      return document.getElementById("walletConnectStatus");
    }
  };

  function setWalletStatus(text, tone = "neutral") {
    const el = WalletUI.statusLabel();
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone;
  }

  function normalizeFamily(family) {
    const allowed = new Set((cfg.chainFamilies || []).map((x) => x.key));
    return allowed.has(family) ? family : (cfg.ui?.defaultFamily || "evm");
  }

  function getFamilyWallets(family) {
    return (cfg.walletGroups || []).find((group) => group.family === family)?.wallets || [];
  }

  function getWalletMeta(family, walletId) {
    return getFamilyWallets(family).find((w) => w.id === walletId) || null;
  }

  function getDefaultChainForFamily(family) {
    const chain = (cfg.chains || []).find((c) => c.family === family && c.enabled);
    return chain || null;
  }

  function getInjectedProvider(walletId) {
    const eth = window.ethereum;
    if (!eth) return null;

    if (walletId === "metamask") {
      if (eth.providers?.length) {
        return eth.providers.find((p) => p.isMetaMask) || null;
      }
      return eth.isMetaMask ? eth : null;
    }

    if (walletId === "rabby") {
      if (eth.providers?.length) {
        return eth.providers.find((p) => p.isRabby) || null;
      }
      return eth.isRabby ? eth : null;
    }

    if (walletId === "coinbase") {
      if (eth.providers?.length) {
        return eth.providers.find((p) => p.isCoinbaseWallet) || null;
      }
      return eth.isCoinbaseWallet ? eth : null;
    }

    if (walletId === "phantom") {
      return window.phantom?.ethereum || (window.ethereum?.isPhantom ? window.ethereum : null);
    }

    if (walletId === "backpack") {
      return window.backpack?.ethereum || null;
    }

    if (walletId === "solflare") {
      return window.solflare?.ethereum || null;
    }

    return eth;
  }

  function cleanupProviderListeners() {
    if (!WalletStore.provider || !WalletStore.provider.removeListener) return;

    WalletStore.provider.removeListener("accountsChanged", handleAccountsChanged);
    WalletStore.provider.removeListener("chainChanged", handleChainChanged);
    WalletStore.provider.removeListener("disconnect", handleDisconnect);
  }

  function bindProviderListeners(provider) {
    if (!provider || !provider.on) return;

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);
  }

  async function handleAccountsChanged(accounts) {
    const next = Array.isArray(accounts) ? accounts[0] : null;

    if (!next) {
      disconnectWallet(false);
      return;
    }

    WalletStore.address = next;
    if (window.AppState) {
      window.AppState.address = next;
      window.AppState.connected = true;
    }

    syncGlobalWalletState();
    if (typeof window.updateWalletUI === "function") window.updateWalletUI();
    if (typeof window.hydratePortfolio === "function") await window.hydratePortfolio();
  }

  async function handleChainChanged(chainId) {
    WalletStore.chain = chainId;
    const mapped = mapChainIdToConfig(chainId, WalletStore.family);

    if (window.AppState) {
      window.AppState.chain = mapped?.id || chainId;
    }

    syncGlobalWalletState();
    if (typeof window.updateWalletUI === "function") window.updateWalletUI();
    if (typeof window.hydratePortfolio === "function") await window.hydratePortfolio();
  }

  function handleDisconnect() {
    disconnectWallet(false);
  }

  function mapChainIdToConfig(chainId, family = "evm") {
    if (!chainId) return getDefaultChainForFamily(family);

    const normalizedHex = typeof chainId === "string" ? chainId.toLowerCase() : `0x${Number(chainId).toString(16)}`;
    const numeric = Number.parseInt(normalizedHex, 16);

    return (cfg.chains || []).find((chain) => {
      if (family && chain.family !== family) return false;
      return chain.chainId === numeric || chain.caip === chainId || chain.id === chainId;
    }) || getDefaultChainForFamily(family);
  }

  async function connectInjectedEvm(walletId, family) {
    const provider = getInjectedProvider(walletId);

    if (!provider?.request) {
      throw new Error("Injected wallet not found");
    }

    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const chainId = await provider.request({ method: "eth_chainId" });

    cleanupProviderListeners();
    WalletStore.provider = provider;
    WalletStore.address = accounts?.[0] || null;
    WalletStore.chain = chainId;
    WalletStore.family = family;
    WalletStore.mode = "live";

    bindProviderListeners(provider);

    return {
      address: WalletStore.address,
      chain: mapChainIdToConfig(chainId, family),
      providerType: "injected"
    };
  }

  async function connectSolanaLike(walletId, family) {
    const provider =
      window.phantom?.solana ||
      window.backpack?.solana ||
      window.solflare ||
      null;

    if (provider?.connect) {
      const res = await provider.connect();
      const address =
        res?.publicKey?.toString?.() ||
        provider?.publicKey?.toString?.() ||
        null;

      WalletStore.provider = provider;
      WalletStore.address = address;
      WalletStore.chain = "solana:mainnet";
      WalletStore.family = family;
      WalletStore.mode = address ? "live" : "demo";

      return {
        address,
        chain: getDefaultChainForFamily("solana"),
        providerType: "solana-injected"
      };
    }

    throw new Error("Solana wallet not found");
  }

  async function connectWalletConnectUniversal(walletId, family) {
    const projectId = walletCfg.projectId;
    if (!projectId || projectId.includes("REPLACE_WITH")) {
      return connectDemoWallet(walletId, family, "WalletConnect projectId missing");
    }

    setWalletStatus("WalletConnect setup required in app bundle", "warn");

    return connectDemoWallet(walletId, family, "Universal bridge placeholder");
  }

  function connectDemoWallet(walletId, family, reason = "Demo mode") {
    const fallbackAddress =
      demoMap[walletId] ||
      demoMap.walletconnect ||
      "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

    WalletStore.provider = null;
    WalletStore.address = fallbackAddress;
    WalletStore.family = family;
    WalletStore.chain = getDefaultChainForFamily(family)?.id || family;
    WalletStore.mode = "demo";

    return {
      address: fallbackAddress,
      chain: getDefaultChainForFamily(family),
      providerType: "demo",
      reason
    };
  }

  function syncGlobalWalletState() {
    const meta = getWalletMeta(WalletStore.family, WalletStore.walletId);

    if (!window.AppState) return;

    window.AppState.wallet = meta?.name || WalletStore.walletName || "Wallet";
    window.AppState.address = WalletStore.address;
    window.AppState.family = WalletStore.family;
    window.AppState.chain = mapChainIdToConfig(WalletStore.chain, WalletStore.family)?.id || WalletStore.chain;
    window.AppState.connected = Boolean(WalletStore.address);
    window.AppState.mode = WalletStore.mode;
  }

  function persistSession() {
    window.__NEXVAULT_WALLET_SESSION__ = {
      walletId: WalletStore.walletId,
      walletName: WalletStore.walletName,
      family: WalletStore.family,
      chain: WalletStore.chain,
      address: WalletStore.address,
      mode: WalletStore.mode
    };
  }

  function restoreSession() {
    const session = window.__NEXVAULT_WALLET_SESSION__;
    if (!session?.address) return false;

    WalletStore.walletId = session.walletId;
    WalletStore.walletName = session.walletName;
    WalletStore.family = session.family;
    WalletStore.chain = session.chain;
    WalletStore.address = session.address;
    WalletStore.mode = session.mode || "demo";

    syncGlobalWalletState();
    if (typeof window.updateWalletUI === "function") window.updateWalletUI();
    return true;
  }

  function disconnectWallet(showToast = true) {
    cleanupProviderListeners();

    WalletStore.provider = null;
    WalletStore.walletId = null;
    WalletStore.walletName = null;
    WalletStore.family = cfg.ui?.defaultFamily || "evm";
    WalletStore.chain = null;
    WalletStore.address = null;
    WalletStore.mode = "demo";

    window.__NEXVAULT_WALLET_SESSION__ = null;

    if (window.AppState) {
      window.AppState.wallet = null;
      window.AppState.address = null;
      window.AppState.family = null;
      window.AppState.chain = null;
      window.AppState.connected = false;
      window.AppState.mode = "demo";
    }

    if (typeof window.updateWalletUI === "function") window.updateWalletUI();
    if (typeof window.hydratePortfolio === "function") window.hydratePortfolio();

    setWalletStatus("Disconnected", "neutral");
    if (showToast && window.Toast) window.Toast.info("Wallet disconnected");
  }

  function setActiveFamilyTab(family) {
    WalletUI.familyTabs().forEach((tab) => {
      const active = tab.dataset.walletFamily === family;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    const label = WalletUI.familyLabel();
    if (label) {
      const familyMeta = (cfg.chainFamilies || []).find((x) => x.key === family);
      label.textContent = familyMeta?.name || family;
    }
  }

  function renderWalletGrid(family) {
    const grid = WalletUI.walletGrid();
    if (!grid) return;

    const wallets = getFamilyWallets(family);

    grid.innerHTML = wallets.map((wallet) => `
      <button
        type="button"
        class="wallet-option reveal"
        data-wallet-id="${wallet.id}"
        data-wallet-family="${family}"
        aria-label="Connect ${wallet.name}"
      >
        <span class="wallet-option-mark" style="--wallet-accent:${wallet.accent || "#3B99FC"}">
          ${wallet.short || wallet.name.slice(0, 2).toUpperCase()}
        </span>
        <span class="wallet-option-copy">
          <strong>${wallet.name}</strong>
          <small>${wallet.mode === "universal" ? "Universal session" : wallet.mode === "injected" ? "Browser wallet" : "Custom bridge"}</small>
        </span>
        <span class="wallet-option-arrow">→</span>
      </button>
    `).join("");

    [...grid.querySelectorAll("[data-wallet-id]")].forEach((btn) => {
      btn.addEventListener("click", () => {
        const walletId = btn.dataset.walletId;
        const walletFamily = btn.dataset.walletFamily;
        connectWallet(walletId, walletFamily);
      });
    });
  }

  async function connectWallet(walletId, family) {
    const normalizedFamily = normalizeFamily(family);
    const meta = getWalletMeta(normalizedFamily, walletId);

    WalletStore.walletId = walletId;
    WalletStore.walletName = meta?.name || walletId;
    WalletStore.family = normalizedFamily;

    setWalletStatus(`Connecting ${meta?.name || walletId}...`, "loading");

    try {
      let result;

      if (meta?.mode === "universal") {
        result = await connectWalletConnectUniversal(walletId, normalizedFamily);
      } else if (normalizedFamily === "solana" && ["phantom", "backpack", "solflare"].includes(walletId)) {
        result = await connectSolanaLike(walletId, normalizedFamily);
      } else if (meta?.mode === "injected") {
        result = await connectInjectedEvm(walletId, normalizedFamily);
      } else {
        result = connectDemoWallet(walletId, normalizedFamily, "Custom wallet bridge pending");
      }

      WalletStore.address = result?.address || null;
      WalletStore.chain = result?.chain?.id || result?.chain?.caip || result?.chain || WalletStore.chain;
      WalletStore.mode = result?.providerType === "demo" ? "demo" : WalletStore.mode || "live";

      syncGlobalWalletState();
      persistSession();

      if (typeof window.updateWalletUI === "function") window.updateWalletUI();
      if (typeof window.closeModal === "function") window.closeModal("walletModal");
      if (typeof window.hydratePortfolio === "function") await window.hydratePortfolio();

      if (WalletStore.mode === "demo") {
        setWalletStatus("Connected in demo-safe mode", "warn");
        window.Toast?.warn(result?.reason || "Demo wallet connected");
      } else {
        setWalletStatus("Wallet connected", "success");
        window.Toast?.success(`${meta?.name || "Wallet"} connected`);
      }
    } catch (err) {
      console.error(err);
      setWalletStatus("Connection failed", "error");
      window.Toast?.error(err?.message || "Wallet connection failed");
    }
  }

  function attachWalletTriggers() {
    WalletUI.connectTriggers().forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof window.openModal === "function") {
          window.openModal("walletModal");
        }
      });
    });

    document.querySelectorAll("[data-wallet-disconnect]").forEach((btn) => {
      btn.addEventListener("click", () => disconnectWallet(true));
    });

    document.querySelectorAll("[data-copy-wallet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.AppState?.address) window.Utils?.copy(window.AppState.address, "Wallet address copied");
      });
    });
  }

  function attachFamilyTabs() {
    WalletUI.familyTabs().forEach((tab) => {
      tab.addEventListener("click", () => {
        const family = normalizeFamily(tab.dataset.walletFamily);
        setActiveFamilyTab(family);
        renderWalletGrid(family);
      });
    });
  }

  function bootWalletModal() {
    const defaultFamily = normalizeFamily(cfg.ui?.defaultFamily || "evm");
    setActiveFamilyTab(defaultFamily);
    renderWalletGrid(defaultFamily);
    setWalletStatus("Choose a wallet to continue", "neutral");
  }

  window.openWalletModal = function (family) {
    const selected = normalizeFamily(family || window.AppState?.family || cfg.ui?.defaultFamily || "evm");
    setActiveFamilyTab(selected);
    renderWalletGrid(selected);
    if (typeof window.openModal === "function") window.openModal("walletModal");
  };

  window.disconnectWallet = disconnectWallet;

  document.addEventListener("DOMContentLoaded", () => {
    attachWalletTriggers();
    attachFamilyTabs();
    bootWalletModal();

    if (restoreSession()) {
      setWalletStatus("Session restored", "success");
    }
  });
})();
