module.exports = {
  port: 4001,
  rpcUrl: 'https://rpc.testnet.casper.network/rpc',
  network: 'casper',
  alliumUrl: 'https://api.allium.so/v1',

  // secrets — must be set via .env
  receiver: process.env.X402_RECEIVER,
  alliumKey: process.env.ALLIUM_API_KEY,
};
