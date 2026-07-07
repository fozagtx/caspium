export interface Config {
  port: number;
  rpcUrl: string;
  nownodesUrl: string;
  nownodesKey: string | undefined;
  network: string;
  receiver: string | undefined;
}

const cfg: Config = {
  port: parseInt(process.env.PORT || '4001', 10),
  rpcUrl: 'https://rpc.testnet.casper.network/rpc',
  nownodesUrl: 'https://casper.nownodes.io',
  nownodesKey: process.env.NOWNODES_KEY,
  network: 'casper',
  receiver: process.env.X402_RECEIVER,
};

export default cfg;
