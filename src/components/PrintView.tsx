import { FC, useMemo } from 'react';
import { Spell } from '../types';
import { TcgCard } from './TcgCard';

interface PrintViewProps {
  spells: Spell[];
}

const PAGE_1_CHAR_LIMIT = 450;
const PAGE_N_CHAR_LIMIT = 750;

function splitTextIntoChunks(text: string): string[] {
  if (!text) return [''];
  
  const chunks: string[] = [];
  let remaining = text;
  let isFirstPage = true;

  while (remaining.length > 0) {
    const limit = isFirstPage ? PAGE_1_CHAR_LIMIT : PAGE_N_CHAR_LIMIT;
    
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    // Try to find a logical break point (period, newline, space) near the limit
    let breakPoint = remaining.lastIndexOf('\n', limit);
    if (breakPoint === -1 || breakPoint < limit * 0.5) {
      breakPoint = remaining.lastIndexOf('. ', limit);
    }
    if (breakPoint === -1 || breakPoint < limit * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', limit);
    }
    if (breakPoint === -1) {
      breakPoint = limit; // forced break
    } else {
      breakPoint += 1; // include the space or period
    }

    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
    isFirstPage = false;
  }

  return chunks;
}

export const PrintView: FC<PrintViewProps> = ({ spells }) => {
  // Flatten spells into an array of card props
  const allCards = useMemo(() => {
    const cards: Array<{ spell: Spell; chunk: string; pageIndex: number; totalPages: number }> = [];

    for (const spell of spells) {
      const chunks = splitTextIntoChunks(spell.description);
      const totalPages = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        cards.push({
          spell,
          chunk: chunks[i],
          pageIndex: i + 1,
          totalPages,
        });
      }
    }

    return cards;
  }, [spells]);

  // Group cards into pages of 9
  const pages: Array<typeof allCards> = [];
  for (let i = 0; i < allCards.length; i += 9) {
    pages.push(allCards.slice(i, i + 9));
  }

  if (spells.length === 0) {
    return (
      <div className="tcg-preview-container" style={{ textAlign: 'center' }}>
        <p>Keine Zauber zum Drucken ausgewählt.</p>
      </div>
    );
  }

  return (
    <>
      <div className="no-print" style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Druckansicht. Drücke Strg+P (oder Cmd+P) zum Drucken. Achte darauf, Hintergrundgrafiken in den Druckeinstellungen zu aktivieren!</p>
      </div>
      
      <div className="tcg-preview-container">
        {pages.map((pageCards, pageIndex) => (
          <div key={pageIndex} className="tcg-page">
            {pageCards.map((card) => (
              <TcgCard
                key={`${card.spell.id}-${card.pageIndex}`}
                spell={card.spell}
                descriptionChunk={card.chunk}
                pageIndex={card.pageIndex}
                totalPages={card.totalPages}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
};
