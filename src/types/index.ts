// Spell data structure matching spellTemplate.json

export interface CastingTime {
  base_time: string;
  condition: string | null;
}

export interface SpellRange {
  distance: string;
  area_shape: string | null;
  area_size: string | null;
}

export interface Components {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  material_details: string | null;
  material_cost: string | null;
  is_consumed: boolean;
}

export interface Duration {
  time: string;
  concentration: boolean;
}

export interface Spell {
  /** Slug-based ID, e.g. "ablenkender-schmerz" */
  id: string;
  name: string;
  level: number;
  school: string;
  is_ritual: boolean;
  sources: string[];
  casting_time: CastingTime;
  range: SpellRange;
  components: Components;
  duration: Duration;
  description: string;
  at_higher_levels: string | null;
  cantrip_upgrade: string | null;
  optional_specifics: Record<string, unknown>;
}

export interface SpellContextType {
  spells: Spell[];
  deck: string[];
  favorites: string[];
  /** True while the initial spells list is being fetched from Supabase */
  loadingSpells: boolean;
  /** True while per-user deck/favorites data is being fetched */
  loadingUser: boolean;
  addToDeck: (id: string) => Promise<void>;
  removeFromDeck: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}
