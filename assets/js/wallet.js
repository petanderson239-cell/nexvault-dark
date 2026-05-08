(function () {
  'use strict';

  /*
   * NexVault Wallet — Production
   * Priority:
   *   1. EIP-6963  detected wallets (injected, auto-detected)
   *   2. WalletConnect / Reown AppKit  (primary for mobile + hardware)
   *   3. Solana / Bitcoin / TRON / TON  (dedicated adapters)
   */

  const PROJECT_ID = (window.NEXVAULT_CONFIG?.providers?.wallet?.projectId) || '';

  const Store = {
    address: null, family: null,
    walletId: null, walletName: null,
    provider: null, mode: 'idle'
  };

  /* ── EIP-6963 ────────────────────────────────────────────────── */
  const eip6963 = new Map();
  window.addEventListener('eip6963:announceProvider', ({ detail: { info, provider } }) => {
    if (info?.rdns) {
      eip6963.set(info.rdns, { info, provider });
      if (_isEVMTabActive()) renderWalletGrid('evm');
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function _isEVMTabActive() {
    const container = document.querySelector('.wallet-family-tabs');
    if (!container) return true;
    const active = container.querySelector('[data-wallet-family].active');
    return !active || active.dataset.walletFamily === 'evm';
  }

  /* ── WALLET REGISTRY ─────────────────────────────────────────── */
  const EVM_WALLETS = [
    { id: 'io.metamask',         name: 'MetaMask',        abbr: 'MM',  accent: '#F6851B' },
    { id: 'io.rabby',            name: 'Rabby',           abbr: 'RB',  accent: '#8697FF' },
    { id: 'com.coinbase.wallet', name: 'Coinbase Wallet', abbr: 'CB',  accent: '#0052FF' },
    { id: 'com.okex.wallet',     name: 'OKX Wallet',      abbr: 'OKX', accent: '#111' },
    { id: 'com.brave.wallet',    name: 'Brave Wallet',    abbr: 'BR',  accent: '#FB542B' },
    { id: 'com.trustwallet.app', name: 'Trust Wallet',    abbr: 'TW',  accent: '#3375BB' },
    { id: 'xyz.frame',           name: 'Frame',           abbr: 'FR',  accent: '#00D17D' },
    { id: 'io.zerion.wallet',    name: 'Zerion',          abbr: 'ZR',  accent: '#2962EF' },
    { id: 'com.ledger',          name: 'Ledger Live',     abbr: 'LD',  accent: '#142533' },
    { id: 'com.binance',         name: 'Binance Web3',    abbr: 'BNB', accent: '#F0B90B' },
  ];
  const SOLANA_WALLETS = [
    { id: 'phantom',   name: 'Phantom',   abbr: 'PH', accent: '#AB9FF2' },
    { id: 'solflare',  name: 'Solflare',  abbr: 'SF', accent: '#FCB045' },
    { id: 'backpack',  name: 'Backpack',  abbr: 'BP', accent: '#E33E3F' },
  ];
  const BITCOIN_WALLETS = [
    { id: 'xverse',  name: 'Xverse',  abbr: 'XV', accent: '#7223D5' },
    { id: 'unisat',  name: 'UniSat',  abbr: 'US', accent: '#F7931A' },
    { id: 'leather', name: 'Leather', abbr: 'LT', accent: '#FF5500' },
  ];
  const TRON_WALLETS = [{ id: 'tronlink', name: 'TronLink', abbr: 'TL', accent: '#FF0013' }];
  const TON_WALLETS  = [
    { id: 'tonkeeper',   name: 'Tonkeeper',   abbr: 'TK', accent: '#0098EA' },
    { id: 'mytonwallet', name: 'MyTonWallet', abbr: 'MT', accent: '#0088CC' },
  ];
  const FAMILY_MAP = { evm: EVM_WALLETS, solana: SOLANA_WALLETS, bitcoin: BITCOIN_WALLETS, tron: TRON_WALLETS, ton: TON_WALLETS };

  /* ── HELPERS ─────────────────────────────────────────────────── */
  const byId = (id) => document.getElementById(id);
  const $    = (sel) => [...document.querySelectorAll(sel)];
  const short = (a) => a?.length > 12 ? `${a.slice(0,6)}\u2026${a.slice(-4)}` : (a || '');
  const toast = (m, t) => { if (window.Toast) window.Toast[t]?.(m) || window.Toast.info?.(m); };
  function setStatus(text, tone) {
    const el = byId('walletConnectStatus');
    if (el) { el.textContent = text; el.dataset.tone = tone || 'neutral'; }
  }

  /* ── CONNECT: EIP-6963 ───────────────────────────────────────── */
  async function connectEIP6963(rdns) {
    const entry = eip6963.get(rdns);
    if (!entry) return connectLegacy(rdns);
    setStatus(`Connecting ${entry.info.name}\u2026`, 'pending');
    Store.mode = 'connecting';
    try {
      const accounts  = await entry.provider.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No accounts');
      const chainHex  = await entry.provider.request({ method: 'eth_chainId' });
      Store.provider  = entry.provider;
      onConnected({ address: accounts[0], family: 'evm', walletId: rdns, walletName: entry.info.name, chainId: parseInt(chainHex, 16) });
      entry.provider.on?.('accountsChanged', (a) => a?.[0] ? onConnected({ address: a[0], family: 'evm', walletId: rdns, walletName: entry.info.name }) : handleDisconnect());
      entry.provider.on?.('chainChanged',    () => window.location.reload());
    } catch (err) {
      const m = err.code === 4001 ? 'Request rejected.' : (err.message || 'Connection failed.');
      setStatus(m, 'error'); toast(m, 'error'); Store.mode = 'error';
    }
  }

  /* ── CONNECT: LEGACY EIP-1193 ────────────────────────────────── */
  async function connectLegacy(walletId) {
    const eth = window.ethereum;
    if (!eth) {
      const name = EVM_WALLETS.find(w => w.id === walletId)?.name || walletId;
      toast(`${name} not installed.`, 'error');
      setStatus(`${name} extension not found.`, 'error');
      return;
    }
    setStatus('Requesting accounts\u2026', 'pending');
    Store.mode = 'connecting';
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No accounts');
      const chainHex = await eth.request({ method: 'eth_chainId' });
      const wName    = EVM_WALLETS.find(w => w.id === walletId)?.name || 'Browser Wallet';
      Store.provider = eth;
      onConnected({ address: accounts[0], family: 'evm', walletId, walletName: wName, chainId: parseInt(chainHex, 16) });
      eth.on?.('accountsChanged', (a) => a?.[0] ? onConnected({ address: a[0], family: 'evm', walletId, walletName: wName }) : handleDisconnect());
      eth.on?.('chainChanged', () => window.location.reload());
    } catch (err) {
      const m = err.code === 4001 ? 'Request rejected.' : (err.message || 'Connection failed.');
      setStatus(m, 'error'); toast(m, 'error'); Store.mode = 'error';
    }
  }

  /* ── CONNECT: SOLANA ─────────────────────────────────────────── */
  async function connectSolana(walletId) {
    const provFn = { phantom: () => window.phantom?.solana || window.solana, solflare: () => window.solflare, backpack: () => window.xnft?.solana || window.backpack?.solana };
    const sol = (provFn[walletId] || (() => null))();
    if (!sol?.connect) { toast(`${SOLANA_WALLETS.find(w => w.id === walletId)?.name || walletId} not installed.`, 'error'); return; }
    setStatus(`Connecting ${walletId}\u2026`, 'pending'); Store.mode = 'connecting';
    try {
      const resp    = await sol.connect();
      const address = resp?.publicKey?.toString() || sol.publicKey?.toString();
      if (!address) throw new Error('No public key');
      const wName   = SOLANA_WALLETS.find(w => w.id === walletId)?.name || walletId;
      Store.provider = sol;
      onConnected({ address, family: 'solana', walletId, walletName: wName });
      sol.on?.('disconnect',    handleDisconnect);
      sol.on?.('accountChanged', (k) => k ? onConnected({ address: k.toString(), family: 'solana', walletId, walletName: wName }) : handleDisconnect());
    } catch (err) { setStatus(err.message || 'Solana failed.', 'error'); toast(err.message, 'error'); Store.mode = 'error'; }
  }

  /* ── CONNECT: BITCOIN ────────────────────────────────────────── */
  async function connectBitcoin(walletId) {
    const provFn = { xverse: () => window.XverseProviders?.BitcoinProvider || window.BitcoinProvider, unisat: () => window.unisat, leather: () => window.LeatherProvider };
    const prov = (provFn[walletId] || (() => null))();
    if (!prov) { toast(`${BITCOIN_WALLETS.find(w => w.id === walletId)?.name || walletId} not installed.`, 'error'); return; }
    setStatus(`Connecting ${walletId}\u2026`, 'pending'); Store.mode = 'connecting';
    try {
      let address;
      if (walletId === 'unisat') { const accs = await prov.requestAccounts(); address = accs?.[0]; }
      else { const r = await prov.request({ method: 'getAccounts' }); address = r?.addresses?.[0]?.address || r?.[0]?.address; }
      if (!address) throw new Error('No address');
      const wName = BITCOIN_WALLETS.find(w => w.id === walletId)?.name || walletId;
      Store.provider = prov;
      onConnected({ address, family: 'bitcoin', walletId, walletName: wName });
    } catch (err) { setStatus(err.message || 'Bitcoin failed.', 'error'); toast(err.message, 'error'); Store.mode = 'error'; }
  }

  /* ── CONNECT: WALLETCONNECT / REOWN APPKIT ───────────────────── */
  async function connectWC(family) {
    if (!PROJECT_ID || PROJECT_ID.length < 10) {
      toast('Add Reown projectId to config.js', 'error');
      setStatus('Missing projectId in config.js', 'error'); return;
    }
    setStatus('Opening WalletConnect\u2026', 'pending'); Store.mode = 'connecting';
    try {
      if (!window.__nv_appkit__) {
        setStatus('Initialising AppKit\u2026', 'pending');
        const [{ createAppKit }, { WagmiAdapter }] = await Promise.all([
          import('https://esm.sh/@reown/appkit@1.6.8'),
          import('https://esm.sh/@reown/appkit-adapter-wagmi@1.6.8')
        ]);
        const networks = [
          { id:1,     name:'Ethereum',  nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},  rpcUrls:{default:{http:['https://cloudflare-eth.com']}} },
          { id:8453,  name:'Base',      nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},  rpcUrls:{default:{http:['https://mainnet.base.org']}} },
          { id:42161, name:'Arbitrum',  nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},  rpcUrls:{default:{http:['https://arb1.arbitrum.io/rpc']}} },
          { id:10,    name:'Optimism',  nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},  rpcUrls:{default:{http:['https://mainnet.optimism.io']}} },
          { id:137,   name:'Polygon',   nativeCurrency:{name:'POL',symbol:'POL',decimals:18},     rpcUrls:{default:{http:['https://polygon-rpc.com']}} },
          { id:56,    name:'BNB Chain', nativeCurrency:{name:'BNB',symbol:'BNB',decimals:18},     rpcUrls:{default:{http:['https://bsc-dataseed.binance.org']}} },
          { id:43114, name:'Avalanche', nativeCurrency:{name:'AVAX',symbol:'AVAX',decimals:18},   rpcUrls:{default:{http:['https://api.avax.network/ext/bc/C/rpc']}} },
        ];
        const adapter = new WagmiAdapter({ networks, projectId: PROJECT_ID });
        window.__nv_appkit__ = createAppKit({
          adapters:[adapter], networks, projectId:PROJECT_ID,
          metadata:{ name:'NexVault', description:'Universal multi-chain portfolio dashboard', url:window.location.origin, icons:[`${window.location.origin}/favicon.ico`] },
          themeMode:'dark',
          themeVariables:{ '--w3m-accent':'#00d4aa', '--w3m-border-radius-master':'16px', '--w3m-font-family':'Inter,sans-serif' }
        });
        window.__nv_appkit__.subscribeState?.((state) => {
          if (state?.open === false && Store.mode === 'connecting') {
            const addr = window.__nv_appkit__.getAddress?.();
            if (addr) onConnected({ address: addr, family: 'evm', walletId: 'walletconnect', walletName: 'WalletConnect' });
            else { Store.mode = 'idle'; setStatus('Cancelled.', 'error'); }
          }
        });
      }
      window.__nv_appkit__.open({ view:'Connect' });
      // Polling fallback
      let t = 0;
      const poll = setInterval(() => {
        t++;
        const addr = window.__nv_appkit__.getAddress?.();
        if (addr && Store.mode === 'connecting') { clearInterval(poll); onConnected({ address: addr, family: 'evm', walletId: 'walletconnect', walletName: 'WalletConnect' }); }
        if (t > 90) { clearInterval(poll); if (Store.mode === 'connecting') { Store.mode = 'idle'; setStatus('Timed out.', 'error'); } }
      }, 1000);
    } catch (err) {
      setStatus(err?.message || 'WalletConnect failed.', 'error');
      toast(err?.message || 'WalletConnect failed.', 'error');
      Store.mode = 'error';
    }
  }

  /* ── CONNECT: TRON ───────────────────────────────────────────── */
  async function connectTron() {
    const tron = window.tronLink || window.tronWeb;
    if (!tron) { toast('TronLink not installed.', 'error'); return; }
    setStatus('Connecting TronLink\u2026', 'pending'); Store.mode = 'connecting';
    try {
      await tron.request?.({ method: 'tron_requestAccounts' });
      const address = tron.tronWeb?.defaultAddress?.base58 || tron.defaultAddress?.base58;
      if (!address) throw new Error('No TRON address');
      onConnected({ address, family: 'tron', walletId: 'tronlink', walletName: 'TronLink' });
    } catch (err) { setStatus(err.message, 'error'); toast(err.message, 'error'); Store.mode = 'error'; }
  }

  /* ── DISPATCHER ──────────────────────────────────────────────── */
  function connectWallet(walletId, family) {
    if (walletId === 'walletconnect') { connectWC(family); return; }
    switch (family) {
      case 'evm':     eip6963.has(walletId) ? connectEIP6963(walletId) : connectLegacy(walletId); break;
      case 'solana':  connectSolana(walletId);  break;
      case 'bitcoin': connectBitcoin(walletId); break;
      case 'tron':    connectTron(); break;
      default:        connectWC(family);
    }
  }

  /* ── ON CONNECTED ────────────────────────────────────────────── */
  function onConnected({ address, family, walletId, walletName, chainId }) {
    Store.address    = address;
    Store.family     = family;
    Store.walletId   = walletId;
    Store.walletName = walletName || walletId;
    Store.mode       = 'connected';

    if (window.AppState) {
      window.AppState.connected = true;
      window.AppState.address   = address;
      window.AppState.family    = family;
      window.AppState.wallet    = walletName || walletId;
      window.AppState.chain     = chainId || null;
      window.AppState.mode      = 'live';
    }

    closeWalletModal();
    syncBtns(address);
    setStatus('Connected \u2713', 'success');
    toast(`${walletName || 'Wallet'} connected: ${short(address)}`, 'success');

    if (typeof window.updateWalletUI   === 'function') window.updateWalletUI();
    if (typeof window.hydratePortfolio === 'function') window.hydratePortfolio();

    document.dispatchEvent(new CustomEvent('nexvault:connected', { detail: { address, family, walletId, walletName } }));
  }

  /* ── DISCONNECT ──────────────────────────────────────────────── */
  function handleDisconnect() {
    window.__nv_appkit__?.disconnect?.();
    Object.assign(Store, { address:null, family:null, walletId:null, walletName:null, provider:null, mode:'idle' });
    if (window.AppState) Object.assign(window.AppState, { connected:false, address:null, family:null, wallet:null, mode:'disconnected', portfolio:null, balances:[], transactions:[], nfts:[] });
    syncBtns(null);
    if (typeof window.updateWalletUI   === 'function') window.updateWalletUI();
    if (typeof window.hydratePortfolio === 'function') window.hydratePortfolio();
    toast('Wallet disconnected.', 'info');
    document.dispatchEvent(new CustomEvent('nexvault:disconnected'));
  }

  function syncBtns(address) {
    $('[data-wallet-trigger]').forEach((btn) => {
      if (address) { btn.textContent = short(address); btn.classList.add('connected'); }
      else { btn.innerHTML = '<span aria-hidden="true">&#x2B21;</span> Connect Wallet'; btn.classList.remove('connected'); }
    });
  }

  /* ── RENDER WALLET GRID ──────────────────────────────────────── */
  function renderWalletGrid(family) {
    const grid = byId('walletGrid');
    if (!grid) return;

    const base = FAMILY_MAP[family] || EVM_WALLETS;
    let list   = base.map(w => ({ ...w }));

    // Mark EIP-6963 detected wallets
    if (family === 'evm') {
      eip6963.forEach(({ info }) => {
        const idx = list.findIndex(w => w.id === info.rdns);
        if (idx >= 0) { list[idx].detected = true; list[idx].icon = info.icon; }
        else list.unshift({ id: info.rdns, name: info.name, abbr: info.name.slice(0,2).toUpperCase(), accent: '#fff', detected: true, icon: info.icon });
      });
      // Sort: detected first
      list.sort((a, b) => (b.detected ? 1 : 0) - (a.detected ? 1 : 0));
    }

    // Render detected / installed wallets section
    const detected = list.filter(w => w.detected);
    const rest     = list.filter(w => !w.detected);

    const renderBtn = (w) => {
      const iconHtml = w.icon
        ? `<img src="${w.icon}" alt="" width="26" height="26" style="border-radius:7px;object-fit:contain;">`
        : `<span style="font-size:11px;font-weight:800;color:${w.accent};letter-spacing:-0.5px;">${w.abbr || '?'}</span>`;
      return `<button type="button" class="nv-wallet-btn${w.detected ? ' installed' : ''}" data-wallet-id="${w.id}" data-wallet-family="${family}" aria-label="Connect ${w.name}">
        <span class="nv-wallet-icon" style="background:${w.accent}18;border:1px solid ${w.accent}28;">${iconHtml}</span>
        <span class="nv-wallet-meta"><strong>${w.name}</strong>${w.detected ? '<span class="nv-badge">Detected</span>' : ''}</span>
        <svg class="nv-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>`;
    };

    // WalletConnect — always primary, full-width, at top
    const wcBtn = `<button type="button" class="nv-wallet-btn nv-wc-primary" data-wallet-id="walletconnect" data-wallet-family="${family}" aria-label="Connect via WalletConnect">
      <span class="nv-wallet-icon" style="background:#3B99FC18;border:1px solid #3B99FC28;">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M9.58 12.25c3.54-3.47 9.28-3.47 12.82 0l.43.42a.44.44 0 0 1 0 .63l-1.46 1.43a.23.23 0 0 1-.32 0l-.59-.57c-2.47-2.42-6.47-2.42-8.94 0l-.63.62a.23.23 0 0 1-.32 0L9.11 13.3a.44.44 0 0 1 0-.63l.47-.42Zm15.82 2.95 1.3 1.27a.44.44 0 0 1 0 .63l-5.85 5.73a.46.46 0 0 1-.64 0l-4.15-4.07a.12.12 0 0 0-.16 0l-4.15 4.07a.46.46 0 0 1-.64 0L5.28 17.1a.44.44 0 0 1 0-.63l1.3-1.27a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0Z" fill="#3B99FC"/>
        </svg>
      </span>
      <span class="nv-wallet-meta"><strong>WalletConnect</strong><span class="nv-badge" style="color:#3B99FC;">400+ wallets · QR · Mobile</span></span>
      <svg class="nv-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;

    let html = '';

    if (detected.length) {
      html += `<div class="nv-section-label">Detected in this browser</div>
               <div class="nv-grid-detected">${detected.map(renderBtn).join('')}</div>`;
    }
    html += `<div class="nv-section-label" style="margin-top:${detected.length ? 14 : 0}px;">Connect via</div>${wcBtn}`;

    if (rest.length) {
      html += `<div class="nv-section-label" style="margin-top:14px;">Other options</div>
               <div class="nv-grid">${rest.map(renderBtn).join('')}</div>`;
    }

    grid.innerHTML = html;
    grid.querySelectorAll('.nv-wallet-btn').forEach(btn => {
      btn.addEventListener('click', () => connectWallet(btn.dataset.walletId, btn.dataset.walletFamily));
    });
  }

  /* ── FAMILY TABS ─────────────────────────────────────────────── */
  function initFamilyTabs() {
    const container = document.querySelector('.wallet-family-tabs');
    if (!container) return;
    const tabs = [...container.querySelectorAll('[data-wallet-family]')];
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        tab.classList.add('active'); tab.setAttribute('aria-selected','true');
        renderWalletGrid(tab.dataset.walletFamily);
      });
    });
  }

  /* ── MODAL ───────────────────────────────────────────────────── */
  function openWalletModal() {
    if (typeof window.openModal === 'function') window.openModal('walletModal');
    else { const m = byId('walletModal'); if (m) { m.classList.add('open'); document.body.classList.add('modal-open'); } }
    // Reset to EVM tab
    const container = document.querySelector('.wallet-family-tabs');
    if (container) {
      const tabs = [...container.querySelectorAll('[data-wallet-family]')];
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      const evm = container.querySelector('[data-wallet-family="evm"]');
      if (evm) { evm.classList.add('active'); evm.setAttribute('aria-selected','true'); }
    }
    renderWalletGrid('evm');
    initFamilyTabs();
    setStatus('Select a wallet to continue', 'neutral');
  }

  function closeWalletModal() {
    if (typeof window.closeModal === 'function') window.closeModal('walletModal');
    else { const m = byId('walletModal'); if (m) { m.classList.remove('open'); document.body.classList.remove('modal-open'); } }
  }

  /* ── TRIGGER INIT ────────────────────────────────────────────── */
  function initTriggers() {
    $('[data-wallet-trigger]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (Store.mode === 'connected') {
          if (window.confirm(`Disconnect ${Store.walletName || 'wallet'}?`)) handleDisconnect();
          return;
        }
        openWalletModal();
      });
    });
    $('[data-wallet-disconnect]').forEach(btn => btn.addEventListener('click', handleDisconnect));
  }

  /* ── AUTO-RECONNECT ──────────────────────────────────────────── */
  async function tryAutoReconnect() {
    if (!window.ethereum) return;
    try {
      const accs = await window.ethereum.request({ method: 'eth_accounts' });
      if (accs?.[0] && Store.mode === 'idle') {
        Store.mode = 'connected';
        onConnected({ address: accs[0], family: 'evm', walletId: 'injected', walletName: 'Browser Wallet' });
      }
    } catch (_) {}
  }

  /* ── STYLES ──────────────────────────────────────────────────── */
  function injectStyles() {
    if (byId('__nv_ws')) return;
    const s = document.createElement('style');
    s.id = '__nv_ws';
    s.textContent = `
      .nv-section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: rgba(235,242,255,0.3);
        padding: 0 2px 6px;
        margin-top: 4px;
      }
      .nv-grid-detected, .nv-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }
      .nv-wc-primary {
        grid-column: 1 / -1;
        background: rgba(59,153,252,0.06) !important;
        border-color: rgba(59,153,252,0.2) !important;
      }
      .nv-wc-primary:hover { background: rgba(59,153,252,0.1) !important; }
      @media (max-width:480px) { .nv-grid-detected, .nv-grid { grid-template-columns:1fr; } }
      .nv-wallet-btn {
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 11px 13px; border-radius: 16px;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
        color: rgba(235,242,255,0.88); font-size: 14px; font-weight: 500;
        cursor: pointer; text-align: left; font-family: inherit;
        transition: background 150ms ease, border-color 150ms ease, transform 120ms ease;
      }
      .nv-wallet-btn:hover  { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.14); transform:translateY(-1px); }
      .nv-wallet-btn:active { transform:scale(0.97); }
      .nv-wallet-btn.installed { border-color:rgba(0,212,170,0.25); background:rgba(0,212,170,0.04); }
      .nv-wallet-icon { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:12px; flex-shrink:0; }
      .nv-wallet-meta { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
      .nv-wallet-meta strong { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .nv-badge { font-size:11px; font-weight:500; color:#00d4aa; }
      .nv-arrow { color:rgba(235,242,255,0.18); flex-shrink:0; margi