#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://iofuwpkebztdbewlvpmm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZnV3cGtlYnp0ZGJld2x2cG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTY2NzMsImV4cCI6MjA5MzQ3MjY3M30.fKbawh1_67vVdMgq-LEE_yZEShhjdtYKXFgMy2yErY0';

const spheresData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'spheres.json'), 'utf8'));

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
        'Prefer': 'return=representation', // Get the inserted rows back
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
    req.write(data);
    req.end();
  });
}

async function seed() {
  // 1. Extract unique spheres
  const sphereNames = [...new Set(Object.values(spheresData))];
  const spheresPayload = sphereNames.map(name => ({ name }));
  
  console.log('Inserting Spheres...');
  const insertedSpheres = await post('/rest/v1/spheres', spheresPayload);
  console.log(`Inserted ${insertedSpheres.length} spheres.`);

  // Create mapping from sphere name to its new ID
  const sphereMap = {};
  insertedSpheres.forEach(s => {
    sphereMap[s.name] = s.id;
  });

  // 2. Prepare sources
  const sourcesPayload = Object.entries(spheresData).map(([sourceName, sphereName]) => {
    return {
      name: sourceName,
      sphere_id: sphereMap[sphereName]
    };
  });

  console.log('Inserting Sources...');
  const insertedSources = await post('/rest/v1/sources', sourcesPayload);
  console.log(`Inserted ${insertedSources.length} sources.`);
  
  console.log('Done!');
}

seed().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
