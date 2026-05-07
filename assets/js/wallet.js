(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────── */
  const cfg      = window.NEXVAULT_CONFIG || {};
  const walletCfg = cfg.providers?.wallet || {};
  const PROJECT_ID = walletCfg.projectId || '';

  /* ─── STATE ──────────────────────────────────────── */
  const WalletStore = {
    address : null,
    family  : null,
    walletId: null,
    provider: null,
    mode    : 'idle'   // idle | connecting | connected | error
  };

  /* ─── HELPERS ─────────────────────────────────────── */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel) { return [...document.querySelectorAll(sel)]; }
  function byId(id) { return document.getElementById(id); }

  function setStatus(text, tone) {
    const el = byId('walletConnectStatus');
    if (!el) return;
    el.textContent = text;
    if (tone) el.dataset.tone = tone;
  }

  /* ─── INJECTED WALLET (MetaMask / Rabby / Coinbase) ─ */
  async function connectInjected(walletId) {
    if (!window.ethereum) {
      if (window.Toast) window.Toast.error('No injected wallet found. Install MetaMask or Rabby.');
      setStatus('Wallet extension not found.', 'error');
      return;
    }

    setStatus('Requesting account access…', 'pending');
    WalletStore.mode = 'connecting';

    try {
      let provider = window.ethereum;

      // If multiple injected wallets exist, pick the right one
      if (window.ethereum.providers?.length) {
        const map = {
          metamask: (p) => p.isMetaMask && !p.isRabby,
          rabby   : (p) => p.isRabby,
          coinbase: (p) => p.isCoinbaseWallet
        };
        const match = window.ethereum.providers.find(map[walletId] || (() => true));
        if (match) provider = match;
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No accounts returned');

      const chainHex = await provider.request({ method: 'eth_chainId' });
      const chainId  = parseInt(chainHex, 16);

      WalletStore.address  = accounts[0];
      WalletStore.family   = 'evm';
      WalletStore.walletId = walletId;
      WalletStore.provider = provider;
      WalletStore.mode     = 'connected';

      onConnected({ address: accounts[0], family: 'evm', walletId, chainId });

      // Listen for account/chain changes
      provider.on('accountsChanged', (accs) => {
        if (accs[0]) onConnected({ address: accs[0], family: 'evm', walletId, chainId });
        else handleDisconnect();
      });
      provider.on('chainChanged', () => window.location.reload());

    } catch (err) {
      const msg = err.code === 4001 ? 'Connection rejected by user.' : (err.message || 'Connection failed.');
      setStatus(msg, 'error');
      if (window.Toast) window.Toast.error(msg);
      WalletStore.mode = 'error';
    }
  }

  /* ─── PHANTOM / SOLANA ───────────────────────────── */
  async function connectPhantom() {
    const sol = window.phantom?.solana || window.solana;
    if (!sol?.isPhantom) {
      if (window.Toast) window.Toast.error('Phantom wallet not found. Install the extension.');
      setStatus('Phantom not installed.', 'error');
      return;
    }

    setStatus('Connecting to Phantom…', 'pending');
    WalletStore.mode = 'connecting';

    try {
      const resp = await sol.connect();
      const address = resp.publicKey.toString();

      WalletStore.address  = address;
      WalletStore.family   = 'solana';
      WalletStore.walletId = 'phantom';
      WalletStore.provider = sol;
      WalletStore.mode     = 'connected';

      onConnected({ address, family: 'solana', walletId: 'phantom' });

      sol.on('disconnect', handleDisconnect);
      sol.on('accountChanged', (key) => {
        if (key) onConnected({ address: key.toString(), family: 'solana', walletId: 'phantom' });
        else handleDisconnect();
      });

    } catch (err) {
      const msg = err.message || 'Phantom connection failed.';
      setStatus(msg, 'error');
      if (window.Toast) window.Toast.error(msg);
      WalletStore.mode = 'error';
    }
  }

  /* ─── SOLFLARE ───────────────────────────────────── */
  async function connectSolflare() {
    const sf = window.solflare;
    if (!sf) {
      if (window.Toast) window.Toast.error('Solflare wallet not found.');
      setStatus('Solflare not installed.', 'error');
      return;
    }

    setStatus('Connecting to Solflare…', 'pending');
    WalletStore.mode = 'connecting';

    try {
      await sf.connect();
      const address = sf.publicKey.toString();

      WalletStore.address  = address;
      WalletStore.family   = 'solana';
      WalletStore.walletId = 'solflare';
      WalletStore.provider = sf;
      WalletStore.mode     = 'connected';

      onConnected({ address, family: 'solana', walletId: 'solflare' });
    } catch (err) {
      setStatus(err.message || 'Solflare connection failed.', 'error');
      WalletStore.mode = 'error';
    }
  }

  /* ─── WALLETCONNECT / REOWN APPKIT ──────────────── */
  async function connectWalletConnect(family) {
    if (!PROJECT_ID || PROJECT_ID.includes('REPLACE')) {
      if (window.Toast) window.Toast.error('Set your Reown projectId in config.js first.');
      setStatus('projectId missing in config.js', 'error');
      return;
    }

    setStatus('Opening WalletConnect…', 'pending');
    WalletStore.mode = 'connecting';

    try {
      // Use Reown AppKit if createAppKit is globally available (loaded via <script> in HTML)
      if (window.createAppKit) {
        const chains = [
          { id: 1,     name: 'Ethereum', nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, rpcUrls:{ default:{ http:['https://cloudflare-eth.com'] } } },
          { id: 8453,  name: 'Base', nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, rpcUrls:{ default:{ http:['https://mainnet.base.org'] } } },
          { id: 42161, name: 'Arbitrum', nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, rpcUrls:{ default:{ http:['https://arb1.arbitrum.io/rpc'] } } },
          { id: 10,    name: 'Optimism', nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, rpcUrls:{ default:{ http:['https://mainnet.optimism.io'] } } },
          { id: 137,   name: 'Polygon', nativeCurrency: { name:'POL', symbol:'POL', decimals:18 }, rpcUrls:{ default:{ http:['https://polygon-rpc.com'] } } },
        ];

        if (!window.__nexvault_appkit__) {
          const { createAppKit: cak } = await import('https://esm.sh/@reown/appkit@1.6.8');
          const { WagmiAdapter }       = await import('https://esm.sh/@reown/appkit-adapter-wagmi@1.6.8');
          const adapter = new WagmiAdapter({ networks: chains, projectId: PROJECT_ID });

          window.__nexvault_appkit__ = cak({
            adapters    : [adapter],
            networks    : chains,
            projectId   : PROJECT_ID,
            metadata    : walletCfg.metadata || {
              name       : 'NexVault',
              description: 'Multi-chain portfolio dashboard',
              url        : window.location.origin,
              icons      : ['/favicon.ico']
            },
            themeMode      : 'dark',
            themeVariables : {
              '--w3m-accent'               : '#00d4aa',
              '--w3m-border-radius-master' : '14px'
            }
          });
        }

        window.__nexvault_appkit__.open({ view: 'Connect' });

        // Poll for connection state (AppKit does not emit DOM events in vanilla HTML)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const state = window.__nexvault_appkit__.getState?.();
            if (state?.selectedNetworkId && state?.address) {
              clearInterval(poll);
              WalletStore.address  = state.address;
              WalletStore.family   = 'evm';
              WalletStore.walletId = 'walletconnect';
              WalletStore.mode     = 'connected';
              onConnected({ address: state.address, family: 'evm', walletId: 'walletconnect' });
            }
          } catch (_) {}
          if (attempts > 60) {
            clearInterval(poll);
            if (WalletStore.mode === 'connecting') {
              setStatus('Connection timed out. Try again.', 'error');
              WalletStore.mode = 'idle';
            }
          }
        }, 1000);
        return;
      }

      // Fallback: load WalletConnect EthereumProvider directly via ESM
      const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0');
      const wcp = await EthereumProvider.init({
        projectId     : PROJECT_ID,
        chains        : [1],
        optionalChains: [8453, 42161, 10, 137, 56],
        showQrModal   : true,
        metadata      : walletCfg.metadata || {
          name       : 'NexVault',
          description: 'Multi-chain portfolio dashboard',
          url        : window.location.origin,
          icons      : ['/favicon.ico']
        }
      });

      await wcp.connect();
      const accounts = await wcp.request({ method: 'eth_accounts' });
      if (!accounts?.[0]) throw new Error('No accounts from WalletConnect');

      WalletStore.address  = accounts[0];
      WalletStore.family   = family || 'evm';
      WalletStore.walletId = 'walletconnect';
      WalletStore.provider = wcp;
      WalletStore.mode     = 'connected';

      onConnected({ address: accounts[0], family: 'evm', walletId: 'walletconnect' });

      wcp.on('accountsChanged', (a) => {
        if (a?.[0]) onConnected({ address: a[0], family: 'evm', walletId: 'walletconnect' });
      });
      wcp.on('disconnect', handleDisconnect);

    } catch (err) {
      if (err?.message?.includes('User rejected') || err?.code === 4001) {
        setStatus('Rejected by user.', 'error');
      } else {
        setStatus(err?.message || 'WalletConnect failed.', 'error');
        if (window.Toast) window.Toast.error(err?.message || 'WalletConnect failed.');
      }
      WalletStore.mode = 'error';
    }
  }

  /* ─── ON CONNECTED ───────────────────────────────── */
  function onConnected({ address, family, walletId, chainId }) {
    WalletStore.address  = address;
    WalletStore.family   = family;
    WalletStore.walletId = walletId;
    WalletStore.mode     = 'connected';

    // Sync into AppState (used by main.js / dashboard.js)
    if (window.AppState) {
      window.AppState.connected = true;
      window.AppState.address   = address;
      window.AppState.family    = family;
      window.AppState.wallet    = walletId;
      window.AppState.chain     = chainId || null;
      window.AppState.mode      = 'live';
    }

    closeWalletModal();
    updateWalletButtonsUI(address);

    if (window.Toast) window.Toast.success(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
    setStatus('Connected ✓', 'success');

    // Trigger portfolio data reload
    if (typeof window.hydratePortfolio === 'function') window.hydratePortfolio();
    if (typeof window.updateWalletUI  === 'function') window.updateWalletUI();

    document.dispatchEvent(new CustomEvent('nexvault:connected', {
      detail: { address, family, walletId }
    }));
  }

  /* ─── DISCONNECT ─────────────────────────────────── */
  function handleDisconnect() {
    WalletStore.address  = null;
    WalletStore.family   = null;
    WalletStore.walletId = null;
    WalletStore.provider = null;
    WalletStore.mode     = 'idle';

    if (window.AppState) {
      window.AppState.connected = false;
      window.AppState.address   = null;
      window.AppState.family    = null;
      window.AppState.wallet    = null;
      window.AppState.mode      = 'demo';
    }

    updateWalletButtonsUI(null);
    if (typeof window.updateWalletUI === 'function') window.updateWalletUI();
    if (window.Toast) window.Toast.info('Wallet disconnected.');
    document.dispatchEvent(new CustomEvent('nexvault:disconnected'));
  }

  /* ─── UPDATE CONNECT BUTTON TEXT ─────────────────── */
  function updateWalletButtonsUI(address) {
    qsa('[data-wallet-trigger]').forEach((btn) => {
      if (address) {
        btn.textContent = `${address.slice(0, 6)}…${address.slice(-4)}`;
        btn.title = 'Click to disconnect';
      } else {
        btn.innerHTML = '<span aria-hidden="true">⬡</span> Connect Wallet';
        btn.title = '';
      }
    });
  }

  /* ─── MODAL WALLET GRID ──────────────────────────── */
  function renderWalletGrid(family) {
    const grid = byId('walletGrid');
    if (!grid) return;

    const wallets = defaultWalletsForFamily(family);

    grid.innerHTML = wallets.map((w) => `
      <button
        type="button"
        class="wallet-option-btn"
        data-wallet-id="${w.id}"
        data-wallet-family="${family}"
        aria-label="Connect with ${w.name}"
      >
        <span class="wallet-option-icon" style="background:${w.accent}22;border:1px solid ${w.accent}44;">
          ${walletIcon(w.id)}
        </span>
        <span class="wallet-option-name">${w.name}</span>
        <span class="wallet-option-arrow">→</span>
      </button>
    `).join('');

    grid.querySelectorAll('.wallet-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.walletId;
        const fam = btn.dataset.walletFamily;
        dispatchConnect(id, fam);
      });
    });
  }

  function defaultWalletsForFamily(family) {
    const defaults = {
      evm    : [
        { id: 'walletconnect', name: 'WalletConnect', accent: '#3B99FC' },
        { id: 'metamask',      name: 'MetaMask',      accent: '#F6851B' },
        { id: 'rabby',         name: 'Rabby',          accent: '#F4C542' },
        { id: 'coinbase',      name: 'Coinbase Wallet',accent: '#0052FF' },
      ],
      solana : [
        { id: 'walletconnect', name: 'WalletConnect', accent: '#3B99FC' },
        { id: 'phantom',       name: 'Phantom',        accent: '#AB9FF2' },
        { id: 'solflare',      name: 'Solflare',       accent: '#FCB045' },
      ],
      bitcoin: [
        { id: 'walletconnect', name: 'WalletConnect', accent: '#3B99FC' },
      ],
      tron   : [{ id: 'walletconnect', name: 'WalletConnect', accent: '#3B99FC' }],
      ton    : [{ id: 'walletconnect', name: 'WalletConnect', accent: '#0098EA' }],
    };
    return defaults[family] || defaults.evm;
  }

  function walletIcon(id) {
    const icons = {
      metamask     : '🦊',
      rabby        : '🐰',
      coinbase     : '🔵',
      phantom      : '👻',
      solflare     : '🌟',
      backpack     : '🎒',
      walletconnect: '<svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M9.58 12.25c3.54-3.47 9.28-3.47 12.82 0l.43.42a.44.44 0 0 1 0 .63l-1.46 1.43a.23.23 0 0 1-.32 0l-.59-.57c-2.47-2.42-6.47-2.42-8.94 0l-.63.62a.23.23 0 0 1-.32 0L9.11 13.3a.44.44 0 0 1 0-.63l.47-.42Zm15.82 2.95 1.3 1.27a.44.44 0 0 1 0 .63l-5.85 5.73a.46.46 0 0 1-.64 0l-4.15-4.07a.12.12 0 0 0-.16 0l-4.15 4.07a.46.46 0 0 1-.64 0L5.28 17.1a.44.44 0 0 1 0-.63l1.3-1.27a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0Z" fill="#3B99FC"/></svg>',
      ledger       : '🔑',
      trust        : '🛡',
      xverse       : '₿',
      unisat       : '🟠',
      tronlink     : '◉',
      tonkeeper    : '💎',
    };
    return icons[id] || '🔗';
  }

  function dispatchConnect(id, family) {
    setStatus('Connecting…', 'pending');

    if (id === 'phantom') {
      connectPhantom();
    } else if (id === 'solflare') {
      connectSolflare();
    } else if (['metamask', 'rabby', 'coinbase'].includes(id)) {
      connectInjected(id);
    } else {
      // walletconnect or any other
      connectWalletConnect(family);
    }
  }

  /* ─── FAMILY TABS ─────────────────────────────────── */
  function initFamilyTabs() {
    const tabs = qsa('#walletFamilyTabs [data-wallet-family]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderWalletGrid(tab.dataset.walletFamily);
      });
    });
  }

  /* ─── MODAL OPEN / CLOSE ──────────────────────────── */
  function openWalletModal() {
    const modal = byId('walletModal');
    if (!modal) return;
    if (typeof window.openModal === 'function') {
      window.openModal('walletModal');
    } else {
      modal.classList.add('active');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    renderWalletGrid('evm');
    initFamilyTabs();
    setStatus('Choose a wallet to continue');
  }

  function closeWalletModal() {
    const modal = byId('walletModal');
    if (!modal) return;
    if (typeof window.closeModal === 'function') {
      window.closeModal('walletModal');
    } else {
      modal.classList.remove('active');
      modal.style.display = '';
      document.body.style.overflow = '';
    }
  }

  /* ─── TRIGGER BUTTONS ─────────────────────────────── */
  function initTriggers() {
    qsa('[data-wallet-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (WalletStore.mode === 'connected') {
          if (window.confirm('Disconnect wallet?')) handleDisconnect();
          return;
        }
        openWalletModal();
      });
    });

    qsa('[data-wallet-disconnect]').forEach((btn) => {
      btn.addEventListener('click', handleDisconnect);
    });
  }

  /* ─── MODAL CLOSE ON BACKDROP ─────────────────────── */
  function initModalBackdrop() {
    const modal = byId('walletModal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeWalletModal();
    });
  }

  /* ─── AUTO-RECONNECT ON PAGE LOAD ────────────────── */
  async function tryAutoReconnect() {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts?.[0]) {
        WalletStore.mode = 'connected';
        onConnected({ address: accounts[0], family: 'evm', walletId: 'injected' });
      }
    } catch (_) {}
  }

  /* ─── INJECT GRID STYLES ──────────────────────────── */
  function injectWalletStyles() {
    if (byId('nexvault-wallet-styles')) return;
    const style = document.createElement('style');
    style.id = 'nexvault-wallet-styles';
    style.textContent = `
      .wallet-option-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        color: rgba(235,242,255,0.9);
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: background 180ms ease, border-color 180ms ease, transform 150ms ease;
        text-align: left;
      }
      .wallet-option-btn:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.16);
        transform: translateY(-1px);
      }
      .wallet-option-btn:active { transform: scale(0.98); }
      .wallet-option-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        font-size: 20px;
        flex-shrink: 0;
      }
      .wallet-option-name { flex: 1; }
      .wallet-option-arrow { color: rgba(235,242,255,0.3); font-size: 14px; }
      #walletGrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 4px 0;
      }
      @media (max-width: 480px) { #walletGrid { grid-template-columns: 1fr; } }
      #walletConnectStatus[data-tone="success"] { color: #00d4aa; }
      #walletConnectStatus[data-tone="error"]   { color: #ff6b6b; }
      #walletConnectStatus[data-tone="pending"] { color: rgba(235,242,255,0.5); }
    `;
    document.head.appendChild(style);
  }

  /* ─── INIT ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    injectWalletStyles();
    initTriggers();
    initModalBackdrop();
    tryAutoReconnect();
  });

  /* ─── PUBLIC API ──────────────────────────────────── */
  window.NexVaultWallet = {
    connect     : dispatchConnect,
    disconnect  : handleDisconnect,
    getState    : () => ({ ...WalletStore }),
    isConnected : () => WalletStore.mode === 'connected',
    openModal   : openWalletModal,
    closeModal  : closeWalletModal,
  };

  // Backwards compat
  window.openWalletModal   = openWalletModal;
  window.disconnectWallet  = handleDisconnect;

})();
