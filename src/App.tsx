import { useState } from 'react';
import { useSpells } from './context/SpellContext';
import { SpellList } from './components/SpellList';
import { ImportView } from './components/ImportView';

function App() {
  const { spells, deck, favorites } = useSpells();
  const [activeTab, setActiveTab] = useState<'catalog' | 'deck' | 'favorites' | 'import'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter spells based on search query
  const filteredSpells = spells.filter(spell => 
    spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spell.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get spells for current view
  const deckSpells = spells.filter(s => deck.includes(s.id));
  const favoriteSpells = spells.filter(s => favorites.includes(s.id));

  let displaySpells = filteredSpells;
  if (activeTab === 'deck') {
    displaySpells = deckSpells.filter(spell => spell.name.toLowerCase().includes(searchQuery.toLowerCase()));
  } else if (activeTab === 'favorites') {
    displaySpells = favoriteSpells.filter(spell => spell.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  return (
    <div className="app-container">
      <header>
        <h1>Myranor Spell Deck</h1>
        <p className="subtitle">Manage your magical arsenal</p>
      </header>
      
      <main>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem', gap: '0.5rem', flexGrow: 1 }}>
            <button 
              className={`btn ${activeTab === 'catalog' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              All Spells
            </button>
            <button 
              className={`btn ${activeTab === 'deck' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('deck')}
            >
              My Deck ({deck.length})
            </button>
            <button 
              className={`btn ${activeTab === 'favorites' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favorites ({favorites.length})
            </button>
            <button 
              className={`btn ${activeTab === 'import' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('import')}
              style={{ marginLeft: 'auto' }}
            >
              Import Spells
            </button>
          </div>

          <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem', minWidth: '250px' }}>
            <input 
              type="text" 
              placeholder="Search spells..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                outline: 'none',
                padding: '0.5rem',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {activeTab === 'import' ? (
          <ImportView />
        ) : (
          <SpellList 
            spells={displaySpells} 
            emptyMessage={
              activeTab === 'catalog' ? "No spells found matching your search." :
              activeTab === 'deck' ? "Your deck is empty. Add some spells from the catalog!" :
              "You haven't favorited any spells yet."
            } 
          />
        )}
      </main>
    </div>
  );
}

export default App;
