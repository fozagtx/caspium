# x402-casper-api

Pay-per-query API for Casper blockchain.  
Clients pay $0.05 per request via on-chain CSPR transfer.  
Payment verified on-chain via `info_get_deploy` RPC.

## Quick start

```bash
npm install
cp .env.example .env
node server.js
```

## Endpoints

### Paid — require `X-402-Payment: <deploy-hash>` header

| Path | Params |
|------|--------|
| `GET /api/v1/query/block/latest` | — |
| `GET /api/v1/query/block` | `?height=` |
| `GET /api/v1/query/balance` | `?key=` (account public key) |
| `GET /api/v1/query/deploy` | `?hash=` |
| `GET /api/v1/query/validators` | — |
| `GET /api/v1/query/network` | — |
| `GET /api/v1/query/transfers` | `?count=` |

### Free

| Path | Description |
|------|-------------|
| `GET /api/v1/health` | Server + chain status |
| `GET /api/v1/stats` | Payment revenue stats |

## How it works

1. Send CSPR to the receiver address (configured in `.env`)
2. Take the deploy hash from the transfer
3. Call any paid endpoint with header `X-402-Payment: <deploy-hash>`
4. Server fetches the deploy via `info_get_deploy`, confirms it's a successful transfer to the receiver, and returns the data

```bash
curl -H "X-402-Payment: <deploy-hash>" \
  http://localhost:4001/api/v1/query/block/latest
```

## Files

```
config.js              port, rpc url, receiver, network name
.env.example           template for config overrides
server.js              route definitions
middleware/x402.js      on-chain payment verification
services/casper.js     casper testnet rpc client
services/payments.js   sqlite payment log
```
