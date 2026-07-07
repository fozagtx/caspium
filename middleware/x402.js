const cfg = require('../config');

const verified = new Set();

async function rpc(method, params = []) {
  const res = await fetch(cfg.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params.length ? params : undefined }),
  });
  if (!res.ok) throw new Error('RPC ' + res.status);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

async function verifyDeploy(deployHash) {
  const result = await rpc('info_get_deploy', [deployHash]);
  const deploy = result.deploy;

  const execs = deploy.execution_results || [];
  const success = execs.some(e => e.result?.Success);
  if (!success) throw new Error('deploy not finalized');

  const effects = execs.map(e => e.result?.Success?.effects || []).flat();
  const transfers = effects.filter(e => e.transform?.WriteTransfer);

  if (transfers.length === 0) throw new Error('no transfer in deploy');

  for (const t of transfers) {
    if (t.transform.WriteTransfer.target === cfg.receiver) return deploy;
  }

  throw new Error('transfer not to receiver');
}

module.exports = function x402(opts = {}) {
  const { exclude = [] } = opts;

  return async (req, res, next) => {
    if (exclude.some(p => req.path.startsWith(p))) return next();

    const proof = req.headers['x-402-payment'];
    if (!proof) {
      return res.status(402).json({
        error: 'Payment Required',
        payment: { network: cfg.network, receiver: cfg.receiver, priceUsd: '0.05' },
      });
    }

    if (verified.has(proof)) {
      return res.status(402).json({ error: 'Proof Replayed' });
    }

    try {
      const deploy = await verifyDeploy(proof);
      verified.add(proof);
      req.payer = deploy.header.account;
      req.deployHash = proof;
      req._start = Date.now();
      next();
    } catch (e) {
      return res.status(402).json({ error: 'Payment Invalid', message: e.message });
    }
  };
};
