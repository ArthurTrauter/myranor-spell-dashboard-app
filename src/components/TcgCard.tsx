import { FC } from 'react';
import { Spell } from '../types';

interface TcgCardProps {
  spell: Spell;
  descriptionChunk: string;
  pageIndex: number;
  totalPages: number;
}

function formatCastingTime(spell: Spell): string {
  const { base_time, condition } = spell.casting_time;
  if (condition) return `${base_time} (${condition})`;
  return base_time;
}

function formatRange(spell: Spell): string {
  const { distance, area_shape, area_size } = spell.range;
  if (area_shape && area_size) return `${distance} (${area_shape} ${area_size})`;
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

export const TcgCard: FC<TcgCardProps> = ({ spell, descriptionChunk, pageIndex, totalPages }) => {
  const levelLabel = spell.level === 0 ? 'Zaubertrick' : `Grad ${spell.level}`;
  
  return (
    <div className="tcg-card">
      <div className="tcg-header">
        <div className="tcg-title">
          {spell.name} {spell.is_ritual && '(R)'}
        </div>
        <div className="tcg-subtitle">
          {levelLabel} · {spell.school}
        </div>
      </div>

      {pageIndex === 1 && (
        <div className="tcg-stats">
          <div><strong>Zeit:</strong> {formatCastingTime(spell)}</div>
          <div><strong>Reichweite:</strong> {formatRange(spell)}</div>
          <div><strong>Dauer:</strong> {formatDuration(spell)}</div>
          <div><strong>Komp.:</strong> {formatComponents(spell)}</div>
        </div>
      )}

      <div className="tcg-body">
        {descriptionChunk}
        
        {pageIndex === totalPages && spell.at_higher_levels && (
          <div style={{ marginTop: '2mm' }}>
            <strong>Höhere Grade:</strong> {spell.at_higher_levels}
          </div>
        )}
      </div>

      <div className="tcg-footer">
        <span>{spell.sources_display || spell.sources.join(', ')}</span>
        {totalPages > 1 && (
          <span>{pageIndex} / {totalPages}</span>
        )}
      </div>
    </div>
  );
};
