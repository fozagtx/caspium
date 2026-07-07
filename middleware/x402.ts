import { Request, Response, NextFunction } from 'express';
import cfg from '../config';

// Extend Express Request for x402 properties
declare module 'express-serve-static-core' {
  interface Request {
    payer?: string;
    deployHash?: string;
    _start?: number;
  }
}

interface RpcResult {
  deploy: {
    header: { account: string };
    execution_results?: Array<{
      result?: { Success?: { effects: Array<{ transform?: { WriteTransfer?: { target: string } } }> } };
    }>;
  };
}

const verified = new Set<string>();

async function rpc(method: string, params: unknown[] = []): Promise<RpcResult> {
  const res = await fetch(cfg.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params.length || undefined }),
  });
  if (!res.ok) throw new Error('RPC ' + res.status);
  const body = (await res.json()) as { error?: { message: string }; result?: RpcResult };
  if (body.error) throw new Error(body.error.message);
  return body.result as RpcResult;
}

async function verifyDeploy(deployHash: string): Promise<RpcResult['deploy']> {
  const result = await rpc('info_get_deploy', [deployHash]);
  const deploy = result.deploy;

  const execs = deploy.execution_results || [];
  const success = execs.some(e => e.result?.Success);
  if (!success) throw new Error('deploy not finalized');

  const effects = execs.flatMap(e => e.result?.Success?.effects || []);
  const transfers = effects.filter(e => e.transform?.WriteTransfer);
  if (transfers.length === 0) throw new Error('no transfer in deploy');

  const ok = transfers.some(t => t.transform!.WriteTransfer!.target === cfg.receiver);
  if (!ok) throw new Error('transfer not to receiver');

  return deploy;
}

interface X402Options {
  exclude?: string[];
}

export default function x402(opts: X402Options = {}) {
  const { exclude = [] } = opts;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (exclude.some(p => req.path.startsWith(p))) return next();

    const proof = req.headers['x-402-payment'] as string | undefined;
    if (!proof) {
      res.status(402).json({
        error: 'Payment Required',
        payment: { network: cfg.network, receiver: cfg.receiver, priceUsd: '0.05' },
      });
      return;
    }

    if (verified.has(proof)) {
      res.status(402).json({ error: 'Proof Replayed' });
      return;
    }

    try {
      const deploy = await verifyDeploy(proof);
      verified.add(proof);
      req.payer = deploy.header.account;
      req.deployHash = proof;
      req._start = Date.now();
      next();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      res.status(402).json({ error: 'Payment Invalid', message: msg });
    }
  };
}
