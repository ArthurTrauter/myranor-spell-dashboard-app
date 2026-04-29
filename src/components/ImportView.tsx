import React, { useState } from 'react';
import { useSpells } from '../context/SpellContext';

export const ImportView: React.FC = () => {
  const [text, setText] = useState('');
  const { importSpells } = useSpells();

  const handleImport = () => {
    if (!text.trim()) return;
    const count = importSpells(text);
    alert(`Successfully imported ${count} spells!`);
    setText('');
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2>Import Spells</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Paste the text of the spells from the Myranor PDF below. The parser expects the format: Name, Type/Level, Quellen:, Zeitaufwand:, Reichweite:, Komponenten:, Wirkungsdauer:, followed by the description.
      </p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ablenkender Schmerz&#10;Zaubertrick der Verzauberung&#10;Quellen: Alle&#10;Zeitaufwand: 1 Aktion..."
        style={{
          width: '100%',
          height: '300px',
          background: 'var(--bg-surface)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '1rem',
          fontFamily: 'monospace',
          marginBottom: '1rem',
          resize: 'vertical'
        }}
      />
      
      <button className="btn btn-primary" onClick={handleImport}>
        Parse & Import
      </button>
    </div>
  );
};
