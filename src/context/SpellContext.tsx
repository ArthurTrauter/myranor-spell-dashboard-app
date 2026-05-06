import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Spell, SpellContextType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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

  const [spells, setSpells] = useState<Spell[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
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
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching spells:', error.message);
      } else {
        // Map nested relational data back to a flat sources array
        const mappedSpells = (data ?? []).map((spell: any) => ({
          ...spell,
          sources: spell.spell_sources?.map((ss: any) => ss.sources?.name).filter(Boolean) ?? []
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
  const loadUserData = useCallback(async () => {
    if (!user) {
      setDeck([]);
      setFavorites([]);
      return;
    }

    setLoadingUser(true);

    const [deckRes, favsRes] = await Promise.all([
      supabase
        .from('user_decks')
        .select('spell_id')
        .eq('user_id', user.id),
      supabase
        .from('user_favorites')
        .select('spell_id')
        .eq('user_id', user.id),
    ]);

    if (deckRes.error) console.error('Error fetching deck:', deckRes.error.message);
    else setDeck((deckRes.data ?? []).map(r => r.spell_id));

    if (favsRes.error) console.error('Error fetching favorites:', favsRes.error.message);
    else setFavorites((favsRes.data ?? []).map(r => r.spell_id));

    setLoadingUser(false);
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ---------------------------------------------------------------
  // Deck mutations
  // ---------------------------------------------------------------
  const addToDeck = async (spellId: string) => {
    if (!user || deck.includes(spellId)) return;
    setDeck(prev => [...prev, spellId]); // optimistic update

    const { error } = await supabase
      .from('user_decks')
      .insert({ user_id: user.id, spell_id: spellId });

    if (error) {
      console.error('Error adding to deck:', error.message);
      setDeck(prev => prev.filter(id => id !== spellId)); // rollback
    }
  };

  const removeFromDeck = async (spellId: string) => {
    if (!user) return;
    setDeck(prev => prev.filter(id => id !== spellId)); // optimistic update

    const { error } = await supabase
      .from('user_decks')
      .delete()
      .eq('user_id', user.id)
      .eq('spell_id', spellId);

    if (error) {
      console.error('Error removing from deck:', error.message);
      setDeck(prev => [...prev, spellId]); // rollback
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
    favorites,
    loadingSpells,
    loadingUser,
    addToDeck,
    removeFromDeck,
    toggleFavorite,
  };

  return <SpellContext.Provider value={value}>{children}</SpellContext.Provider>;
};
