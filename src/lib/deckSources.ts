import type { Spell } from '../types';

export type DeckSourceSelection = string[] | null;

export function isSourceIndependent(spell: Spell): boolean {
  return spell.sources_display?.trim().toLocaleLowerCase('de') === 'quellenunabhängig' ||
    spell.sources.some(source => source.trim().toLocaleLowerCase('de') === 'quellenunabhängig');
}

export function availableDeckSources(spell: Spell): string[] {
  return isSourceIndependent(spell) ? [] : [...new Set(spell.sources)].sort();
}

export function normalizeDeckSources(spell: Spell, selection: DeckSourceSelection): DeckSourceSelection {
  const available = availableDeckSources(spell);
  if (selection === null || available.length === 0) return null;

  const selected = available.filter(source => selection.includes(source));
  if (selected.length === 0) throw new Error('Wähle mindestens eine Quelle aus.');
  return selected.length === available.length ? null : selected;
}

export function spellWithDeckSources(spell: Spell, selection: DeckSourceSelection): Spell {
  if (selection === null || isSourceIndependent(spell)) return spell;
  const sources = spell.sources.filter(source => selection.includes(source));
  return {
    ...spell,
    sources,
    sources_display: sources.length > 0 ? sources.join(', ') : 'Keine verfügbaren Quellen',
  };
}
