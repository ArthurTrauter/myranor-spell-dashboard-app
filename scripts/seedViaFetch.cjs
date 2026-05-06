#!/usr/bin/env node
/**
 * seedViaFetch.cjs
 * Seeds spells into Supabase using the REST API directly (fetch),
 * bypassing the WebSocket requirement of the supabase-js client.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://iofuwpkebztdbewlvpmm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZnV3cGtlYnp0ZGJld2x2cG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTY2NzMsImV4cCI6MjA5MzQ3MjY3M30.fKbawh1_67vVdMgq-LEE_yZEShhjdtYKXFgMy2yErY0';

const spells = JSON.parse(fs.readFileSync(path.join(__dirname, 'spells_with_ids.json'), 'utf8'));

function post(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Prefer': 'resolution=ignore-duplicates',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + body.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed() {
  const BATCH = 10;
  let total = 0;
  for (let i = 0; i < spells.length; i += BATCH) {
    const batch = spells.slice(i, i + BATCH);
    await post('/rest/v1/spells', batch);
    total += batch.length;
    process.stdout.write('\r  Progress: ' + total + '/' + spells.length);
  }
  console.log('\nDone! ' + total + ' spells inserted.');
}

seed().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
