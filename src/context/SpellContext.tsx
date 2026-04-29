import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Spell, SpellContextType } from '../types';
import spellsData from '../data/spells.json';

const SpellContext = createContext<SpellContextType | undefined>(undefined);

export const useSpells = () => {
  const context = useContext(SpellContext);
  if (!context) {
    throw new Error('useSpells must be used within a SpellProvider');
  }
  return context;
};

interface SpellProviderProps {
  children: ReactNode;
}

export const SpellProvider: React.FC<SpellProviderProps> = ({ children }) => {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    const savedCustomSpells = localStorage.getItem('myranor_custom_spells');
    if (savedCustomSpells) {
      setSpells([...spellsData, ...JSON.parse(savedCustomSpells)]);
    } else {
      setSpells(spellsData as Spell[]);
    }
    
    // Load from local storage
    const savedDeck = localStorage.getItem('myranor_deck');
    const savedFavs = localStorage.getItem('myranor_favorites');
    
    if (savedDeck) setDeck(JSON.parse(savedDeck));
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('myranor_deck', JSON.stringify(deck));
  }, [deck]);

  useEffect(() => {
    localStorage.setItem('myranor_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToDeck = (id: string) => {
    if (!deck.includes(id)) {
      setDeck([...deck, id]);
    }
  };

  const removeFromDeck = (id: string) => {
    setDeck(deck.filter(spellId => spellId !== id));
  };

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(spellId => spellId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const importSpells = (rawText: string): number => {
    const newSpells: Spell[] = [];
    
    // 1. Normalize the text to handle both single-line and multi-line pastes
    let normalized = rawText.replace(/\\n/g, ' ').replace(/\\s+/g, ' ');

    // 2. Insert newlines before known keywords
    normalized = normalized.replace(/\\s*(Quellen:|Zeitaufwand:|Reichweite:|Komponenten:|Wirkungsdauer:)/g, '\\n$1');

    // 3. Find spell names and types
    // The pattern looks for capitalized words, followed by the spell type (Zaubertrick/zauber des), followed by \\nQuellen:
    const spellPattern = /([A-ZÄÖÜ][^\\.]*?)\\s+((?:Zaubertrick|[\\w-]+zauber)\\s+(?:der|des)\\s+[\\w\\.\\s]+)\\nQuellen:/g;

    normalized = normalized.replace(spellPattern, (match, name, type) => {
      // name might contain the end of the previous description. Split by punctuation.
      const parts = name.split(/[.!?]\\s+/);
      const actualName = parts[parts.length - 1].trim();
      const previousDesc = parts.slice(0, -1).join('. ') + (parts.length > 1 ? '. ' : '');
      
      return previousDesc + '\\n\\n===SPELL_START===\\n' + actualName + '\\n' + type + '\\nQuellen:';
    });

    const spellBlocks = normalized.split('===SPELL_START===').map(b => b.trim()).filter(b => b);

    for (const block of spellBlocks) {
      const lines = block.split('\\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 3) continue;

      const name = lines[0];
      const typeLine = lines[1];
      
      const isCantrip = typeLine.includes('Zaubertrick');
      const levelMatch = typeLine.match(/\\d+/);
      const level = isCantrip ? 0 : (levelMatch ? parseInt(levelMatch[0]) : 1);

      let currentSpell: Spell = {
        id: name.replace(/\\s+/g, '-').toLowerCase() + '-' + Date.now() + Math.random().toString(36).substr(2, 5),
        name,
        level,
        school: 'Unknown',
        castingTime: '',
        range: '',
        duration: '',
        description: ''
      };

      const descLines: string[] = [];

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Quellen:') && currentSpell.school === 'Unknown') {
          currentSpell.school = line.replace('Quellen:', '').trim();
        } else if (line.startsWith('Zeitaufwand:') && currentSpell.castingTime === '') {
          currentSpell.castingTime = line.replace('Zeitaufwand:', '').trim();
        } else if (line.startsWith('Reichweite:') && currentSpell.range === '') {
          currentSpell.range = line.replace('Reichweite:', '').trim();
        } else if (line.startsWith('Komponenten:')) {
          // Ignore components for now
        } else if (line.startsWith('Wirkungsdauer:') && currentSpell.duration === '') {
          currentSpell.duration = line.replace('Wirkungsdauer:', '').trim();
        } else {
          descLines.push(line);
        }
      }

      currentSpell.description = descLines.join(' ').replace(/\\s+/g, ' ').trim();
      if (currentSpell.name && currentSpell.description) {
        newSpells.push(currentSpell);
      }
    }

    if (newSpells.length > 0) {
      const updatedSpells = [...spells, ...newSpells];
      setSpells(updatedSpells);
      
      // Save just the custom ones to localStorage
      const customOnly = updatedSpells.filter(s => !spellsData.find(ds => ds.id === s.id));
      localStorage.setItem('myranor_custom_spells', JSON.stringify(customOnly));
    }

    return newSpells.length;
  };

  const value = {
    spells,
    deck,
    favorites,
    addToDeck,
    removeFromDeck,
    toggleFavorite,
    importSpells,
  };

  return <SpellContext.Provider value={value}>{children}</SpellContext.Provider>;
};
