#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const INPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'ZAUBER.txt');
const SUPABASE_URL = 'https://iofuwpkebztdbewlvpmm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZnV3cGtlYnp0ZGJld2x2cG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTY2NzMsImV4cCI6MjA5MzQ3MjY3M30.fKbawh1_67vVdMgq-LEE_yZEShhjdtYKXFgMy2yErY0';

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

function patch(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
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

function isNoiseLine(line) {
  if (/^\d+$/.test(line)) return true;
  if (/^Christian Voshage/.test(line)) return true;
  if (/^Karin Wittig$/.test(line)) return true;
  if (/^Zauber$/.test(line)) return true;
  return false;
}

function isTypeLine(line) {
  return /^Zaubertrick\s+(der|des|von)/i.test(line) ||
         /zauber\s+des\s+\d+\.\s+Grade/i.test(line) ||
         /^(Bannzauber)\s+des\s+\d+\.\s+Grade/i.test(line);
}

const FIELD_LABELS = ['Quellen:', 'Zeitaufwand:', 'Reichweite:', 'Komponenten:', 'Wirkungsdauer:'];
function getFieldLabel(line) {
  for (const label of FIELD_LABELS) {
    if (line.startsWith(label)) return label;
  }
  return null;
}

function parseZauberbeschreibungen(text) {
  const spells = [];
  const rawLines = text.split(/\r?\n/);

  let startIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim() === 'Zauberbeschreibungen') {
      startIdx = i + 1;
      break;
    }
  }

  if (startIdx === -1) {
    console.error('ERROR: Could not find "Zauberbeschreibungen" section');
    process.exit(1);
  }

  const lines = rawLines.slice(startIdx).map(l => l.trim()).filter(l => !isNoiseLine(l));
  const spellStarts = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].length > 0 && isTypeLine(lines[i + 1])) {
      if (!isTypeLine(lines[i]) && !getFieldLabel(lines[i])) {
        spellStarts.push({ nameIdx: i, typeIdx: i + 1 });
      }
    }
  }

  for (let s = 0; s < spellStarts.length; s++) {
    const { nameIdx, typeIdx } = spellStarts[s];
    const endIdx = s + 1 < spellStarts.length ? spellStarts[s + 1].nameIdx : lines.length;
    const spellLines = lines.slice(typeIdx + 1, endIdx);
    const name = lines[nameIdx];

    const fieldLines = { sources: [] };
    let currentField = null;
    let currentSection = 'fields';

    for (const line of spellLines) {
      if (currentSection === 'fields') {
        const label = getFieldLabel(line);
        if (label === 'Quellen:') {
          currentField = 'sources';
          fieldLines.sources.push(line.replace(/^Quellen:\s*/, '').trim());
        } else if (label !== null) {
          currentField = 'other';
        } else if (label === null && line.length > 0) {
          if (currentField === 'sources') {
            fieldLines.sources.push(line);
          }
        }
      }
    }

    const sourcesRaw = fieldLines.sources.join(' ').replace(/\s+/g, ' ').trim();
    spells.push({ name, sourcesRaw });
  }

  return spells;
}

async function run() {
  console.log('Reading ZAUBER.txt...');
  const text = fs.readFileSync(INPUT_FILE, 'utf8');
  const parsed = parseZauberbeschreibungen(text);
  
  console.log(`Found ${parsed.length} spells in txt.`);

  console.log('Fetching spells from DB...');
  const dbSpells = await fetchGet('/rest/v1/spells?select=id,name');
  const spellNameToId = {};
  dbSpells.forEach(s => {
    spellNameToId[s.name] = s.id;
  });

  console.log('Updating DB via REST...');
  let count = 0;
  
  for (const spell of parsed) {
    const spellId = spellNameToId[spell.name];
    if (spellId) {
      try {
        await patch(`/rest/v1/spells?id=eq.${spellId}`, { sources_display: spell.sourcesRaw });
        count++;
        process.stdout.write(`\r  Updated: ${count}/${parsed.length}`);
      } catch (err) {
        console.error(`\nFailed to update ${spell.name}:`, err.message);
      }
    } else {
      console.warn(`\nWARNING: Spell "${spell.name}" not found in DB!`);
    }
  }

  console.log(`\nFinished updating ${count} spells.`);
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
