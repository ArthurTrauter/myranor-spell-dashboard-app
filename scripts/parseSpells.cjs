#!/usr/bin/env node
/**
 * Myranor Spell Parser
 * Parses ZAUBER.txt and outputs src/data/spells.json in the spellTemplate.json structure.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'ZAUBER.txt');
const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'spells.json');

// ============================================================
// SCHOOL NAME NORMALIZATION
// ============================================================

/**
 * Normalize German school name by stripping genitive suffixes.
 * e.g. "Illusions" -> "Illusion", "Beschwörungs" -> "Beschwörung"
 */
function normalizeSchoolName(raw) {
  if (!raw) return 'Unbekannt';
  
  // Known exact matches first (including abbreviated forms and genitive forms)
  const exact = {
    'Bannzauber': 'Bannzauber',
    'Bann': 'Bannzauber',       // "Bannmagie" stripped -> "Bann"
    'Nekromantie': 'Nekromantie',
    'Erkenntnis': 'Erkenntnis',
    'Illusion': 'Illusion',
    'Verzauberung': 'Verzauberung',
    'Verwandlung': 'Verwandlung',
    'Beschwörung': 'Beschwörung',
    'Hervorrufung': 'Hervorrufung',
  };
  
  if (exact[raw]) return exact[raw];
  
  // Strip trailing 's' (German genitive)
  if (raw.endsWith('s')) {
    const candidate = raw.slice(0, -1);
    if (exact[candidate]) return exact[candidate];
    return candidate; // general fallback
  }
  
  return raw;
}

// ============================================================
// PARSING HELPERS
// ============================================================

/**
 * Parse the spell type line into { school, level, isRitual }
 * Examples:
 *   "Zaubertrick der Verzauberung"
 *   "Zaubertrick des Bannzaubers"
 *   "Illusionszauber des 5. Grades"
 *   "Illusionszauber des 5. Grades (Ritual)"
 *   "Erkenntniszauber des 1. Grades (Ritual)"
 *   "Beschwörungszauber des 2. Grades"
 *   "Bannzauber des 2. Grades"
 */
function parseTypeLine(typeLine) {
  let school = 'Unbekannt';
  let level = 0;
  let isRitual = false;

  if (!typeLine) return { school, level, isRitual };

  // Check for ritual
  isRitual = /\(Ritual\)/i.test(typeLine);

  // Cantrip: "Zaubertrick der/des/von ..."
  if (/^Zaubertrick/i.test(typeLine)) {
    level = 0;
    const m = typeLine.match(/Zaubertrick\s+(?:der|des|von)\s+(.+?)(?:\s*\(Ritual\))?$/i);
    if (m) {
      school = m[1].trim();
      // normalize e.g. "Erkenntnismagie" -> "Erkenntnis"
      school = school.replace(/magie$/i, '').trim();
      school = normalizeSchoolName(school);
    }
    return { school, level, isRitual };
  }

  // Special case: "Bannzauber des X. Grades" -> school is "Bannzauber"
  if (/^Bannzauber\s+des\s+\d+/i.test(typeLine)) {
    const lm = typeLine.match(/(\d+)\.\s*Grade/i);
    level = lm ? parseInt(lm[1], 10) : 1;
    school = 'Bannzauber';
    return { school, level, isRitual };
  }

  // Leveled spell: "<School>zauber des X. Grades"
  const levelMatch = typeLine.match(/(\d+)\.\s*Grade/i);
  if (levelMatch) {
    level = parseInt(levelMatch[1], 10);
  }

  // Extract school prefix before "zauber"
  const schoolMatch = typeLine.match(/^(.+?)zauber\s+des/i);
  if (schoolMatch) {
    const schoolRaw = schoolMatch[1].trim();
    school = normalizeSchoolName(schoolRaw);
  } else {
    // Pattern for some other prefix form
    const altMatch = typeLine.match(/^(\S+)\s+des\s+\d+\.\s+Grade/i);
    if (altMatch) {
      school = altMatch[1].trim();
    }
  }

  return { school, level, isRitual };
}

/**
 * Parse components string like "V, G, M (details im Wert von 100 Au, verbraucht)"
 * Components: V = verbal, G = somatic (Gestik), M = material
 */
function parseComponents(compStr) {
  if (!compStr) {
    return {
      verbal: false,
      somatic: false,
      material: false,
      material_details: null,
      material_cost: null,
      is_consumed: false,
    };
  }

  const verbal = /\bV\b/.test(compStr);
  const somatic = /\bG\b/.test(compStr);
  const material = /\bM\b/.test(compStr);

  let material_details = null;
  let material_cost = null;
  let is_consumed = false;

  if (material) {
    const detailsMatch = compStr.match(/M\s*\(([^)]+)\)/);
    if (detailsMatch) {
      material_details = detailsMatch[1].trim();
      is_consumed = /verbraucht/i.test(material_details);

      // Extract cost e.g. "100 Au", "25 Ag", "mindestens 100 Au"
      const costMatch = material_details.match(/(\d+(?:\.\d+)?)\s*(Au|Ag|Gold|Silber)/i);
      if (costMatch) {
        material_cost = `${costMatch[1]} ${costMatch[2]}`;
      }
    }
  }

  return { verbal, somatic, material, material_details, material_cost, is_consumed };
}

/**
 * Parse range string like "18 m", "Selbst (Kegel von 4,5 m)", "Sicht", "Berührung"
 */
function parseRange(rangeStr) {
  if (!rangeStr) return { distance: '', area_shape: null, area_size: null };

  let distance = rangeStr.trim();
  let area_shape = null;
  let area_size = null;

  const areaMatch = rangeStr.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (areaMatch) {
    distance = areaMatch[1].trim();
    const areaStr = areaMatch[2].trim();

    const shapeMatch = areaStr.match(/^(\w+)\s+(?:von|mit)\s+(.+)$/i);
    if (shapeMatch) {
      area_shape = shapeMatch[1];
      area_size = shapeMatch[2];
    } else {
      area_shape = areaStr;
    }
  }

  return { distance, area_shape, area_size };
}

/**
 * Parse duration string like "Konzentration, bis zu 1 Stunde", "1 Minute", "Unmittelbar"
 */
function parseDuration(durStr) {
  if (!durStr) return { time: '', concentration: false };

  const concentration = /Konzentration/i.test(durStr);
  let time = durStr.trim();

  if (concentration) {
    const timeMatch = durStr.match(/Konzentration,?\s*(.+)/i);
    if (timeMatch) {
      time = timeMatch[1].trim();
    } else {
      time = 'Konzentration';
    }
  }

  return { time, concentration };
}

/**
 * Parse casting time - may have condition for reactions
 * "1 Reaktion, die du ausfuehrst, wenn..." -> base_time: "1 Reaktion", condition: "..."
 */
function parseCastingTime(timeStr) {
  if (!timeStr) return { base_time: '', condition: null };

  const reactionMatch = timeStr.match(/^(1 Reaktion)\s*[,;]?\s*(.+)?$/i);
  if (reactionMatch && reactionMatch[2]) {
    return { base_time: reactionMatch[1], condition: reactionMatch[2].trim() };
  }

  return { base_time: timeStr.trim(), condition: null };
}

/**
 * Parse sources list from "Eis, Erz, Humus, Aggari" or "Alle" etc.
 */
function parseSources(sourcesStr) {
  if (!sourcesStr) return [];
  return sourcesStr.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

// ============================================================
// PAGE NUMBER / NOISE LINE FILTER
// ============================================================
function isNoiseLine(line) {
  if (/^\d+$/.test(line)) return true; // page numbers
  if (/^Christian Voshage/.test(line)) return true;
  if (/^Karin Wittig$/.test(line)) return true;
  if (/^Zauber$/.test(line)) return true; // chapter header repeated
  return false;
}

// ============================================================
// TYPE LINE DETECTION
// ============================================================
function isTypeLine(line) {
  return /^Zaubertrick\s+(der|des|von)/i.test(line) ||
         /zauber\s+des\s+\d+\.\s+Grade/i.test(line) ||
         /^(Bannzauber)\s+des\s+\d+\.\s+Grade/i.test(line);
}

// ============================================================
// KNOWN FIELD LABEL PREFIXES
// ============================================================
const FIELD_LABELS = ['Quellen:', 'Zeitaufwand:', 'Reichweite:', 'Komponenten:', 'Wirkungsdauer:'];

function getFieldLabel(line) {
  for (const label of FIELD_LABELS) {
    if (line.startsWith(label)) return label;
  }
  return null;
}

// ============================================================
// MAIN PARSER
// ============================================================
function parseZauberbeschreibungen(text) {
  const spells = [];

  const rawLines = text.split(/\r?\n/);

  // Find the start of "Zauberbeschreibungen"
  let startIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim() === 'Zauberbeschreibungen') {
      startIdx = i + 1;
      break;
    }
  }

  if (startIdx === -1) {
    console.error('ERROR: Could not find "Zauberbeschreibungen" section in ZAUBER.txt');
    process.exit(1);
  }

  // Filter noise lines from the description section
  const lines = rawLines.slice(startIdx).map(l => l.trim()).filter(l => !isNoiseLine(l));

  // Collect all spell blocks as {nameIdx, typeIdx} pairs
  // A spell starts with: <name line>\n<type line>
  const spellStarts = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].length > 0 && isTypeLine(lines[i + 1])) {
      // Make sure the name line isn't itself a type line or field label
      if (!isTypeLine(lines[i]) && !getFieldLabel(lines[i])) {
        spellStarts.push({ nameIdx: i, typeIdx: i + 1 });
      }
    }
  }

  console.log(`Found ${spellStarts.length} spell blocks.`);

  for (let s = 0; s < spellStarts.length; s++) {
    const { nameIdx, typeIdx } = spellStarts[s];
    const endIdx = s + 1 < spellStarts.length ? spellStarts[s + 1].nameIdx : lines.length;

    const spellLines = lines.slice(typeIdx + 1, endIdx);

    const name = lines[nameIdx];
    const typeLine = lines[typeIdx];

    const { school, level, isRitual } = parseTypeLine(typeLine);

    // Parse labeled fields using a state machine
    const fieldLines = {
      sources: [],
      zeitaufwand: [],
      reichweite: [],
      komponenten: [],
      wirkungsdauer: [],
    };

    const descriptionLines = [];
    let cantripUpgradeLines = [];
    let atHigherLevelsLines = [];
    let currentField = null;
    let currentSection = 'fields'; // 'fields', 'description', 'cantrip', 'higher'

    for (const line of spellLines) {
      if (currentSection === 'fields') {
        const label = getFieldLabel(line);
        if (label === 'Quellen:') {
          currentField = 'sources';
          fieldLines.sources.push(line.replace(/^Quellen:\s*/, '').trim());
        } else if (label === 'Zeitaufwand:') {
          currentField = 'zeitaufwand';
          fieldLines.zeitaufwand.push(line.replace(/^Zeitaufwand:\s*/, '').trim());
        } else if (label === 'Reichweite:') {
          currentField = 'reichweite';
          fieldLines.reichweite.push(line.replace(/^Reichweite:\s*/, '').trim());
        } else if (label === 'Komponenten:') {
          currentField = 'komponenten';
          fieldLines.komponenten.push(line.replace(/^Komponenten:\s*/, '').trim());
        } else if (label === 'Wirkungsdauer:') {
          currentField = 'wirkungsdauer';
          fieldLines.wirkungsdauer.push(line.replace(/^Wirkungsdauer:\s*/, '').trim());
        } else if (label === null && line.length > 0) {
          if (currentField === 'wirkungsdauer') {
            // After Wirkungsdauer, everything is description
            currentSection = 'description';
            // Check if it starts with upgrade/higher markers
            if (line.startsWith('Zaubertrick-Aufwertung:')) {
              currentSection = 'cantrip';
              cantripUpgradeLines.push(line.replace(/^Zaubertrick-Aufwertung:\s*/, '').trim());
            } else if (line.startsWith('Verwenden von Zauberplätzen höheren Grades:')) {
              currentSection = 'higher';
              atHigherLevelsLines.push(line.replace(/^Verwenden von Zauberplätzen höheren Grades:\s*/, '').trim());
            } else {
              descriptionLines.push(line);
            }
          } else if (currentField !== null) {
            // Continuation of current field (for wrapped lines like Quellen: or Komponenten: M (...))
            fieldLines[currentField].push(line);
          }
        }
        // Empty lines in fields section are ignored
      } else if (currentSection === 'description') {
        if (line.startsWith('Zaubertrick-Aufwertung:')) {
          currentSection = 'cantrip';
          cantripUpgradeLines.push(line.replace(/^Zaubertrick-Aufwertung:\s*/, '').trim());
        } else if (line.startsWith('Verwenden von Zauberplätzen höheren Grades:')) {
          currentSection = 'higher';
          atHigherLevelsLines.push(line.replace(/^Verwenden von Zauberplätzen höheren Grades:\s*/, '').trim());
        } else {
          descriptionLines.push(line);
        }
      } else if (currentSection === 'cantrip') {
        if (line.startsWith('Verwenden von Zauberplätzen höheren Grades:')) {
          currentSection = 'higher';
          atHigherLevelsLines.push(line.replace(/^Verwenden von Zauberplätzen höheren Grades:\s*/, '').trim());
        } else {
          cantripUpgradeLines.push(line);
        }
      } else if (currentSection === 'higher') {
        atHigherLevelsLines.push(line);
      }
    }

    // Join multi-line fields
    const joinField = (arr) => arr.join(' ').replace(/\s+/g, ' ').trim();

    const sourcesRaw = joinField(fieldLines.sources);
    const zeitaufwandRaw = joinField(fieldLines.zeitaufwand);
    const reichweiteRaw = joinField(fieldLines.reichweite);
    const komponentenRaw = joinField(fieldLines.komponenten);
    const wirkungsdauerRaw = joinField(fieldLines.wirkungsdauer);

    const sources = parseSources(sourcesRaw);
    const casting_time = parseCastingTime(zeitaufwandRaw);
    const range = parseRange(reichweiteRaw);
    const components = parseComponents(komponentenRaw);
    const duration = parseDuration(wirkungsdauerRaw);

    const description = descriptionLines
      .filter(l => l.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cantrip_upgrade = cantripUpgradeLines.length > 0
      ? cantripUpgradeLines.join(' ').replace(/\s+/g, ' ').trim()
      : null;

    const at_higher_levels = atHigherLevelsLines.length > 0
      ? atHigherLevelsLines.join(' ').replace(/\s+/g, ' ').trim()
      : null;

    const spell = {
      name,
      level,
      school,
      is_ritual: isRitual,
      sources,
      casting_time,
      range,
      components,
      duration,
      description,
      at_higher_levels,
      cantrip_upgrade,
      optional_specifics: {},
    };

    spells.push(spell);
  }

  return spells;
}

// ============================================================
// MAIN
// ============================================================
console.log(`Reading: ${INPUT_FILE}`);
const text = fs.readFileSync(INPUT_FILE, 'utf8');

console.log('Parsing spells...');
const spells = parseZauberbeschreibungen(text);

console.log(`Parsed ${spells.length} spells.`);

// Write output
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(spells, null, 2), 'utf8');
console.log(`Written: ${OUTPUT_FILE}`);

// Print a summary
const byLevel = {};
for (const s of spells) {
  const key = s.level === 0 ? 'Cantrips' : `Level ${s.level}`;
  byLevel[key] = (byLevel[key] || 0) + 1;
}
console.log('\nSpell count by level:');
for (const [k, v] of Object.entries(byLevel).sort()) {
  console.log(`  ${k}: ${v}`);
}

// Check school names
const schools = new Set(spells.map(s => s.school));
console.log('\nSchool names found:');
for (const school of [...schools].sort()) {
  console.log(`  ${school}`);
}

// Show a few samples
console.log('\nFirst 5 spells:');
for (const s of spells.slice(0, 5)) {
  console.log(`  - "${s.name}" (Level ${s.level}, ${s.school}) ritual=${s.is_ritual} sources=[${s.sources.join(', ')}]`);
  console.log(`    desc: ${s.description.substring(0, 100)}...`);
}
