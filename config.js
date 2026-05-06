// NexVault Dark — Central Configuration

const CONFIG = {
  APP_NAME: 'NexVault',
  VERSION: '2.0.0',
  THEME: 'dark',
  CURRENCY: 'USD',
  REFRESH_INTERVAL: 30000,

  CHAINS: [
    { id: 'ethereum',  name: 'Ethereum',  symbol: 'ETH',   color: '#627EEA', rpc: 'https://eth.llamarpc.com',             explorer: 'https://etherscan.io',         chainId: 1 },
    { id: 'solana',    name: 'Solana',    symbol: 'SOL',   color: '#14F195', rpc: 'https://api.mainnet-beta.solana.com', explorer: 'https://solscan.io',            chainId: null },
    { id: 'polygon',   name: 'Polygon',   symbol: 'MATIC', color: '#8247E5', rpc: 'https://polygon-rpc.com',             explorer: 'https://polygonscan.com',       chainId: 137 },
    { id: 'bnb',       name: 'BNB Chain', symbol: 'BNB',   color: '#F7931A', rpc: 'https://bsc-dataseed.binance.org',    explorer: 'https://bscscan.com',           chainId: 56 },
    { id: 'arbitrum',  name: 'Arbitrum',  symbol: 'ARB',   color: '#28A0F0', rpc: 'https://arb1.arbitrum.io/rpc',        explorer: 'https://arbiscan.io',           chainId: 42161 },
    { id: 'optimism',  name: 'Optimism',  symbol: 'OP',    color: '#FF0420', rpc: 'https://mainnet.optimism.io',         explorer: 'https://optimistic.etherscan.io', chainId: 10 },
    { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX',  color: '#E84142', rpc: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io',         chainId: 43114 },
    { id: 'base',      name: 'Base',      symbol: 'ETH',   color: '#0052FF', rpc: 'https://mainnet.base.org',            explorer: 'https://basescan.org',          chainId: 8453 },
    { id: 'fantom',    name: 'Fantom',    symbol: 'FTM',   color: '#1969FF', rpc: 'https://rpc.ftm.tools',               explorer: 'https://ftmscan.com',           chainId: 250 },
    { id: 'zksync',    name: 'zkSync',    symbol: 'ETH',   color: '#4E529A', rpc: 'https://mainnet.era.zksync.io',       explorer: 'https://explorer.zksync.io',    chainId: 324 },
  ],

  WALLETS: [
    { id: 'metamask',     name: 'MetaMask',     sub: 'Browser Extension', chains: ['ethereum','polygon','bnb','arbitrum','optimism','avalanche','base','fantom','zksync'], icon: '🦊' },
    { id: 'phantom',      name: 'Phantom',      sub: 'Solana & EVM',      chains: ['solana','ethereum'], icon: '👻' },
    { id: 'ledger',       name: 'Ledger',       sub: 'Hardware Wallet',   chains: ['ethereum','solana','polygon','bnb','bitcoin'], icon: '🔒' },
    { id: 'walletconnect',name: 'WalletConnect',sub: 'QR Code Scan',      chains: ['ethereum','polygon','bnb','arbitrum','optimism','avalanche','base'], icon: '🔗' },
    { id: 'coinbase',     name: 'Coinbase Wallet',sub: 'Mobile & Extension',chains: ['ethereum','polygon','solana','base'], icon: '🔵' },
    { id: 'trust',        name: 'Trust Wallet', sub: 'Mobile Wallet',     chains: ['ethereum','bnb','polygon','solana','avalanche'], icon: '🛡️' },
    { id: 'okx',          name: 'OKX Wallet',   sub: 'Multi-chain',       chains: ['ethereum','solana','polygon','bnb','arbitrum','optimism'], icon: '⭕' },
    { id: 'rainbow',      name: 'Rainbow',      sub: 'Ethereum Focused',  chains: ['ethereum','polygon','arbitrum','optimism','base'], icon: '🌈' },
  ],

  DEMO_WALLET: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    ens: 'vitalik.eth',
    chain: 'ethereum',
    label: 'Demo Wallet (Vitalik.eth)',
  },

  TOKENS: {
    ethereum: [
      { symbol: 'ETH',  name: 'Ethereum',       decimals: 18, coingeckoId: 'ethereum' },
      { symbol: 'USDC', name: 'USD Coin',        decimals: 6,  coingeckoId: 'usd-coin',    contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { symbol: 'USDT', name: 'Tether',          decimals: 6,  coingeckoId: 'tether',      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8,  coingeckoId: 'wrapped-bitcoin', contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
      { symbol: 'LINK', name: 'Chainlink',       decimals: 18, coingeckoId: 'chainlink',   contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
      { symbol: 'UNI',  name: 'Uniswap',         decimals: 18, coingeckoId: 'uniswap',     contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    ],
    solana: [
      { symbol: 'SOL',  name: 'Solana',    decimals: 9, coingeckoId: 'solana' },
      { symbol: 'RAY',  name: 'Raydium',   decimals: 6, coingeckoId: 'raydium' },
      { symbol: 'JUP',  name: 'Jupiter',   decimals: 6, coingeckoId: 'jupiter-exchange-solana' },
      { symbol: 'BONK', name: 'Bonk',      decimals: 5, coingeckoId: 'bonk' },
    ],
    bnb: [
      { symbol: 'BNB',  name: 'BNB',       decimals: 18, coingeckoId: 'binancecoin' },
      { symbol: 'CAKE', name: 'PancakeSwap',decimals: 18, coingeckoId: 'pancakeswap-token', contract: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' },
    ],
  },

  GAS: {
    ethereum:  { slow: 10, standard: 15, fast: 25, unit: 'Gwei' },
    polygon:   { slow: 30, standard: 50, fast: 80, unit: 'Gwei' },
    bnb:       { slow: 3,  standard: 5,  fast: 7,  unit: 'Gwei' },
    arbitrum:  { slow: 0.1,standard: 0.1,fast: 0.2,unit: 'Gwei' },
    optimism:  { slow: 0.001,standard:0.001,fast:0.002,unit:'Gwei'},
    avalanche: { slow: 25, standard: 27, fast: 30, unit: 'nAVAX' },
    base:      { slow: 0.001,standard:0.001,fast:0.002,unit:'Gwei'},
  },

  PORTFOLIO_TOTAL: 284719.40,
  PORTFOLIO_PNL_24H: 4.82,
  PORTFOLIO_PNL_7D: 12.35,
  WALLETS_COUNT: 3,
  CHAINS_ACTIVE: 12,

  API: {
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    MORALIS_BASE:   'https://deep-index.moralis.io/api/v2',
    ALCHEMY_ETH:    'https://eth-mainnet.g.alchemy.com/v2/',
    SOLANA_RPC:     'https://api.mainnet-beta.solana.com',
  },

  Format: {
    usd: (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pct: (n) => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%',
    addr: (a) => a ? a.slice(0, 6) + '...' + a.slice(-4) : '',
    num: (n) => Number(n).toLocaleString('en-US'),
    compact: (n) => {
      if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
      return '$' + n.toFixed(2);
    },
  },
};

if (typeof module !== 'undefined') module.exports = CONFIG;
