import { useState } from 'react';
import { useSpells } from './context/SpellContext';
import { SpellList } from './components/SpellList';

function App() {
  const { spells, deck, favorites } = useSpells();
  const [activeTab, setActiveTab] = useState<'catalog' | 'deck' | 'favorites'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState('');

  // Unique schools and levels for filter dropdowns
  const schools = [...new Set(spells.map(s => s.school))].sort();
  const levels = [...new Set(spells.map(s => s.level))].sort((a, b) => a - b);

  // Filter spells based on search query and filters
  const filterSpells = (list: typeof spells) =>
    list.filter(spell => {
      const matchesSearch =
        spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spell.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spell.sources.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLevel = levelFilter === null || spell.level === levelFilter;
      const matchesSchool = !schoolFilter || spell.school === schoolFilter;
      return matchesSearch && matchesLevel && matchesSchool;
    });

  const deckSpells = spells.filter(s => deck.includes(s.id));
  const favoriteSpells = spells.filter(s => favorites.includes(s.id));

  let displaySpells =
    activeTab === 'deck'
      ? filterSpells(deckSpells)
      : activeTab === 'favorites'
      ? filterSpells(favoriteSpells)
      : filterSpells(spells);

  return (
    <div className="app-container">
      <header>
        <h1>Myranor Zauber</h1>
        <p className="subtitle">Verwalte dein magisches Arsenal</p>
      </header>

      <main>
        {/* Tab bar + filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {/* Tabs */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem', gap: '0.5rem', flexGrow: 1 }}>
            <button
              className={`btn ${activeTab === 'catalog' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              Alle Zauber ({spells.length})
            </button>
            <button
              className={`btn ${activeTab === 'deck' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('deck')}
            >
              Mein Deck ({deck.length})
            </button>
            <button
              className={`btn ${activeTab === 'favorites' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favoriten ({favorites.length})
            </button>
          </div>

          {/* Search */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem', minWidth: '220px', flexGrow: 1 }}>
            <input
              type="text"
              placeholder="Zauber suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                outline: 'none',
                padding: '0.5rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Level filter */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem' }}>
            <select
              value={levelFilter ?? ''}
              onChange={e => setLevelFilter(e.target.value === '' ? null : Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                outline: 'none',
                padding: '0.5rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">Alle Grade</option>
              {levels.map(l => (
                <option key={l} value={l}>
                  {l === 0 ? 'Zaubertrick' : `Grad ${l}`}
                </option>
              ))}
            </select>
          </div>

          {/* School filter */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem' }}>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                outline: 'none',
                padding: '0.5rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">Alle Schulen</option>
              {schools.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {displaySpells.length} Zauber gefunden
        </div>

        <SpellList
          spells={displaySpells}
          emptyMessage={
            activeTab === 'catalog'
              ? 'Keine Zauber gefunden.'
              : activeTab === 'deck'
              ? 'Dein Deck ist leer. Füge Zauber aus dem Katalog hinzu!'
              : 'Du hast noch keine Lieblinge.'
          }
        />
      </main>
    </div>
  );
}

export default App;
