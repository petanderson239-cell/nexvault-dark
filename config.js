window.NEXVAULT_CONFIG = {
  app: {
    name: "NexVault",
    edition: "Universal",
    version: "3.1.0",
    environment: "production",
    theme: "dark",
    defaultCurrency: "usd",
    refreshMs: 45000
  },

  features: {
    realWallets: true,
    realPrices: true,
    realPortfolio: true,
    realTransactions: true,
    realNFTs: true,
    publicPriceFallback: true,
    backendProxy: true,
    demoSeedData: false,
    explorerLinks: true,
    staleDataWarnings: true,
    trustIndicators: true
  },

  providers: {
    wallet: {
      primary: "walletconnect",
      projectId: "a785da105621eb55c998a35c57587667",
      metadata: {
        name: "NexVault",
        description: "Universal multi-chain portfolio intelligence platform",
        url: "https://nexvault-dark.vercel.app",
        icons: ["https://nexvault-dark.vercel.app/favicon.ico"]
      }
    },
    data: {
      primary: "goldrush",
      secondary: "zerion",
      mode: "backend-proxy",
      endpoints: {
        health: "/api/health",
        portfolio: "/api/portfolio",
        balances: "/api/balances",
        transactions: "/api/transactions",
        nfts: "/api/nfts",
        analytics: "/api/analytics"
      }
    },
    pricing: {
      primary: "coingecko",
      publicBase: "https://api.coingecko.com/api/v3",
      endpoints: {
        simplePrice: "/simple/price"
      },
      attribution: "Price data by CoinGecko"
    }
  },

  supportedAssets: {
    coingeckoIds: {
      ethereum: "ethereum",
      bitcoin: "bitcoin",
      solana: "solana",
      tether: "tether",
      usdCoin: "usd-coin",
      chainlink: "chainlink",
      arbitrum: "arbitrum",
      uniswap: "uniswap",
      avalanche: "avalanche-2",
      polygon: "matic-network",
      binancecoin: "binancecoin",
      toncoin: "the-open-network"
    }
  },

  chains: [
    { id: "ethereum",  family: "evm",     chainId: 1,      symbol: "ETH",  name: "Ethereum",  color: "#627EEA", enabled: true },
    { id: "base",      family: "evm",     chainId: 8453,   symbol: "ETH",  name: "Base",      color: "#0052FF", enabled: true },
    { id: "arbitrum",  family: "evm",     chainId: 42161,  symbol: "ETH",  name: "Arbitrum",  color: "#28A0F0", enabled: true },
    { id: "optimism",  family: "evm",     chainId: 10,     symbol: "ETH",  name: "Optimism",  color: "#FF0420", enabled: true },
    { id: "polygon",   family: "evm",     chainId: 137,    symbol: "POL",  name: "Polygon",   color: "#8247E5", enabled: true },
    { id: "bnb",       family: "evm",     chainId: 56,     symbol: "BNB",  name: "BNB Chain", color: "#F3BA2F", enabled: true },
    { id: "avalanche", family: "evm",     chainId: 43114,  symbol: "AVAX", name: "Avalanche", color: "#E84142", enabled: true },
    { id: "zksync",    family: "evm",     chainId: 324,    symbol: "ETH",  name: "zkSync",    color: "#8C8DFC", enabled: true },
    { id: "linea",     family: "evm",     chainId: 59144,  symbol: "ETH",  name: "Linea",     color: "#9BE3FF", enabled: true },
    { id: "solana",    family: "solana",  symbol: "SOL",   name: "Solana",  color: "#14F195", enabled: true },
    { id: "bitcoin",   family: "bitcoin", symbol: "BTC",   name: "Bitcoin", color: "#F7931A", enabled: true },
    { id: "tron",      family: "tron",    symbol: "TRX",   name: "TRON",    color: "#FF060A", enabled: true },
    { id: "ton",       family: "ton",     symbol: "TON",   name: "TON",     color: "#0098EA", enabled: true }
  ],

  trust: {
    readOnlyCopy: "Read-only portfolio access. NexVault never asks for your private keys.",
    badges: ["Read-only", "Non-custodial", "Live market data", "Multi-chain indexed"]
  },

  ui: {
    defaultFamily: "evm",
    defaultChain: "ethereum",
    explorerBase: {
      ethereum: "https://etherscan.io/address/",
      base: "https://basescan.org/address/",
      arbitrum: "https://arbiscan.io/address/",
      optimism: "https://optimistic.etherscan.io/address/",
      polygon: "https://polygonscan.com/address/",
      bnb: "https://bscscan.com/address/",
      avalanche: "https://snowtrace.io/address/",
      solana: "https://solscan.io/account/",
      bitcoin: "https://www.blockchain.com/explorer/addresses/btc/",
      tron: "https://tronscan.org/#/address/",
      ton: "https://tonviewer.com/"
    }
  }
};
