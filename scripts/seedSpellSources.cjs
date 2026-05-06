#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://iofuwpkebztdbewlvpmm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZnV3cGtlYnp0ZGJld2x2cG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTY2NzMsImV4cCI6MjA5MzQ3MjY3M30.fKbawh1_67vVdMgq-LEE_yZEShhjdtYKXFgMy2yErY0';

const spells = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'spells.json'), 'utf8'));

function fetchGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + body.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

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

async function run() {
  console.log('Fetching sources from DB...');
  const dbSources = await fetchGet('/rest/v1/sources?select=*');
  
  const sourceNameToId = {};
  dbSources.forEach(s => {
    sourceNameToId[s.name.toLowerCase()] = s.id;
  });

  console.log('Fetching spells from DB...');
  const dbSpells = await fetchGet('/rest/v1/spells?select=id,name');
  const spellNameToId = {};
  dbSpells.forEach(s => {
    spellNameToId[s.name] = s.id;
  });

  console.log('Building spell_sources payload...');
  let payload = [];
  
  spells.forEach(spell => {
    const spellId = spellNameToId[spell.name];
    if (!spellId) {
      console.warn(`WARNING: Spell "${spell.name}" not found in DB!`);
      return;
    }

    spell.sources.forEach(srcName => {
      let srcLower = srcName.toLowerCase();
      if (srcLower === 'dya’khol') srcLower = 'dhya’khol';
      
      const sourceId = sourceNameToId[srcLower];
      if (!sourceId) {
        console.warn(`WARNING: Source "${srcName}" not found in DB sources!`);
      } else {
        payload.push({
          spell_id: spellId,
          source_id: sourceId
        });
      }
    });
  });

  console.log(`Inserting ${payload.length} records into spell_sources...`);
  
  // Insert in batches of 1000
  const BATCH = 1000;
  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH);
    await post('/rest/v1/spell_sources', batch);
    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH, payload.length)}/${payload.length}`);
  }
  
  console.log('\nDone!');
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
