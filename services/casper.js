// Casper RPC client

const cfg = require('../config');

async function rpc(method, params = []) {
  const res = await fetch(cfg.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params.length ? params : undefined,
    }),
  });
  if (!res.ok) throw new Error('Casper RPC ' + res.status + ': ' + res.statusText);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body.result;
}

async function getLatestBlock() {
  const result = await rpc('chain_get_block');
  return {
    hash: result.block.hash,
    height: result.block.header.height,
    timestamp: result.block.header.timestamp,
    era: result.block.header.era_id,
    proposer: result.block.body.proposer,
    deployCount: (result.block.body.deploy_hashes || []).length,
  };
}

async function getBlock(height) {
  const result = await rpc('chain_get_block', [{ BlockIdentifier: { Height: parseInt(height) } }]);
  return result.block;
}

async function getAccountBalance(publicKey) {
  const stateRoot = (await rpc('chain_get_state_root_hash')).state_root_hash;
  const account = await rpc('state_get_account_info', [publicKey, [stateRoot]]);
  const purse = account.account.main_purse;
  const balance = await rpc('state_get_balance', [stateRoot, purse]);
  return {
    publicKey,
    balanceMotes: balance.balance_value,
    balanceCSPR: (BigInt(balance.balance_value) / BigInt(1_000_000_000)).toString(),
  };
}

async function getDeploy(deployHash) {
  const result = await rpc('info_get_deploy', [deployHash]);
  return result.deploy;
}

async function getValidators() {
  const result = await rpc('state_get_validator_changes');
  return result.changes || [];
}

async function getPeers() {
  const result = await rpc('info_get_peers');
  return result.peers || [];
}

async function getStatus() {
  const result = await rpc('info_get_status');
  return {
    version: result.api_version,
    chainName: result.chain_name,
    latestBlock: result.last_added_block_info?.height || 0,
    peers: result.peers_count || 0,
    uptime: result.uptime,
  };
}

async function getRecentTransfers(count = 5) {
  const latest = await rpc('chain_get_block');
  const currentHeight = latest.block.header.height;
  const transfers = [];
  for (let h = currentHeight; h > 0 && transfers.length < count; h--) {
    try {
      const block = await rpc('chain_get_block', [{ BlockIdentifier: { Height: h } }]);
      const deploys = block.block.body.deploy_hashes || [];
      for (const hash of deploys) {
        try {
          const deploy = await rpc('info_get_deploy', [hash]);
          transfers.push({
            hash,
            blockHeight: h,
            timestamp: block.block.header.timestamp,
            account: deploy.deploy.header.account,
          });
          if (transfers.length >= count) break;
        } catch { continue; }
      }
    } catch { break; }
  }
  return transfers;
}

module.exports = {
  getLatestBlock,
  getBlock,
  getAccountBalance,
  getDeploy,
  getValidators,
  getPeers,
  getStatus,
  getRecentTransfers,
};
