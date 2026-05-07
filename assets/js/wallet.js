(function () {
  'use strict';

  /* ================================================================
     NEXVAULT WALLET — Production Grade
     Strategy:
       1. EIP-6963  → auto-detect ALL installed browser wallets
       2. EIP-1193  → legacy window.ethereum fallback
       3. Solana    → Phantom / Solflare / Backpack (window.*)
       4. Reown AppKit / WalletConnect → 400+ mobile wallets via QR
  ================================================================ */

  const cfg        = window.NEXVAULT_CONFIG || {};
  const wCfg       = cfg.providers?.wallet || {};
  const PROJECT_ID = wCfg.projectId || '';

  /* ── STATE ────────────────────────────────────────────────────── */
  const Store = {
    address  : null,
    family   : null,
    walletId : null,
    walletName: null,
    provider : null,
    mode     : 'idle'   // idle | connecting | connected | error
  };

  /* ── EIP-6963 PROVIDER REGISTRY ──────────────────────────────── */
  const eip6963Providers = new Map(); // rdns → { info, provider }

  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = event.detail;
    if (info?.rdns) {
      eip6963Providers.set(info.rdns, { info, provider });
      const activeTab = document.querySelector('#walletFamilyTabs .active');
      if (!activeTab || activeTab.dataset.walletFamily === 'evm') {
        renderWalletGrid('evm');
      }
    }
  });

  window.dispatchEvent(new Event('eip6963:requestProvider'));

  /* ── KNOWN WALLET METADATA ────────────────────────────────────── */
  const KNOWN_EVM_WALLETS = [
    { id: 'io.metamask',          name: 'MetaMask',        icon: 'MM',  accent: '#F6851B', legacy: 'isMetaMask' },
    { id: 'io.rabby',             name: 'Rabby',            icon: 'RB',  accent: '#8697FF', legacy: 'isRabby' },
    { id: 'com.coinbase.wallet',  name: 'Coinbase Wallet',  icon: 'CB',  accent: '#0052FF', legacy: 'isCoinbaseWallet' },
    { id: 'com.okex.wallet',      name: 'OKX Wallet',       icon: 'OKX', accent: '#000000', legacy: 'isOKExWallet' },
    { id: 'com.brave.wallet',     name: 'Brave Wallet',     icon: 'BR',  accent: '#FB542B', legacy: 'isBraveWallet' },
    { id: 'com.trustwallet.app',  name: 'Trust Wallet',     icon: 'TW',  accent: '#3375BB', legacy: 'isTrust' },
    { id: 'xyz.frame',            name: 'Frame',            icon: 'FR',  accent: '#00D17D', legacy: null },
    { id: 'io.zerion.wallet',     name: 'Zerion',           icon: 'ZR',  accent: '#2962EF', legacy: 'isZerion' },
    { id: 'app.enkrypt',          name: 'Enkrypt',          icon: 'EN',  accent: '#9B67FF', legacy: 'isEnkrypt' },
    { id: 'com.binance',          name: 'Binance Web3',     icon: 'BNB', accent: '#F0B90B', legacy: null },
    { id: 'io.1inch.wallet',      name: '1inch Wallet',     icon: '1',   accent: '#1B314F', legacy: null },
    { id: 'com.ledger',           name: 'Ledger Live',      icon: 'LD',  accent: '#142533', legacy: null },
    { id: 'walletconnect',        name: 'WalletConnect',    icon: 'WC',  accent: '#3B99FC', isWC: true },
  ];

  const KNOWN_SOLANA_WALLETS = [
    { id: 'phantom',       name: 'Phantom',       icon: 'PH', accent: '#AB9FF2' },
    { id: 'solflare',      name: 'Solflare',      icon: 'SF', accent: '#FCB045' },
    { id: 'backpack',      name: 'Backpack',      icon: 'BP', accent: '#E33E3F' },
    { id: 'walletconnect', name: 'WalletConnect', icon: 'WC', accent: '#3B99FC', isWC: true },
  ];

  const KNOWN_BITCOIN_WALLETS = [
    { id: 'xverse',        name: 'Xverse',        icon: 'XV', accent: '#7223D5' },
    { id: 'unisat',        name: 'UniSat',        icon: 'US', accent: '#F7931A' },
    { id: 'leather',       name: 'Leather',       icon: 'LT', accent: '#FF5500' },
    { id: 'walletconnect', name: 'WalletConnect', icon: 'WC', accent: '#3B99FC', isWC: true },
  ];

  const KNOWN_TRON_WALLETS = [
    { id: 'tronlink',      name: 'TronLink',      icon: 'TL', accent: '#FF0013' },
    { id: 'walletconnect', name: 'WalletConnect', icon: 'WC', accent: '#3B99FC', isWC: true },
  ];

  const KNOWN_TON_WALLETS = [
    { id: 'tonkeeper',     name: 'TON Keeper',    icon: 'TK', accent: '#0098EA' },
    { id: 'mytonwallet',   name: 'MyTonWallet',   icon: 'MT', accent: '#0088CC' },
    { id: 'walletconnect', name: 'WalletConnect', icon: 'WC', accent: '#3B99FC', isWC: true },
  ];

  const FAMILY_WALLETS = {
    evm    : KNOWN_EVM_WALLETS,
    solana : KNOWN_SOLANA_WALLETS,
    bitcoin: KNOWN_BITCOIN_WALLETS,
    tron   : KNOWN_TRON_WALLETS,
    ton    : KNOWN_TON_WALLETS,
  };

  /* ── HELPERS ──────────────────────────────────────────────────── */
  function byId(id) { return document.getElementById(id); }
  function qsa(sel) { return [...document.querySelectorAll(sel)]; }

  function setStatus(text, tone) {
    const el = byId('walletConnectStatus');
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone || 'neutral';
  }

  function toast(msg, type) {
    if (window.Toast) window.Toast[type]?.(msg) || window.Toast.info?.(msg);
  }

  function shortAddr(addr) {
    if (!addr) return '';
    return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
  }

  /* ── EIP-6963 CONNECT ─────────────────────────────────────────── */
  async function connectEIP6963(rdns) {
    const entry = eip6963Providers.get(rdns);
    if (!entry) return connectLegacyInjected(rdns);

    setStatus(`Connecting ${entry.info.name}…`, 'pending');
    Store.mode = 'connecting';

    try {
      const accounts = await entry.provider.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No accounts returned');

      const chainHex = await entry.provider.request({ method: 'eth_chainId' });

      Store.provider  = entry.provider;
      Store.walletId  = rdns;
      Store.walletName = entry.info.name;

      onConnected({
        address   : accounts[0],
        family    : 'evm',
        walletId  : rdns,
        walletName: entry.info.name,
        chainId   : parseInt(chainHex, 16)
      });

      entry.provider.on?.('accountsChanged', (accs) => {
        if (accs?.[0]) onConnected({ address: accs[0], family: 'evm', walletId: rdns, walletName: entry.info.name });
        else handleDisconnect();
      });
      entry.provider.on?.('chainChanged', () => window.location.reload());

    } catch (err) {
      const msg = err.code === 4001 ? 'Rejected by user.' : (err.message || 'Connection failed.');
      setStatus(msg, 'error');
      toast(msg, 'error');
      Store.mode = 'error';
    }
  }

  /* ── LEGACY EIP-1193 FALLBACK ─────────────────────────────────── */
  async function connectLegacyInjected(walletId) {
    const eth = window.ethereum;
    if (!eth) {
      const name = KNOWN_EVM_WALLETS.find(w => w.id === walletId)?.name || walletId;
      toast(`${name} not installed. Please install the extension.`, 'error');
      setStatus('Wallet extension not found.', 'error');
      return;
    }

    setStatus('Requesting accounts…', 'pending');
    Store.mode = 'connecting';

    try {
      let provider = eth;
      if (eth.providers?.length) {
        const meta = KNOWN_EVM_WALLETS.find(w => w.id === walletId);
        if (meta?.legacy) {
          const match = eth.providers.find(p => p[meta.legacy]);
          if (match) provider = match;
        }
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No accounts returned');

      const chainHex = await provider.request({ method: 'eth_chainId' });
      const wName = KNOWN_EVM_WALLETS.find(w => w.id === walletId)?.name || walletId;

      Store.provider   = provider;
      Store.walletId   = walletId;
      Store.walletName = wName;

      onConnected({ address: accounts[0], family: 'evm', walletId, walletName: wName, chainId: parseInt(chainHex, 16) });

      provider.on?.('accountsChanged', (accs) => {
        if (accs?.[0]) onConnected({ address: accs[0], family: 'evm', walletId, walletName: wName });
        else handleDisconnect();
      });
      provider.on?.('chainChanged', () => window.location.reload());

    } catch (err) {
      const msg = err.code === 4001 ? 'Rejected by user.' : (err.message || 'Connection failed.');
      setStatus(msg, 'error');
      toast(msg, 'error');
      Store.mode = 'error';
    }
  }

  /* ── SOLANA CONNECT ───────────────────────────────────────────── */
  async function connectSolana(walletId) {
    const providerFns = {
      phantom : () => window.phantom?.solana || window.solana,
      solflare: () => window.solflare,
      backpack: () => window.xnft?.solana || window.backpack?.solana,
    };

    const sol = (providerFns[walletId] || (() => null))();
    if (!sol?.connect) {
      const name = KNOWN_SOLANA_WALLETS.find(w => w.id === walletId)?.name || walletId;
      toast(`${name} not installed.`, 'error');
      setStatus(`${name} not found.`, 'error');
      return;
    }

    setStatus(`Connecting ${walletId}…`, 'pending');
    Store.mode = 'connecting';

    try {
      const resp = await sol.connect();
      const address = resp?.publicKey?.toString() || sol.publicKey?.toString();
      if (!address) throw new Error('No public key returned');

      const wName = KNOWN_SOLANA_WALLETS.find(w => w.id === walletId)?.name || walletId;
      Store.provider   = sol;
      Store.walletId   = walletId;
      Store.walletName = wName;

      onConnected({ address, family: 'solana', walletId, walletName: wName });

      sol.on?.('disconnect', handleDisconnect);
      sol.on?.('accountChanged', (key) => {
        if (key) onConnected({ address: key.toString(), family: 'solana', walletId, walletName: wName });
        else handleDisconnect();
      });

    } catch (err) {
      setStatus(err.message || 'Solana connection failed.', 'error');
      toast(err.message || 'Solana connection failed.', 'error');
      Store.mode = 'error';
    }
  }

  /* ── BITCOIN CONNECT ──────────────────────────────────────────── */
  async function connectBitcoin(walletId) {
    const providerFns = {
      xverse : () => window.XverseProviders?.BitcoinProvider || window.BitcoinProvider,
      unisat : () => window.unisat,
      leather: () => window.LeatherProvider,
    };

    const prov = (providerFns[walletId] || (() => null))();
    if (!prov) {
      const name = KNOWN_BITCOIN_WALLETS.find(w => w.id === walletId)?.name || walletId;
      toast(`${name} not installed.`, 'error');
      setStatus(`${name} not found.`, 'error');
      return;
    }

    setStatus(`Connecting ${walletId}…`, 'pending');
    Store.mode = 'connecting';

    try {
      let address;
      if (walletId === 'unisat') {
        const accounts = await prov.requestAccounts();
        address = accounts?.[0];
      } else {
        const resp = await prov.request({ method: 'getAccounts' });
        address = resp?.addresses?.[0]?.address || resp?.[0]?.address;
      }
      if (!address) throw new Error('No address returned');

      const wName = KNOWN_BITCOIN_WALLETS.find(w => w.id === walletId)?.name || walletId;
      Store.provider   = prov;
      Store.walletId   = walletId;
      Store.walletName = wName;

      onConnected({ address, family: 'bitcoin', walletId, walletName: wName });

    } catch (err) {
      setStatus(err.message || 'Bitcoin connection failed.', 'error');
      toast(err.message, 'error');
      Store.mode = 'error';
    }
  }

  /* ── WALLETCONNECT / REOWN APPKIT ─────────────────────────────── */
  async function connectWalletConnect(family) {
    if (!PROJECT_ID || PROJECT_ID.length < 10) {
      toast('Add your Reown projectId to config.js', 'error');
      setStatus('projectId missing in config.js', 'error');
      return;
    }

    setStatus('Launching WalletConnect…', 'pending');
    Store.mode = 'connecting';

    try {
      if (!window.__nv_appkit__) {
        setStatus('Loading AppKit…', 'pending');
        const [{ createAppKit }, { WagmiAdapter }] = await Promise.all([
          import('https://esm.sh/@reown/appkit@1.6.8'),
          import('https://esm.sh/@reown/appkit-adapter-wagmi@1.6.8')
        ]);

        const networks = [
          { id: 1,     name: 'Ethereum', nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:['https://cloudflare-eth.com']}} },
          { id: 8453,  name: 'Base',     nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:['https://mainnet.base.org']}} },
          { id: 42161, name: 'Arbitrum', nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:['https://arb1.arbitrum.io/rpc']}} },
          { id: 10,    name: 'Optimism', nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:['https://mainnet.optimism.io']}} },
          { id: 137,   name: 'Polygon',  nativeCurrency:{name:'POL',symbol:'POL',decimals:18},   rpcUrls:{default:{http:['https://polygon-rpc.com']}} },
          { id: 56,    name: 'BNB Chain',nativeCurrency:{name:'BNB',symbol:'BNB',decimals:18},   rpcUrls:{default:{http:['https://bsc-dataseed.binance.org']}} },
          { id: 43114, name: 'Avalanche',nativeCurrency:{name:'AVAX',symbol:'AVAX',decimals:18}, rpcUrls:{default:{http:['https://api.avax.network/ext/bc/C/rpc']}} },
        ];

        const adapter = new WagmiAdapter({ networks, projectId: PROJECT_ID });
        window.__nv_appkit__ = createAppKit({
          adapters     : [adapter],
          networks,
          projectId    : PROJECT_ID,
          metadata     : {
            name       : 'NexVault',
            description: 'Universal multi-chain portfolio dashboard',
            url        : window.location.origin,
            icons      : [`${window.location.origin}/favicon.ico`]
          },
          themeMode    : 'dark',
          themeVariables: {
            '--w3m-accent'               : '#00d4aa',
            '--w3m-border-radius-master' : '16px',
            '--w3m-font-family'          : 'Inter, sans-serif',
          }
        });

        window.__nv_appkit__.subscribeState?.((state) => {
          if (state?.open === false && Store.mode === 'connecting') {
            const addr = window.__nv_appkit__.getAddress?.();
            if (addr) {
              Store.mode = 'connected';
              onConnected({ address: addr, family: 'evm', walletId: 'walletconnect', walletName: 'WalletConnect' });
            } else {
              Store.mode = 'idle';
              setStatus('Connection cancelled.', 'error');
            }
          }
        });
      }

      window.__nv_appkit__.open({ view: 'Connect' });

      // Polling fallback
      let ticks = 0;
      const poll = setInterval(() => {
        ticks++;
        const addr = window.__nv_appkit__.getAddress?.();
        if (addr && Store.mode === 'connecting') {
          clearInterval(poll);
          Store.mode = 'connected';
          onConnected({ address: addr, family: 'evm', walletId: 'walletconnect', walletName: 'WalletConnect' });
        }
        if (ticks > 90) {
          clearInterval(poll);
          if (Store.mode === 'connecting') {
            Store.mode = 'idle';
            setStatus('Timed out. Try again.', 'error');
          }
        }
      }, 1000);

    } catch (err) {
      console.error('[NexVault WC]', err);
      setStatus(err?.message || 'WalletConnect failed.', 'error');
      toast(err?.message || 'WalletConnect failed.', 'error');
      Store.mode = 'error';
    }
  }

  /* ── TRON CONNECT ─────────────────────────────────────────────── */
  async function connectTron(walletId) {
    if (walletId === 'tronlink') {
      const tron = window.tronLink || window.tronWeb;
      if (!tron) { toast('TronLink not installed.', 'error'); return; }
      setStatus('Connecting TronLink…', 'pending');
      Store.mode = 'connecting';
      try {
        await tron.request?.({ method: 'tron_requestAccounts' });
        const address = tron.tronWeb?.defaultAddress?.base58 || tron.defaultAddress?.base58;
        if (!address) throw new Error('No TRON address');
        onConnected({ address, family: 'tron', walletId, walletName: 'TronLink' });
      } catch (err) {
        setStatus(err.message, 'error');
        toast(err.message, 'error');
        Store.mode = 'error';
      }
      return;
    }
    connectWalletConnect('tron');
  }

  /* ── MASTER DISPATCHER ────────────────────────────────────────── */
  function connectWallet(walletId, family) {
    if (walletId === 'walletconnect') { connectWalletConnect(family); return; }
    switch (family) {
      case 'evm':
        eip6963Providers.has(walletId) ? connectEIP6963(walletId) : connectLegacyInjected(walletId);
        break;
      case 'solana':  connectSolana(walletId);  break;
      case 'bitcoin': connectBitcoin(walletId); break;
      case 'tron':    connectTron(walletId);    break;
      case 'ton':     connectWalletConnect('ton'); break;
      default:        connectWalletConnect(family);
    }
  }

  /* ── ON CONNECTED ─────────────────────────────────────────────── */
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
    syncButtonsUI(address);
    setStatus('Connected ✓', 'success');
    toast(`${walletName || 'Wallet'} connected: ${shortAddr(address)}`, 'success');

    if (typeof window.hydratePortfolio === 'function') window.hydratePortfolio();
    if (typeof window.updateWalletUI   === 'function') window.updateWalletUI();

    document.dispatchEvent(new CustomEvent('nexvault:connected', {
      detail: { address, family, walletId, walletName }
    }));
  }

  /* ── DISCONNECT ───────────────────────────────────────────────── */
  function handleDisconnect() {
    window.__nv_appkit__?.disconnect?.();
    Store.address = Store.family = Store.walletId = Store.walletName = Store.provider = null;
    Store.mode = 'idle';

    if (window.AppState) {
      window.AppState.connected = false;
      window.AppState.address   = null;
      window.AppState.family    = null;
      window.AppState.wallet    = null;
      window.AppState.mode      = 'demo';
    }

    syncButtonsUI(null);
    if (typeof window.updateWalletUI === 'function') window.updateWalletUI();
    toast('Wallet disconnected.', 'info');
    document.dispatchEvent(new CustomEvent('nexvault:disconnected'));
  }

  /* ── SYNC BUTTON TEXT ─────────────────────────────────────────── */
  function syncButtonsUI(address) {
    qsa('[data-wallet-trigger]').forEach((btn) => {
      if (address) {
        btn.textContent = shortAddr(address);
        btn.title       = 'Click to disconnect wallet';
        btn.classList.add('connected');
      } else {
        btn.innerHTML   = '<span aria-hidden="true">⬡</span> Connect Wallet';
        btn.title       = '';
        btn.classList.remove('connected');
      }
    });
  }

  /* ── RENDER WALLET GRID ───────────────────────────────────────── */
  function renderWalletGrid(family) {
    const grid = byId('walletGrid');
    if (!grid) return;

    const knownList = FAMILY_WALLETS[family] || KNOWN_EVM_WALLETS;
    let walletList  = [...knownList];

    if (family === 'evm' && eip6963Providers.size > 0) {
      const detected = [];
      eip6963Providers.forEach(({ info }) => {
        const alreadyKnown = knownList.some(w => w.id === info.rdns);
        if (!alreadyKnown) {
          detected.push({ id: info.rdns, name: info.name, icon: info.icon, accent: '#ffffff', detected: true });
        } else {
          const idx = walletList.findIndex(w => w.id === info.rdns);
          if (idx >= 0) walletList[idx] = { ...walletList[idx], installed: true, eip6963Icon: info.icon };
        }
      });
      walletList = [...detected, ...walletList];
    }

    grid.innerHTML = walletList.map((w) => {
      const isInstalled = family === 'evm' && (w.installed || w.detected || eip6963Providers.has(w.id));
      const src = w.eip6963Icon || (w.icon?.startsWith?.('data:') || w.icon?.startsWith?.('http') ? w.icon : null);
      const iconHtml = src
        ? `<img src="${src}" alt="${w.name}" width="26" height="26" style="border-radius:7px;object-fit:contain;" />`
        : w.id === 'walletconnect'
          ? `<svg width="24" height="24" viewBox="0 0 32 32" fill="none"><path d="M9.58 12.25c3.54-3.47 9.28-3.47 12.82 0l.43.42a.44.44 0 0 1 0 .63l-1.46 1.43a.23.23 0 0 1-.32 0l-.59-.57c-2.47-2.42-6.47-2.42-8.94 0l-.63.62a.23.23 0 0 1-.32 0L9.11 13.3a.44.44 0 0 1 0-.63l.47-.42Zm15.82 2.95 1.3 1.27a.44.44 0 0 1 0 .63l-5.85 5.73a.46.46 0 0 1-.64 0l-4.15-4.07a.12.12 0 0 0-.16 0l-4.15 4.07a.46.46 0 0 1-.64 0L5.28 17.1a.44.44 0 0 1 0-.63l1.3-1.27a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0l4.15 4.07c.04.04.12.04.16 0l4.15-4.07a.46.46 0 0 1 .64 0Z" fill="#3B99FC"/></svg>`
          : `<span style="font-size:11px;font-weight:800;color:${w.accent};letter-spacing:-0.5px;">${w.icon || '⬡'}</span>`;

      return `
        <button type="button" class="nv-wallet-btn${isInstalled ? ' installed' : ''}" data-wallet-id="${w.id}" data-wallet-family="${family}" aria-label="Connect with ${w.name}">
          <span class="nv-wallet-icon" style="background:${w.accent}18;border:1px solid ${w.accent}30;">${iconHtml}</span>
          <span class="nv-wallet-meta">
            <strong>${w.name}</strong>
            ${isInstalled ? '<span class="nv-installed-badge">Detected</span>' : ''}
          </span>
          <svg class="nv-wallet-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`;
    }).join('');

    grid.querySelectorAll('.nv-wallet-btn').forEach((btn) => {
      btn.addEventListener('click', () => connectWallet(btn.dataset.walletId, btn.dataset.walletFamily));
    });
  }

  /* ── FAMILY TABS ──────────────────────────────────────────────── */
  function initFamilyTabs() {
    const tabs = qsa('#walletFamilyTabs [data-wallet-family]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected','true');
        renderWalletGrid(tab.dataset.walletFamily);
      });
    });
  }

  /* ── MODAL ────────────────────────────────────────────────────── */
  function openWalletModal() {
    const modal = byId('walletModal');
    if (!modal) return;
    typeof window.openModal === 'function'
      ? window.openModal('walletModal')
      : (modal.classList.add('active'), document.body.style.overflow = 'hidden');

    // Reset to EVM tab
    const tabs = qsa('#walletFamilyTabs [data-wallet-family]');
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    const evmTab = document.querySelector('#walletFamilyTabs [data-wallet-family="evm"]');
    if (evmTab) { evmTab.classList.add('active'); evmTab.setAttribute('aria-selected','true'); }

    renderWalletGrid('evm');
    initFamilyTabs();
    setStatus('Select a wallet to continue', 'neutral');
  }

  function closeWalletModal() {
    const modal = byId('walletModal');
    if (!modal) return;
    typeof window.closeModal === 'function'
      ? window.closeModal('walletModal')
      : (modal.classList.remove('active'), document.body.style.overflow = '');
  }

  /* ── TRIGGER BUTTONS ──────────────────────────────────────────── */
  function initTriggers() {
    qsa('[data-wallet-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (Store.mode === 'connected') {
          if (window.confirm(`Disconnect ${Store.walletName || 'wallet'}?`)) handleDisconnect();
          return;
        }
        openWalletModal();
      });
    });
    qsa('[data-wallet-disconnect]').forEach((btn) => btn.addEventListener('click', handleDisconnect));
  }

  /* ── AUTO-RECONNECT ───────────────────────────────────────────── */
  async function tryAutoReconnect() {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts?.[0] && Store.mode === 'idle') {
        Store.mode = 'connected';
        onConnected({ address: accounts[0], family: 'evm', walletId: 'injected', walletName: 'Browser Wallet' });
      }
    } catch (_) {}
  }

  /* ── INJECT STYLES ────────────────────────────────────────────── */
  function injectStyles() {
    if (byId('__nv_wallet_styles')) return;
    const s = document.createElement('style');
    s.id = '__nv_wallet_styles';
    s.textContent = `
      #walletGrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        max-height: 440px;
        overflow-y: auto;
        padding: 2px 0 4px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      @media (max-width: 480px) { #walletGrid { grid-template-columns: 1fr; } }
      .nv-wallet-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 11px 12px;
        border-radius: 16px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        color: rgba(235,242,255,0.88);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 160ms ease, border-color 160ms ease, transform 140ms ease;
        text-align: left;
        font-family: inherit;
      }
      .nv-wallet-btn:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.15);
        transform: translateY(-1px);
      }
      .nv-wallet-btn:active { transform: scale(0.97); }
      .nv-wallet-btn.installed {
        border-color: rgba(0,212,170,0.28);
        background: rgba(0,212,170,0.05);
      }
      .nv-wallet-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        flex-shrink: 0;
      }
      .nv-wallet-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;
        flex: 1;
        min-width: 0;
      }
      .nv-wallet-meta strong {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nv-installed-badge {
        font-size: 11px;
        font-weight: 500;
        color: #00d4aa;
      }
      .nv-wallet-arrow {
        color: rgba(235,242,255,0.2);
        flex-shrink: 0;
        margin-left: auto;
      }
      #walletConnectStatus { padding: 10px 0 0; font-size: 13px; color: rgba(235,242,255,0.5); }
      #walletConnectStatus[data-tone="success"] { color: #00d4aa; }
      #walletConnectStatus[data-tone="error"]   { color: #ff6b6b; }
      #walletConnectStatus[data-tone="pending"] { color: rgba(235,242,255,0.5); }
      [data-wallet-trigger].connected {
        background: rgba(0,212,170,0.12) !important;
        border-color: rgba(0,212,170,0.3) !important;
        color: #a7ffd7 !important;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── INIT ─────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    initTriggers();
    byId('walletModal')?.addEventListener('click', (e) => { if (e.target === byId('walletModal')) closeWalletModal(); });
    tryAutoReconnect();
    // Re-request EIP-6963 — some wallets inject after DOMContentLoaded
    setTimeout(() => window.dispatchEvent(new Event('eip6963:requestProvider')), 100);
    setTimeout(() => window.dispatchEvent(new Event('eip6963:requestProvider')), 800);
  });

  /* ── PUBLIC API ───────────────────────────────────────────────── */
  window.NexVaultWallet = {
    connect     : connectWallet,
    disconnect  : handleDisconnect,
    openModal   : openWalletModal,
    closeModal  : closeWalletModal,
    isConnected : () => Store.mode === 'connected',
    getState    : () => ({ ...Store }),
    getAddress  : () => Store.address,
    getProviders: () => eip6963Providers,
  };

  window.openWalletModal  = openWalletModal;
  window.disconnectWallet = handleDisconnect;

})();
