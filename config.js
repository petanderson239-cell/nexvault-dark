window.NEXVAULT_CONFIG = {
  app: {
    name: "NexVault",
    edition: "Universal",
    version: "3.0.0",
    environment: "hybrid",
    theme: "dark",
    defaultCurrency: "usd",
    refreshMs: 45000,
    lastUpdatedLabel: "Just now"
  },

  features: {
    realWallets: true,
    realPrices: true,
    realPortfolio: true,
    realTransactions: true,
    realNFTs: true,
    publicPriceFallback: true,
    backendProxy: true,
    demoSeedData: true,
    explorerLinks: true,
    staleDataWarnings: true,
    trustIndicators: true
  },

  providers: {
    wallet: {
      primary: "walletconnect",
      projectId: "REPLACE_WITH_WALLETCONNECT_PROJECT_ID",
      metadata: {
        name: "NexVault",
        description: "Universal multi-chain portfolio intelligence platform",
        url: "https://nexvault.app",
        icons: ["https://nexvault.app/icon.png"]
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
        analytics: "/api/analytics",
        tokenDetails: "/api/token-details",
        marketChart: "/api/market-chart",
        connectSession: "/api/connect-session"
      }
    },

    pricing: {
      primary: "coingecko",
      fallback: "backend",
      publicBase: "https://api.coingecko.com/api/v3",
      endpoints: {
        simplePrice: "/simple/price",
        tokenPriceByAddress: "/simple/token_price",
        markets: "/coins/markets",
        chart: "/coins"
      },
      attribution: "Price data by CoinGecko"
    }
  },

  chainFamilies: [
    {
      key: "evm",
      name: "EVM",
      icon: "⬡",
      walletStandard: "eip155",
      universal: true,
      description: "Ethereum-compatible chains via WalletConnect and injected wallets"
    },
    {
      key: "solana",
      name: "Solana",
      icon: "◎",
      walletStandard: "solana",
      universal: true,
      description: "Solana wallets and SPL assets"
    },
    {
      key: "bitcoin",
      name: "Bitcoin",
      icon: "₿",
      walletStandard: "bip122",
      universal: true,
      description: "Bitcoin wallets and BTC balances"
    },
    {
      key: "tron",
      name: "TRON",
      icon: "◉",
      walletStandard: "tron",
      universal: true,
      description: "TRON ecosystem support"
    },
    {
      key: "ton",
      name: "TON",
      icon: "◌",
      walletStandard: "ton",
      universal: true,
      description: "TON wallet support"
    },
    {
      key: "cosmos",
      name: "Cosmos",
      icon: "✦",
      walletStandard: "cosmos",
      universal: false,
      description: "Cosmos-family expansion path"
    }
  ],

  chains: [
    { id: "ethereum", family: "evm", caip: "eip155:1", chainId: 1, symbol: "ETH", name: "Ethereum", color: "#627EEA", enabled: true },
    { id: "base", family: "evm", caip: "eip155:8453", chainId: 8453, symbol: "ETH", name: "Base", color: "#0052FF", enabled: true },
    { id: "arbitrum", family: "evm", caip: "eip155:42161", chainId: 42161, symbol: "ETH", name: "Arbitrum", color: "#28A0F0", enabled: true },
    { id: "optimism", family: "evm", caip: "eip155:10", chainId: 10, symbol: "ETH", name: "Optimism", color: "#FF0420", enabled: true },
    { id: "polygon", family: "evm", caip: "eip155:137", chainId: 137, symbol: "POL", name: "Polygon", color: "#8247E5", enabled: true },
    { id: "bnb", family: "evm", caip: "eip155:56", chainId: 56, symbol: "BNB", name: "BNB Chain", color: "#F3BA2F", enabled: true },
    { id: "avalanche", family: "evm", caip: "eip155:43114", chainId: 43114, symbol: "AVAX", name: "Avalanche", color: "#E84142", enabled: true },
    { id: "linea", family: "evm", caip: "eip155:59144", chainId: 59144, symbol: "ETH", name: "Linea", color: "#9BE3FF", enabled: true },
    { id: "scroll", family: "evm", caip: "eip155:534352", chainId: 534352, symbol: "ETH", name: "Scroll", color: "#F5C568", enabled: true },
    { id: "zksync", family: "evm", caip: "eip155:324", chainId: 324, symbol: "ETH", name: "zkSync", color: "#8C8DFC", enabled: true },
    { id: "solana", family: "solana", caip: "solana:mainnet", symbol: "SOL", name: "Solana", color: "#14F195", enabled: true },
    { id: "bitcoin", family: "bitcoin", caip: "bip122:000000000019d6689c085ae165831e93", symbol: "BTC", name: "Bitcoin", color: "#F7931A", enabled: true },
    { id: "tron", family: "tron", caip: "tron:0x2b6653dc", symbol: "TRX", name: "TRON", color: "#FF060A", enabled: true },
    { id: "ton", family: "ton", caip: "ton:mainnet", symbol: "TON", name: "TON", color: "#0098EA", enabled: true }
  ],

  walletGroups: [
    {
      family: "evm",
      wallets: [
        { id: "walletconnect", name: "WalletConnect", accent: "#3B99FC", short: "WC", mode: "universal" },
        { id: "metamask", name: "MetaMask", accent: "#F6851B", short: "MM", mode: "injected" },
        { id: "rabby", name: "Rabby", accent: "#F4C542", short: "RB", mode: "injected" },
        { id: "coinbase", name: "Coinbase Wallet", accent: "#0052FF", short: "CB", mode: "injected" },
        { id: "trust", name: "Trust Wallet", accent: "#3375BB", short: "TW", mode: "walletconnect" },
        { id: "ledger", name: "Ledger", accent: "#E2E8F0", short: "LG", mode: "walletconnect" }
      ]
    },
    {
      family: "solana",
      wallets: [
        { id: "walletconnect", name: "WalletConnect", accent: "#3B99FC", short: "WC", mode: "universal" },
        { id: "phantom", name: "Phantom", accent: "#AB9FF2", short: "PH", mode: "injected" },
        { id: "backpack", name: "Backpack", accent: "#6D5DF6", short: "BP", mode: "injected" },
        { id: "solflare", name: "Solflare", accent: "#FCB045", short: "SF", mode: "injected" }
      ]
    },
    {
      family: "bitcoin",
      wallets: [
        { id: "walletconnect", name: "WalletConnect", accent: "#3B99FC", short: "WC", mode: "universal" },
        { id: "xverse", name: "Xverse", accent: "#111827", short: "XV", mode: "custom" },
        { id: "unisat", name: "UniSat", accent: "#F7931A", short: "US", mode: "custom" }
      ]
    },
    {
      family: "tron",
      wallets: [
        { id: "walletconnect", name: "WalletConnect", accent: "#3B99FC", short: "WC", mode: "universal" },
        { id: "tronlink", name: "TronLink", accent: "#FF060A", short: "TL", mode: "custom" }
      ]
    },
    {
      family: "ton",
      wallets: [
        { id: "walletconnect", name: "WalletConnect", accent: "#3B99FC", short: "WC", mode: "universal" },
        { id: "tonkeeper", name: "Tonkeeper", accent: "#0098EA", short: "TK", mode: "custom" }
      ]
    }
  ],

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

  trust: {
    readOnlyCopy: "Read-only portfolio access. NexVault never asks for your private keys.",
    sourceCopy: "Live pricing, balances, NFTs, and transaction data are fetched from verified infrastructure providers.",
    privacyCopy: "Wallet addresses are used for portfolio analytics only.",
    badges: [
      "Read-only",
      "Live market data",
      "Explorer-linked",
      "Multi-chain indexed"
    ]
  },

  ui: {
    defaultFamily: "evm",
    defaultChain: "ethereum",
    compactNumbers: false,
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
  },

  demo: {
    enabled: true,
    fakeAddressMap: {
      metamask: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      phantom: "7XkdGh3mPq9aBc1dEfG2hJkL3mNoPq4rStUvWx5y9mPq",
      ledger: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
      walletconnect: "0xd3CdA913deB6f4967b2Ef3aa68f5A843f12d3bE1",
      rabby: "0x3A8F7b2d12c0D942A7bE1dA0bAE4C12Df1bA8F90",
      coinbase: "0xabcdef1234567890abcdef1234567890abcdef12",
      trust: "0x1234abcD5678EF90abcdef1234567890abcdef56",
      okx: "0xDeadBeef1234567890AbCdEF1234567890aBcDeF",
      backpack: "6ZxYv4Rn2M1kJ8sA3pQ9tT7wL5nV2mH4cE8uB1qK6dP",
      solflare: "9YtEw3Lm7Qp2As8Dn4Fr6Hv1Jk5Mz0Xc3Vb9Np2TwQz",
      xverse: "bc1q4m4e0s9f6u5qj7r8n2v4x6w3y1p0t5c9a8d7k2",
      unisat: "bc1p9w0x3l2r8m5q7n6v4t1s9k3a2d5p8e1u7y6z3",
      tronlink: "TXYPr8yK8J7Vh3uT5mR1xQ4nL9cA2sD8wE",
      tonkeeper: "UQCM3M0V0G8R6P2Z1X5N9Y7W4S8A6D3F1H2J4K5L7Q"
    }
  }
};
