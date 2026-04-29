import { FC } from 'react';
import { Spell } from '../types';
import { SpellCard } from './SpellCard';

interface SpellListProps {
  spells: Spell[];
  emptyMessage?: string;
}

export const SpellList: FC<SpellListProps> = ({ spells, emptyMessage = "No spells found." }) => {
  if (spells.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card-grid">
      {spells.map(spell => (
        <SpellCard key={spell.id} spell={spell} />
      ))}
    </div>
  );
};
