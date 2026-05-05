// NexVault Dark — Central Configuration
const CONFIG = {
  APP_NAME: 'NexVault',
  VERSION: '1.0.0',
  THEME: 'dark',
  CURRENCY: 'USD',
  REFRESH_INTERVAL: 30000,

  CHAINS: [
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627EEA', rpc: 'https://eth.llamarpc.com' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#14F195', rpc: 'https://api.mainnet-beta.solana.com' },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC', color: '#8247E5', rpc: 'https://polygon-rpc.com' },
    { id: 'bnb', name: 'BNB Chain', symbol: 'BNB', color: '#F7931A', rpc: 'https://bsc-dataseed.binance.org' },
    { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', rpc: 'https://arb1.arbitrum.io/rpc' },
  ],

  WALLETS: [
    { id: 'metamask', name: 'MetaMask', sub: 'Browser Extension', chains: ['ethereum','polygon','bnb','arbitrum'] },
    { id: 'phantom', name: 'Phantom', sub: 'Solana & EVM', chains: ['solana','ethereum'] },
    { id: 'ledger', name: 'Ledger', sub: 'Hardware Wallet', chains: ['ethereum','solana','polygon','bnb','arbitrum'] },
    { id: 'walletconnect', name: 'WalletConnect', sub: 'QR Code Scan', chains: ['ethereum','polygon','bnb','arbitrum'] },
    { id: 'rabby', name: 'Rabby', sub: 'Multi-chain Smart Wallet', chains: ['ethereum','polygon','bnb','arbitrum'] },
    { id: 'coinbase', name: 'Coinbase Wallet', sub: 'Mobile & Extension', chains: ['ethereum','polygon','bnb'] },
    { id: 'trust', name: 'Trust Wallet', sub: 'Mobile Wallet', chains: ['ethereum','solana','bnb','polygon'] },
    { id: 'okx', name: 'OKX Wallet', sub: 'Multi-chain', chains: ['ethereum','solana','polygon','bnb','arbitrum'] },
  ],

  DEMO_WALLET: {
    address: '0x3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    shortAddress: '0x3FZb...5c5',
    balance: 156420.69,
    pnl: 12.4,
    chain: 'ethereum'
  },

  TOKENS: [
    { symbol:'ETH', name:'Ethereum', price:3847.20, change:2.4, balance:4.28, value:16466.02, chain:'ethereum', color:'#627EEA' },
    { symbol:'BTC', name:'Bitcoin', price:67420.00, change:1.8, balance:0.185, value:12472.70, chain:'bitcoin', color:'#F7931A' },
    { symbol:'SOL', name:'Solana', price:185.40, change:-1.2, balance:19.5, value:3615.30, chain:'solana', color:'#14F195' },
    { symbol:'MATIC', name:'Polygon', price:1.24, change:3.7, balance:2841, value:3522.84, chain:'polygon', color:'#8247E5' },
    { symbol:'ARB', name:'Arbitrum', price:1.89, change:5.2, balance:892, value:1685.88, chain:'arbitrum', color:'#28A0F0' },
    { symbol:'LINK', name:'Chainlink', price:18.90, change:4.1, balance:75, value:1417.50, chain:'ethereum', color:'#375BD2' },
    { symbol:'UNI', name:'Uniswap', price:12.40, change:-2.1, balance:88, value:1091.20, chain:'ethereum', color:'#FF007A' },
    { symbol:'AAVE', name:'Aave', price:142.80, change:6.8, balance:6.2, value:885.36, chain:'ethereum', color:'#B6509E' },
    { symbol:'BNB', name:'BNB', price:624.50, change:0.9, balance:1.2, value:749.40, chain:'bnb', color:'#F0B90B' },
    { symbol:'USDC', name:'USD Coin', price:1.00, change:0.0, balance:2450, value:2450.00, chain:'ethereum', color:'#2775CA' },
    { symbol:'USDT', name:'Tether', price:1.00, change:0.01, balance:890, value:890.00, chain:'ethereum', color:'#26A17B' },
    { symbol:'PEPE', name:'Pepe', price:0.0000142, change:18.4, balance:48000000, value:681.60, chain:'ethereum', color:'#4CAF50' },
  ],

  GAS: { standard: 18, fast: 24, instant: 35 },

  PORTFOLIO_TOTAL: 156420.69,
  PORTFOLIO_PNL_24H: 2.4,
  PORTFOLIO_PNL_7D: 8.7,
};

const Format = {
  currency: (v, decimals=2) => {
    if(Math.abs(v) >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
    if(Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
    if(Math.abs(v) >= 1e3) return '$' + (v/1e3).toFixed(2) + 'K';
    return '$' + v.toFixed(decimals);
  },
  compact: (v) => {
    if(Math.abs(v) >= 1e9) return (v/1e9).toFixed(1) + 'B';
    if(Math.abs(v) >= 1e6) return (v/1e6).toFixed(1) + 'M';
    if(Math.abs(v) >= 1e3) return (v/1e3).toFixed(1) + 'K';
    return v.toFixed(0);
  },
  pct: (v, plus=true) => (plus && v > 0 ? '+' : '') + v.toFixed(2) + '%',
  address: (addr) => addr.slice(0,6) + '...' + addr.slice(-4),
  hash: (h) => h.slice(0,10) + '...' + h.slice(-6),
  date: (d) => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
  time: (d) => new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
};
