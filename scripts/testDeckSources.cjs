const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { buildSync } = require('esbuild');

const projectRoot = path.resolve(__dirname, '..');
function loadTypescript(entry) {
  const result = buildSync({
    entryPoints: [path.join(projectRoot, entry)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    external: ['react', 'react-dom'],
    write: false,
  });
  const filename = path.join(projectRoot, '.deck-sources-test.cjs');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(projectRoot);
  compiled._compile(result.outputFiles[0].text, filename);
  return compiled.exports;
}

const { availableDeckSources, normalizeDeckSources, spellWithDeckSources } = loadTypescript('src/lib/deckSources.ts');
const { PrintView } = loadTypescript('src/components/PrintView.tsx');
const spell = {
  id: 'test-spell', name: 'Testzauber', school: 'Bannzauber', level: 1, is_ritual: false,
  sources: ['Feuer', 'Eis'], sources_display: 'Alle',
  casting_time: { base_time: '1 Aktion', condition: null },
  range: { distance: '18 m', area_shape: null, area_size: null },
  duration: { time: '1 Minute', concentration: false },
  components: { verbal: true, somatic: false, material: false, material_details: null, material_cost: null, is_consumed: false },
  description: 'Beschreibung. ', at_higher_levels: null, cantrip_upgrade: null, optional_specifics: {},
};

test('all sources preserves the original display and old deck entry behavior', () => {
  assert.equal(normalizeDeckSources(spell, null), null);
  assert.equal(normalizeDeckSources(spell, ['Eis', 'Feuer']), null);
  assert.equal(spellWithDeckSources(spell, null), spell);
  assert.equal(spellWithDeckSources(spell, null).sources_display, 'Alle');
});

test('only eligible sources can enter a subset, without duplicates', () => {
  assert.deepEqual(normalizeDeckSources(spell, ['Feuer', 'Feuer', 'Wasser']), ['Feuer']);
  assert.throws(() => normalizeDeckSources(spell, []), /mindestens eine Quelle/);
  assert.throws(() => normalizeDeckSources(spell, ['Wasser']), /mindestens eine Quelle/);
});

test('applying a deck subset does not change the catalog spell', () => {
  const deckSpell = spellWithDeckSources(spell, ['Feuer']);
  assert.deepEqual(deckSpell.sources, ['Feuer']);
  assert.equal(deckSpell.sources_display, 'Feuer');
  assert.deepEqual(spell.sources, ['Feuer', 'Eis']);
  assert.equal(spell.sources_display, 'Alle');
});

test('Quellenunabhängig offers no selection even when its sources are expanded', () => {
  const independent = { ...spell, sources_display: 'Quellenunabhängig' };
  assert.deepEqual(availableDeckSources(independent), []);
  assert.equal(normalizeDeckSources(independent, ['Feuer']), null);
  assert.equal(spellWithDeckSources(independent, ['Feuer']), independent);
  assert.equal(spellWithDeckSources(independent, ['Feuer']).sources_display, 'Quellenunabhängig');
});

test('literal independent sources and spells with no eligible sources add directly', () => {
  assert.deepEqual(availableDeckSources({ ...spell, sources_display: '', sources: ['Quellenunabhängig'] }), []);
  assert.equal(normalizeDeckSources({ ...spell, sources: [] }, []), null);
});

test('unavailable saved sources never fall back to advertising all sources', () => {
  const deckSpell = spellWithDeckSources(spell, ['Wasser']);
  assert.deepEqual(deckSpell.sources, []);
  assert.equal(deckSpell.sources_display, 'Keine verfügbaren Quellen');
});

test('every continuation card prints the same chosen subset in its footer', () => {
  const longSpell = { ...spell, description: 'Ein langer Beschreibungstext. '.repeat(100) };
  const deckSpell = spellWithDeckSources(longSpell, ['Feuer']);
  const markup = renderToStaticMarkup(React.createElement(PrintView, { spells: [deckSpell] }));
  const footers = [...markup.matchAll(new RegExp('class="tcg-footer"><span>([^<]*)</span>', 'g'))].map(match => match[1]);
  assert.ok(footers.length > 1);
  assert.ok(footers.every(text => text === 'Feuer'));
});

test('all and independent print footers retain their compact source labels', () => {
  for (const sources_display of ['Alle', 'Quellenunabhängig']) {
    const original = { ...spell, sources_display };
    const markup = renderToStaticMarkup(React.createElement(PrintView, { spells: [spellWithDeckSources(original, null)] }));
    assert.ok(markup.includes(`class="tcg-footer"><span>${sources_display}</span>`));
  }
});
