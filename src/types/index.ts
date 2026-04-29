export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
}

export interface SpellContextType {
  spells: Spell[];
  deck: string[];
  favorites: string[];
  addToDeck: (id: string) => void;
  removeFromDeck: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importSpells: (rawText: string) => number;
}
