# x402-casper-api

Pay-per-query for Casper blockchain data.  
No API keys. No accounts. No subscriptions.  
One CSPR transfer. One query. $0.05.

```
X-402-Payment: <deploy-hash>
```

---

## The problem

Every Casper dApp needs chain data. Running a node is overhead.  
Public RPCs are rate-limited. Data providers want monthly commitments.  

This is a machine-readable API for machines that pay their own way.

## How it works

1. Send CSPR to the configured receiver address
2. Take the deploy hash from the transfer
3. Call any paid endpoint with `X-402-Payment: <deploy-hash>`
4. Server calls `info_get_deploy`, confirms the transfer, returns the data

## Quick start

```bash
npm install
cp .env.example .env
node server.js
```

## Endpoints

### Paid

Require `X-402-Payment: <deploy-hash>` header. Each costs $0.05.

| Method | Path | Params |
|--------|------|--------|
| GET | `/api/v1/query/block/latest` | — |
| GET | `/api/v1/query/block` | `?height=` |
| GET | `/api/v1/query/balance` | `?key=` |
| GET | `/api/v1/query/deploy` | `?hash=` |
| GET | `/api/v1/query/validators` | — |
| GET | `/api/v1/query/network` | — |
| GET | `/api/v1/query/transfers` | `?count=` |

### Free

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Server and chain status |
| GET | `/api/v1/stats` | Payment revenue statistics |

## Example

```bash
curl -H "X-402-Payment: a1b2c3d4e5..." \
  http://localhost:4001/api/v1/query/block/latest
```

## Files

```
config.js           port, rpc url, receiver, network
server.js           routes
middleware/x402.js  deploy verification (on-chain)
services/casper.js  casper rpc client
services/payments.js sqlite ledger
public/index.html   landing page
```
