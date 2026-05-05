// NexVault Dark — wallet.js

const WalletManager = {
  connected: false,
  wallet: null,
  address: null,
  chain: 'ethereum',

  FAKE_ADDRESSES: {
    metamask:    '0x3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    phantom:     '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    ledger:      '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    walletconnect:'0xd3CdA913deB6f4967b2Ef3aa68f5A843f12d3bE',
    rabby:       '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    coinbase:    '0xabcdef1234567890abcdef1234567890abcdef12',
    trust:       '0x1234abcD5678EF90abcdef1234567890abcdef56',
    okx:         '0xDeadBeef1234567890AbCdEF1234567890aBcDeF',
  },

  connect(walletId) {
    const spinner = document.getElementById('wallet-connect-spinner');
    const grid    = document.getElementById('wallet-grid-modal');
    if(spinner) spinner.style.display = 'block';
    if(grid)    grid.style.display    = 'none';

    setTimeout(() => {
      this.connected = true;
      this.wallet    = walletId;
      this.address   = this.FAKE_ADDRESSES[walletId] || '0x' + Math.random().toString(16).slice(2,42);

      if(spinner) spinner.style.display = 'none';
      if(grid)    grid.style.display    = 'grid';

      closeModal('wallet-connect');
      this.onConnect();
    }, 1800);
  },

  disconnect() {
    this.connected = false;
    this.wallet    = null;
    this.address   = null;
    this.onDisconnect();
  },

  onConnect() {
    const short = this.address.length > 16
      ? this.address.slice(0,6) + '...' + this.address.slice(-4)
      : this.address;

    // Update topbar wallet display
    const tw = document.getElementById('topbar-wallet');
    if(tw) {
      tw.style.display = 'flex';
      const dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;animation:glowPulse 2s infinite;';
      tw.innerHTML = '';
      tw.appendChild(dot);
      const txt = document.createElement('span');
      txt.textContent = short;
      txt.style.fontFamily = 'var(--font-mono)';
      tw.appendChild(txt);
      const disc = document.createElement('button');
      disc.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      disc.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-3);display:flex;align-items:center;padding:0;';
      disc.onclick = () => WalletManager.disconnect();
      tw.appendChild(disc);
    }

    // Update connect btn text
    const btnText = document.querySelector('.connect-btn-text');
    if(btnText) btnText.textContent = short;

    Toast.success(`⚡ ${this.wallet} connected!`);
    App.connected = true;
    App.wallet = this;
  },

  onDisconnect() {
    const tw = document.getElementById('topbar-wallet');
    if(tw) tw.style.display = 'none';
    const btnText = document.querySelector('.connect-btn-text');
    if(btnText) btnText.textContent = 'Connect Wallet';
    Toast.warn('Wallet disconnected');
    App.connected = false;
    App.wallet = null;
  },
};
