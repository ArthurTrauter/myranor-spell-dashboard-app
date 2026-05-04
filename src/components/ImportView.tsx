import React from 'react';

/**
 * ImportView – kept for backward compatibility but no longer needed.
 * Spells are now pre-generated from ZAUBER.txt via the parseSpells.cjs script.
 */
export const ImportView: React.FC = () => {
  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2>Zauber importieren</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Alle Zauber werden automatisch aus der ZAUBER.txt Datei geladen.
        Führe <code>node parseSpells.cjs</code> im Projekt-Stammverzeichnis aus, um
        die <code>src/data/spells.json</code> neu zu erzeugen.
      </p>
    </div>
  );
};
