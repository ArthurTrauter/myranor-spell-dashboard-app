import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Spell, SpellContextType } from '../types';
import rawSpellsData from '../data/spells.json';

// Generate a stable slug-based ID from a spell name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Attach generated IDs to the spell data
const spellsData: Spell[] = (rawSpellsData as Omit<Spell, 'id'>[]).map(spell => ({
  ...spell,
  id: slugify(spell.name),
}));

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
  const [spells] = useState<Spell[]>(spellsData);
  const [deck, setDeck] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const savedDeck = localStorage.getItem('myranor_deck');
    const savedFavs = localStorage.getItem('myranor_favorites');

    if (savedDeck) setDeck(JSON.parse(savedDeck));
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  // Persist deck to local storage on change
  useEffect(() => {
    localStorage.setItem('myranor_deck', JSON.stringify(deck));
  }, [deck]);

  // Persist favorites to local storage on change
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

  const value: SpellContextType = {
    spells,
    deck,
    favorites,
    addToDeck,
    removeFromDeck,
    toggleFavorite,
  };

  return <SpellContext.Provider value={value}>{children}</SpellContext.Provider>;
};
