#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const spellsFile = path.join(__dirname, 'src', 'data', 'spells.json');
const spheresFile = path.join(__dirname, 'src', 'data', 'spheres.json');

const spells = JSON.parse(fs.readFileSync(spellsFile, 'utf8'));
const spheresData = JSON.parse(fs.readFileSync(spheresFile, 'utf8'));

const allSources = Object.keys(spheresData).filter(s => s !== 'Dya’Khol'); // We'll prefer Dhya’Khol
// We also have 'Gift' which isn't in spheresData
allSources.push('Gift');

const elementar = Object.keys(spheresData).filter(k => spheresData[k] === 'Sphäre der Elemente');
const stellar = Object.keys(spheresData).filter(k => spheresData[k] === 'Sphäre der Sterne');
const daemonisch = Object.keys(spheresData).filter(k => spheresData[k] === 'Sphäre der Dämonen' && k !== 'Dya’Khol');

function normalizeSource(src) {
  src = src.trim();
  // Typos
  if (src.toLowerCase() === 'gakluzul') return 'Galkuzul';
  if (src.toLowerCase() === 'tesephai') return 'Thesephai';
  if (src.toLowerCase() === 'dya’khol') return 'Dhya’Khol';
  
  // Exact match with correct casing
  const exact = allSources.find(s => s.toLowerCase() === src.toLowerCase());
  if (exact) return exact;

  return src;
}

function resolveGroup(groupString) {
  let lower = groupString.toLowerCase().trim();
  let result = new Set();

  if (lower === 'quellenunabhängig' || lower === 'alle') {
    allSources.forEach(s => result.add(s));
    return Array.from(result);
  }

  if (lower === 'nur weihe') {
    return ['Weihe'];
  }

  if (lower === 'gift') {
    return ['Gift', 'Humus', 'Khalyanar', 'Mishkarya'];
  }

  // Handle "und"
  if (lower.includes(' und ')) {
    const parts = lower.split(' und ');
    parts.forEach(p => {
      resolveGroup(p).forEach(s => result.add(s));
    });
    return Array.from(result);
  }

  // Base sets
  let baseSet = [];
  if (lower.startsWith('alle außer')) {
    baseSet = [...allSources];
  } else if (lower.startsWith('alle elementaren')) {
    baseSet = [...elementar];
  } else if (lower.startsWith('alle stellaren') || lower.startsWith('alle stelaren')) {
    baseSet = [...stellar];
  } else if (lower.startsWith('alle dämonischen')) {
    baseSet = [...daemonisch];
  } else {
    // Single normalized source
    const norm = normalizeSource(groupString);
    if (allSources.includes(norm)) {
      return [norm];
    }
    console.warn('Unknown source:', groupString);
    return [groupString];
  }

  // Handle exceptions "außer" / "ausser"
  let exceptions = [];
  const match = lower.match(/(?:außer|ausser)\s+(.+)/);
  if (match) {
    // There can be exceptions separated by "und" but we handled "und" earlier?
    // Wait, "alle außer humus und khalyanar" was split by "und" earlier if we just check .includes(' und ').
    // So "alle außer humus" and "khalyanar" would be the split. That's wrong.
    // We should parse exceptions properly.
  }
  
  // Let's redesign parsing to handle exceptions correctly
  return []; // Placeholder, see logic below
}

function parseSources(sourcesArray) {
  let resolved = new Set();
  
  sourcesArray.forEach(srcStr => {
    let lower = srcStr.toLowerCase().trim();
    
    if (lower === 'quellenunabhängig' || lower === 'alle') {
      allSources.forEach(s => resolved.add(s));
      return;
    }
    if (lower === 'nur weihe') {
      resolved.add('Weihe');
      return;
    }
    if (lower === 'gift') {
      resolved.add('Gift');
      resolved.add('Humus');
      resolved.add('Khalyanar');
      resolved.add('Mishkarya');
      return;
    }

    // Split by "und" if it's NOT part of an "außer ... und ..." clause
    // Actually, "alle außer X und Y" is the only case where "und" is after "außer".
    // "Aggression und Zeit" -> no "außer".
    let baseGroup = lower;
    let exceptionsStr = '';
    
    const ausserIdx = Math.max(lower.indexOf('außer'), lower.indexOf('ausser'));
    if (ausserIdx !== -1) {
      baseGroup = lower.substring(0, ausserIdx).trim();
      exceptionsStr = lower.substring(ausserIdx + 6).trim(); // + length of "außer "
    }

    // Resolve base
    let baseItems = [];
    if (baseGroup === 'alle') {
      baseItems = [...allSources];
    } else if (baseGroup === 'alle elementaren') {
      baseItems = [...elementar];
    } else if (baseGroup === 'alle stellaren' || baseGroup === 'alle stelaren') {
      baseItems = [...stellar];
    } else if (baseGroup === 'alle dämonischen') {
      baseItems = [...daemonisch];
    } else {
      // It's a list of normal sources like "zauberei und khalyanar"
      baseGroup.split(' und ').forEach(p => {
        baseItems.push(normalizeSource(p));
      });
    }

    // Resolve exceptions
    let exceptionItems = [];
    if (exceptionsStr) {
      exceptionsStr.split(' und ').forEach(p => {
        exceptionItems.push(normalizeSource(p));
      });
    }

    // Apply
    baseItems.forEach(item => {
      if (!exceptionItems.includes(item)) {
        resolved.add(item);
      }
    });
  });

  return Array.from(resolved).sort();
}

// Process all spells
let modifiedCount = 0;
spells.forEach(spell => {
  const original = [...spell.sources];
  const resolved = parseSources(spell.sources);
  spell.sources = resolved;
  
  if (original.join(',') !== resolved.join(',')) {
    modifiedCount++;
  }
});

fs.writeFileSync(spellsFile, JSON.stringify(spells, null, 2), 'utf8');
console.log(`Resolved sources for ${modifiedCount} spells. Wrote to spells.json`);
