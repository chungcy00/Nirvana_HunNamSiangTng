// Local, disposable HTTP fixture. Never connects to a real Supabase project.
import { createServer } from 'node:http';
let mode = 'ready', delayMs = 0, requests = 0;
const row = { id: 'refresh-fixture', slug: 'refresh-fixture', name: '独立测试产品', category_id: 1,
  capacity_group: 'double', religions: [{ id: 1, name: '佛教' }],
  prices: [{ offer_id: 'fixture-offer', offer_name: '默认', price_type: 'standard', amount: 21888 }], inclusions: [] };
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3006');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, apikey, authorization, content-profile, accept-profile');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.url === '/stats') { res.end(JSON.stringify({ requests, mode, delayMs })); return; }
  if (req.url === '/control' && req.method === 'POST') {
    let body = ''; for await (const part of req) body += part;
    const next = JSON.parse(body); mode = next.mode; delayMs = next.delayMs || 0;
    res.end('{}'); return;
  }
  if (['/rest/v1/rpc/catalog_product_list','/rest/v1/rpc/catalog_product_detail'].includes(req.url) && req.method === 'POST') {
    const list = req.url.endsWith('_list'); if (list) requests++; const result = mode, delay = list ? delayMs : 0;
    setTimeout(() => {
      res.statusCode = result === 'error' ? 503 : 200;
      res.end(JSON.stringify(result === 'error' ? { message: 'isolated test failure' } : result === 'empty' ? (list ? [] : null) : (list ? [row] : row)));
    }, delay); return;
  }
  res.writeHead(404).end('{}');
});
server.listen(3026, '127.0.0.1', () => console.log('Isolated refresh fixture: http://127.0.0.1:3026'));
