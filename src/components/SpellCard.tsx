import { FC } from 'react';
import { Spell } from '../types';
import { useSpells } from '../context/SpellContext';

interface SpellCardProps {
  spell: Spell;
}

export const SpellCard: FC<SpellCardProps> = ({ spell }) => {
  const { deck, favorites, addToDeck, removeFromDeck, toggleFavorite } = useSpells();

  const isFavorite = favorites.includes(spell.id);
  const inDeck = deck.includes(spell.id);

  return (
    <div className="glass-panel spell-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary-hover)' }}>
            {spell.name}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Level {spell.level} {spell.school}
          </span>
        </div>
        <button 
          className="btn-icon" 
          onClick={() => toggleFavorite(spell.id)}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          style={{ color: isFavorite ? 'var(--secondary)' : 'var(--text-muted)' }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div><strong>Time:</strong> {spell.castingTime}</div>
        <div><strong>Range:</strong> {spell.range}</div>
        <div><strong>Duration:</strong> {spell.duration}</div>
      </div>

      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flexGrow: 1, borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        {spell.description}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {inDeck ? (
          <button 
            className="btn" 
            onClick={() => removeFromDeck(spell.id)}
            style={{ width: '100%', background: 'var(--bg-surface-hover)', border: '1px solid var(--primary)' }}
          >
            Remove from Deck
          </button>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={() => addToDeck(spell.id)}
            style={{ width: '100%' }}
          >
            Add to Deck
          </button>
        )}
      </div>
    </div>
  );
};
