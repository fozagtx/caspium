import express from 'express';
import cors from 'cors';
import path from 'path';
import cfg from './config';
import x402 from './middleware/x402';
import { logPayment, getStats } from './services/payments';
import * as casper from './services/casper';

const app = express();

const ROOT = __dirname.endsWith('dist') ? path.resolve(__dirname, '..') : __dirname;
const publicDir = path.join(ROOT, 'public');

app.use(cors());
app.use(express.json());

app.use('/api/v1', x402({ exclude: ['/stats', '/health'] }));

// ─── Paid ──────────────────────────────────────────────────────────

app.get('/api/v1/query/block/latest', async (req, res) => {
  try {
    const data = await casper.getLatestBlock();
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'block.latest', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/block', async (req, res) => {
  if (!req.query.height) { res.status(400).json({ error: '?height= required' }); return; }
  try {
    const data = await casper.getBlock(req.query.height as string);
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'block', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/balance', async (req, res) => {
  if (!req.query.key) { res.status(400).json({ error: '?key= required' }); return; }
  try {
    const data = await casper.getAccountBalance(req.query.key as string);
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'balance', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/deploy', async (req, res) => {
  if (!req.query.hash) { res.status(400).json({ error: '?hash= required' }); return; }
  try {
    const data = await casper.getDeploy(req.query.hash as string);
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'deploy', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/validators', async (req, res) => {
  try {
    const data = await casper.getValidators();
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'validators', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/network', async (req, res) => {
  try {
    const [status, peers] = await Promise.all([casper.getStatus(), casper.getPeers()]);
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'network', responseMs: Date.now() - req._start! });
    res.json({ success: true, data: { status, peers } });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get('/api/v1/query/transfers', async (req, res) => {
  const count = Math.min(parseInt(req.query.count as string) || 5, 20);
  try {
    const data = await casper.getRecentTransfers(count);
    logPayment({ payer: req.payer!, deployHash: req.deployHash, endpoint: 'transfers', responseMs: Date.now() - req._start! });
    res.json({ success: true, data });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

// ─── Free ──────────────────────────────────────────────────────────

app.get('/api/v1/stats', (req, res) => {
  res.json({ success: true, data: getStats(parseInt(req.query.hours as string) || 24) });
});

app.get('/api/v1/health', async (_req, res) => {
  try {
    const s = await casper.getStatus();
    res.json({ status: 'ok', chain: s.chainName, block: s.latestBlock, price: '0.05' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

// ─── Landing page ──────────────────────────────────────────────────

app.use(express.static(publicDir));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(cfg.port, '0.0.0.0', () => {
  console.log('x402-casper-api :' + cfg.port);
});
