export interface Config {
  port: number;
  rpcUrl: string;
  nownodesUrl: string;
  nownodesKey: string | undefined;
  network: string;
  alliumUrl: string;
  receiver: string | undefined;
  alliumKey: string | undefined;
}

const cfg: Config = {
  port: 4001,
  rpcUrl: 'https://rpc.testnet.casper.network/rpc',
  nownodesUrl: 'https://casper.nownodes.io',
  nownodesKey: process.env.NOWNODES_KEY,
  network: 'casper',
  alliumUrl: 'https://api.allium.so/v1',
  receiver: process.env.X402_RECEIVER,
  alliumKey: process.env.ALLIUM_API_KEY,
};

export default cfg;
