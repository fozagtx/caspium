module.exports = {
  port: process.env.PORT || 4001,
  rpcUrl: process.env.CASPER_RPC_URL || 'https://rpc.testnet.casper.network/rpc',
  receiver: process.env.X402_RECEIVER || '0203c9f22bec8d1cd7b8a5a7beaf1c77a28a69d7e84b2c5e5d3c8e7f6a5b4c3d2',
  network: process.env.CASPER_NETWORK || 'casper',
  allium: {
    key: process.env.ALLIUM_API_KEY,
    url: process.env.ALLIUM_API_URL || 'https://api.allium.so/v1',
  },
};
