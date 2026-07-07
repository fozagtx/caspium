import cfg from '../config';

interface RpcBlock {
  block: {
    hash: string;
    header: { height: number; timestamp: string; era_id: number };
    body: { proposer: string; deploy_hashes: string[] };
  };
}

interface LatestBlock {
  hash: string;
  height: number;
  timestamp: string;
  era: number;
  proposer: string;
  deployCount: number;
}

interface Balance {
  publicKey: string;
  balanceMotes: string;
  balanceCSPR: string;
}

interface Status {
  version: string;
  chainName: string;
  latestBlock: number;
  peers: number;
  uptime: string;
}

interface Peer {
  address: string;
  node_id: string;
}

interface ValidatorChange {
  public_key: string;
  change: string;
  validator_id: string;
}

interface DeployResult {
  deploy: {
    header: { account: string; timestamp: string };
    approvals: Array<{ signer: string; signature: string }>;
  };
  execution_results: Array<{
    result: { Success?: unknown; Failure?: unknown };
  }>;
}

interface TransferEntry {
  hash: string;
  blockHeight: number;
  timestamp: string;
  account: string;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(cfg.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params.length ? params : undefined }),
  });
  if (!res.ok) throw new Error('Casper RPC ' + res.status + ': ' + res.statusText);
  const body = (await res.json()) as { error?: { message: string }; result?: T };
  if (body.error) throw new Error(body.error.message ?? JSON.stringify(body.error));
  return body.result as T;
}

export async function getLatestBlock(): Promise<LatestBlock> {
  const result = await rpc<RpcBlock>('chain_get_block');
  return {
    hash: result.block.hash,
    height: result.block.header.height,
    timestamp: result.block.header.timestamp,
    era: result.block.header.era_id,
    proposer: result.block.body.proposer,
    deployCount: (result.block.body.deploy_hashes || []).length,
  };
}

export async function getBlock(height: string | number) {
  const result = await rpc<RpcBlock>('chain_get_block', [{ BlockIdentifier: { Height: parseInt(String(height)) } }]);
  return result.block;
}

export async function getAccountBalance(publicKey: string): Promise<Balance> {
  const stateRoot = (await rpc<{ state_root_hash: string }>('chain_get_state_root_hash')).state_root_hash;
  const account = await rpc<{ account: { main_purse: string } }>('state_get_account_info', [publicKey, [stateRoot]]);
  const purse = account.account.main_purse;
  const balance = await rpc<{ balance_value: string }>('state_get_balance', [stateRoot, purse]);
  return {
    publicKey,
    balanceMotes: balance.balance_value,
    balanceCSPR: (BigInt(balance.balance_value) / BigInt(1_000_000_000)).toString(),
  };
}

export async function getDeploy(deployHash: string) {
  const result = await rpc<DeployResult>('info_get_deploy', [deployHash]);
  return result.deploy;
}

export async function getValidators(): Promise<ValidatorChange[]> {
  const result = await rpc<{ changes: ValidatorChange[] }>('state_get_validator_changes');
  return result.changes || [];
}

export async function getPeers(): Promise<Peer[]> {
  const result = await rpc<{ peers: Peer[] }>('info_get_peers');
  return result.peers || [];
}

export async function getStatus(): Promise<Status> {
  const result = await rpc<{
    api_version: string;
    chain_name: string;
    last_added_block_info?: { height: number };
    peers_count?: number;
    uptime: string;
  }>('info_get_status');
  return {
    version: result.api_version,
    chainName: result.chain_name,
    latestBlock: result.last_added_block_info?.height ?? 0,
    peers: result.peers_count ?? 0,
    uptime: result.uptime,
  };
}

export async function getRecentTransfers(count = 5): Promise<TransferEntry[]> {
  const latest = await rpc<RpcBlock>('chain_get_block');
  const currentHeight = latest.block.header.height;
  const transfers: TransferEntry[] = [];

  for (let h = currentHeight; h > 0 && transfers.length < count; h--) {
    try {
      const block = await rpc<RpcBlock>('chain_get_block', [{ BlockIdentifier: { Height: h } }]);
      const deploys = block.block.body.deploy_hashes || [];
      for (const hash of deploys) {
        try {
          const deploy = await rpc<DeployResult>('info_get_deploy', [hash]);
          transfers.push({ hash, blockHeight: h, timestamp: block.block.header.timestamp, account: deploy.deploy.header.account });
          if (transfers.length >= count) break;
        } catch { continue; }
      }
    } catch { break; }
  }
  return transfers;
}
