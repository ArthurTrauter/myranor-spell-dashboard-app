import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Spell, SpellContextType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { normalizeDeckSources, DeckSourceSelection } from '../lib/deckSources';

interface DeckEntry {
  spell_id: string;
  selected_sources?: string[] | null;
}

interface SpellWithSources extends Omit<Spell, 'sources'> {
  spell_sources: Array<{ sources: { name: string } | null }> | null;
}

const SpellContext = createContext<SpellContextType | undefined>(undefined);

export const useSpells = () => {
  const context = useContext(SpellContext);
  if (!context) throw new Error('useSpells must be used within a SpellProvider');
  return context;
};

interface SpellProviderProps {
  children: ReactNode;
}

export const SpellProvider: React.FC<SpellProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  const [spells, setSpells] = useState<Spell[]>([]);
  const [deckEntries, setDeckEntries] = useState<DeckEntry[]>([]);
  const deck = deckEntries.map(entry => entry.spell_id);
  const deckSources = Object.fromEntries(
    deckEntries.map(entry => [entry.spell_id, entry.selected_sources ?? null]),
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingSpells, setLoadingSpells] = useState(true);
  const [loadingUser, setLoadingUser] = useState(false);

  // ---------------------------------------------------------------
  // Load all spells from Supabase (once on mount)
  // ---------------------------------------------------------------
  useEffect(() => {
    const fetchSpells = async () => {
      setLoadingSpells(true);
      const { data, error } = await supabase
        .from('spells')
        .select(`
          *,
          spell_sources (
            sources (
              name
            )
          )
        `)
        .order('level', { ascending: true })
        .order('name', { ascending: true })
        .returns<SpellWithSources[]>();

      if (error) {
        console.error('Error fetching spells:', error.message);
      } else {
        // Map nested relational data back to a flat sources array
        const mappedSpells = (data ?? []).map(spell => ({
          ...spell,
          sources: spell.spell_sources?.flatMap(ss => ss.sources ? [ss.sources.name] : []) ?? []
        }));
        setSpells(mappedSpells as Spell[]);
      }
      setLoadingSpells(false);
    };

    fetchSpells();
  }, []);

  // ---------------------------------------------------------------
  // Load deck & favorites for the current user
  // ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setDeckEntries([]);
    setFavorites([]);
    setLoadingUser(Boolean(userId));
    if (!userId) return;

    const loadUserData = async () => {
      try {
        const [deckRes, favsRes] = await Promise.all([
          supabase.from('user_decks').select('*').eq('user_id', userId).returns<DeckEntry[]>(),
          supabase.from('user_favorites').select('spell_id').eq('user_id', userId),
        ]);
        if (cancelled) return;

        if (deckRes.error) console.error('Error fetching deck:', deckRes.error.message);
        else setDeckEntries(deckRes.data ?? []);

        if (favsRes.error) console.error('Error fetching favorites:', favsRes.error.message);
        else setFavorites((favsRes.data ?? []).map(row => row.spell_id));
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };
    void loadUserData();
    return () => { cancelled = true; };
  }, [userId]);

  // ---------------------------------------------------------------
  // Deck mutations
  // ---------------------------------------------------------------
  const addToDeck = async (spellId: string, sources: DeckSourceSelection = null) => {
    if (!userId) throw new Error('Bitte melde dich an.');
    if (deck.includes(spellId)) return;
    const spell = spells.find(item => item.id === spellId);
    if (!spell) throw new Error('Der Zauber wurde nicht gefunden.');
    const selectedSources = normalizeDeckSources(spell, sources);
    const entry = { spell_id: spellId, selected_sources: selectedSources };
    setDeckEntries(prev => [...prev, entry]);

    try {
      const { error } = await supabase.from('user_decks').insert({
        user_id: userId,
        spell_id: spellId,
        ...(selectedSources === null ? {} : { selected_sources: selectedSources }),
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error adding to deck:', error);
      if (currentUserId.current === userId) {
        setDeckEntries(prev => prev.filter(item => item.spell_id !== spellId));
      }
      throw new Error('Der Zauber mit seiner Quellenauswahl konnte nicht gespeichert werden.');
    }
  };

  const removeFromDeck = async (spellId: string) => {
    if (!userId) throw new Error('Bitte melde dich an.');
    const entry = deckEntries.find(item => item.spell_id === spellId);
    if (!entry) return;
    setDeckEntries(prev => prev.filter(item => item.spell_id !== spellId));

    try {
      const { error } = await supabase.from('user_decks').delete()
        .eq('user_id', userId).eq('spell_id', spellId);
      if (error) throw error;
    } catch (error) {
      console.error('Error removing from deck:', error);
      if (currentUserId.current === userId) {
        setDeckEntries(prev => prev.some(item => item.spell_id === spellId) ? prev : [...prev, entry]);
      }
      throw new Error('Der Zauber konnte nicht aus dem Deck entfernt werden.');
    }
  };

  // ---------------------------------------------------------------
  // Favorites mutations
  // ---------------------------------------------------------------
  const toggleFavorite = async (spellId: string) => {
    if (!user) return;

    if (favorites.includes(spellId)) {
      setFavorites(prev => prev.filter(id => id !== spellId)); // optimistic
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('spell_id', spellId);

      if (error) {
        console.error('Error removing favorite:', error.message);
        setFavorites(prev => [...prev, spellId]); // rollback
      }
    } else {
      setFavorites(prev => [...prev, spellId]); // optimistic
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, spell_id: spellId });

      if (error) {
        console.error('Error adding favorite:', error.message);
        setFavorites(prev => prev.filter(id => id !== spellId)); // rollback
      }
    }
  };

  const value: SpellContextType = {
    spells,
    deck,
    deckSources,
    favorites,
    loadingSpells,
    loadingUser,
    addToDeck,
    removeFromDeck,
    toggleFavorite,
  };

  return <SpellContext.Provider value={value}>{children}</SpellContext.Provider>;
};
