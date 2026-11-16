import { FC, useState } from 'react';
import { Spell } from '../types';
import { useSpells } from '../context/SpellContext';
import { MultiselectFilter } from './MultiselectFilter';
import { availableDeckSources, isSourceIndependent, spellWithDeckSources } from '../lib/deckSources';

interface SpellCardProps {
  spell: Spell;
}

function formatCastingTime(spell: Spell): string {
  const { base_time, condition } = spell.casting_time;
  if (condition) return `${base_time} (${condition})`;
  return base_time;
}

function formatRange(spell: Spell): string {
  const { distance, area_shape, area_size } = spell.range;
  if (area_shape && area_size) return `${distance} (${area_shape} von ${area_size})`;
  if (area_shape) return `${distance} (${area_shape})`;
  return distance;
}

function formatDuration(spell: Spell): string {
  const { time, concentration } = spell.duration;
  if (concentration) return `Konz. ${time}`;
  return time;
}

function formatComponents(spell: Spell): string {
  const parts: string[] = [];
  if (spell.components.verbal) parts.push('V');
  if (spell.components.somatic) parts.push('G');
  if (spell.components.material) parts.push('M');
  return parts.join(', ');
}

export const SpellCard: FC<SpellCardProps> = ({ spell }) => {
  const { deck, deckSources, favorites, addToDeck, removeFromDeck, toggleFavorite } = useSpells();
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[] | null>(null);
  const [savingDeck, setSavingDeck] = useState(false);
  const [deckError, setDeckError] = useState('');

  const isFavorite = favorites.includes(spell.id);
  const inDeck = deck.includes(spell.id);
  const availableSources = availableDeckSources(spell);
  const displayedSpell = inDeck ? spellWithDeckSources(spell, deckSources[spell.id] ?? null) : spell;
  const sourcesLabel = inDeck && !isSourceIndependent(spell) ? 'Deck-Quellen' : 'Quellen';

  const saveDeck = async (action: () => Promise<void>) => {
    setSavingDeck(true);
    setDeckError('');
    try {
      await action();
      setShowSourcePicker(false);
    } catch (error) {
      setDeckError(error instanceof Error ? error.message : 'Das Deck konnte nicht gespeichert werden.');
    } finally {
      setSavingDeck(false);
    }
  };

  const levelLabel = spell.level === 0
    ? 'Zaubertrick'
    : `${spell.level}. Grad`;

  return (
    <div className="glass-panel spell-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary-hover)' }}>
            {spell.name}
            {spell.is_ritual && (
              <span title="Ritual" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--secondary)', verticalAlign: 'middle' }}>
                (R)
              </span>
            )}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {levelLabel} · {spell.school}
          </span>
        </div>
        <button
          className="btn-icon"
          onClick={() => toggleFavorite(spell.id)}
          title={isFavorite ? "Aus den Favoriten entfernen" : "Zu den Favoriten hinzufügen"}
          style={{ color: isFavorite ? 'var(--secondary)' : 'var(--text-muted)' }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div><strong>Zeitaufwand:</strong> {formatCastingTime(spell)}</div>
        <div><strong>Reichweite:</strong> {formatRange(spell)}</div>
        <div><strong>Wirkungsdauer:</strong> {formatDuration(spell)}</div>
        <div><strong>Komp.:</strong> {formatComponents(spell)}</div>
      </div>

      {displayedSpell.sources_display ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>{sourcesLabel}:</strong> {displayedSpell.sources_display}
        </div>
      ) : displayedSpell.sources.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>{sourcesLabel}:</strong> {displayedSpell.sources.join(', ')}
        </div>
      )}

      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flexGrow: 1, borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        {spell.description}
      </div>

      {spell.cantrip_upgrade && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <strong>Aufwertung:</strong> {spell.cantrip_upgrade}
        </div>
      )}

      {spell.at_higher_levels && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <strong>Höhere Grade:</strong> {spell.at_higher_levels}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {inDeck ? (
          <button
            className="btn"
            disabled={savingDeck}
            onClick={() => void saveDeck(() => removeFromDeck(spell.id))}
            style={{ width: '100%', background: 'var(--bg-surface-hover)', border: '1px solid var(--primary)' }}
          >
            Aus dem Deck entfernen
          </button>
        ) : showSourcePicker ? (
          <div className="deck-source-picker">
            <p>Quellen für mein Deck</p>
            <MultiselectFilter
              label="Quellen"
              options={availableSources}
              selection={selectedSources}
              onChange={setSelectedSources}
            />
            {selectedSources?.length === 0 && (
              <p className="deck-source-hint">Wähle mindestens eine Quelle aus.</p>
            )}
            <div className="deck-source-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={savingDeck || selectedSources?.length === 0}
                onClick={() => void saveDeck(() => addToDeck(spell.id, selectedSources))}
              >
                {savingDeck ? 'Speichern…' : 'Zum Deck hinzufügen'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={savingDeck}
                onClick={() => { setShowSourcePicker(false); setDeckError(''); }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            disabled={savingDeck}
            onClick={() => {
              if (availableSources.length === 0) {
                void saveDeck(() => addToDeck(spell.id));
              } else {
                setSelectedSources(null);
                setDeckError('');
                setShowSourcePicker(true);
              }
            }}
            style={{ width: '100%' }}
          >
            {savingDeck ? 'Speichern…' : 'Zum Deck hinzufügen'}
          </button>
        )}
        {deckError && <p className="deck-source-error" role="alert">{deckError}</p>}
      </div>
    </div>
  );
};
