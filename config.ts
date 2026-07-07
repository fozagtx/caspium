export interface Config {
  port: number;
  rpcUrl: string;
  network: string;
  alliumUrl: string;
  receiver: string | undefined;
  alliumKey: string | undefined;
}

const cfg: Config = {
  port: 4001,
  rpcUrl: 'https://rpc.testnet.casper.network/rpc',
  network: 'casper',
  alliumUrl: 'https://api.allium.so/v1',
  receiver: process.env.X402_RECEIVER,
  alliumKey: process.env.ALLIUM_API_KEY,
};

export default cfg;
