import { FC } from 'react';
import { Spell } from '../types';

interface TcgCardProps {
  spell: Spell;
  descriptionChunk: string;
  pageIndex: number;
  totalPages: number;
}

function formatRange(spell: Spell): string {
  const { distance, area_shape, area_size } = spell.range;
  if (area_shape && area_size) return `${distance} (${area_shape} ${area_size})`;
  if (area_shape) return `${distance} (${area_shape})`;
  return distance;
}

function formatComponents(spell: Spell): string {
  const parts: string[] = [];
  if (spell.components.verbal) parts.push('V');
  if (spell.components.somatic) parts.push('G');
  if (spell.components.material) parts.push('M');
  return parts.join(', ');
}

const statIconPaths = {
  casting: 'M3 19 15 7 17 9 5 21Z M13 9l2 2 M18 2v4 M16 4h4 M6 2v4 M4 4h4 M20 12v4 M18 14h4',
  range: 'M3 8h18 M6 5 3 8 6 11 M18 5 21 8 18 11 M4 15h16v5H4Z M8 15v2 M12 15v3 M16 15v2',
  duration: 'M6 3h12 M6 21h12 M7 3v4c0 2 2 3 5 5-3 2-5 3-5 5v4 M17 3v4c0 2-2 3-5 5 3 2 5 3 5 5v4 M8 7h8 M8 18l4-3 4 3',
  components: 'M12 3 3 8v9l9 5 9-5V8Z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5',
};

function TcgStat({ label, value, icon, detail }: {
  label: string;
  value: string;
  icon: keyof typeof statIconPaths;
  detail?: string | null;
}) {
  return (
    <div className="tcg-stat" role="group" aria-label={label}>
      <div className="tcg-stat-icon-circle" title={label}>
        <svg
          className="tcg-stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={statIconPaths[icon]} />
        </svg>
      </div>
      <div className="tcg-stat-value">
        <div>
          <span>{value || '—'}</span>
          {detail && <span className="tcg-stat-detail">{detail}</span>}
        </div>
      </div>
    </div>
  );
}

export const TcgCard: FC<TcgCardProps> = ({ spell, descriptionChunk, pageIndex, totalPages }) => {
  const levelLabel = spell.level === 0 ? 'Zaubertrick' : `Grad ${spell.level}`;
  
  return (
    <div className="tcg-card">
      <div className="tcg-header">
        <div className={`tcg-title-row${pageIndex === 1 ? ' tcg-title-row--with-grade' : ''}`}>
          <div className="tcg-title">
            <span>{spell.name}</span>
            <div className="tcg-subtitle-row">
              <span className="tcg-subtitle">{spell.school}</span>
              {pageIndex === 1 && (spell.duration.concentration || spell.is_ritual) && (
                <span className="tcg-header-icons">
                  {spell.duration.concentration && (
                    <svg
                      className="tcg-header-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      role="img"
                      aria-label="Konzentration"
                    >
                      <title>Konzentration</title>
                      <path d="M12 18V5 M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
                      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
                      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77 M6.003 5.125a4 4 0 0 0-2.526 5.77" />
                      <path d="M18 18a4 4 0 0 0 2-7.464 M6 18a4 4 0 0 1-2-7.464" />
                      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
                    </svg>
                  )}
                  {spell.is_ritual && (
                    <svg
                      className="tcg-header-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      role="img"
                      aria-label="Als Ritual wirkbar"
                    >
                      <title>Als Ritual wirkbar</title>
                      <path d="M12 2c-3 3-3 6 0 6s3-3 0-6Z M9 10h6v10H9Z M7 22h10 M12 8v2" />
                    </svg>
                  )}
                </span>
              )}
            </div>
          </div>
          {pageIndex === 1 && (
            <div className="tcg-grade" aria-label={levelLabel}>
              <svg
                className="tcg-grade-shape"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polygon
                  points="26,3 74,3 97,50 74,97 26,97 3,50"
                  fill="white"
                  stroke="#111"
                  strokeWidth="4"
                  strokeLinejoin="miter"
                />
              </svg>
              <span>{spell.level}</span>
            </div>
          )}
        </div>
      </div>

      {pageIndex === 1 && (
        <div className="tcg-stats">
          <TcgStat
            label="Zeit"
            value={spell.casting_time.base_time}
            detail={spell.casting_time.condition}
            icon="casting"
          />
          <TcgStat label="Reichweite" value={formatRange(spell)} icon="range" />
          <TcgStat label="Dauer" value={spell.duration.time} icon="duration" />
          <TcgStat label="Komponenten" value={formatComponents(spell)} icon="components" />
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
