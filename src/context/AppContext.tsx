import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Drink, Profile } from '../utils/bac';

interface AppContextType {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  drinks: Drink[];
  addDrink: (drink: Omit<Drink, 'id'>) => void;
  removeDrink: (id: string) => void;
  presets: Omit<Drink, 'id' | 'timestamp'>[];
  addPreset: (preset: Omit<Drink, 'id' | 'timestamp'>) => void;
  removePreset: (name: string) => void;
  clearHistory: () => void;
  importData: (data: { profile?: Profile; drinks?: Drink[]; presets?: Omit<Drink, 'id' | 'timestamp'>[] }) => void;
}

const DEFAULT_PROFILE: Profile = {
  weight: 75,
  gender: 'male',
  metabolismRate: 0.015,
  displayUnit: '%',
  height: 175,
  age: 30,
};

const DEFAULT_PRESETS: Omit<Drink, 'id' | 'timestamp'>[] = [
  { name: 'Beer', volume: 330, abv: 5 },
  { name: 'Large Beer', volume: 500, abv: 5 },
  { name: 'Wine', volume: 150, abv: 12 },
  { name: 'Spirit', volume: 40, abv: 40 },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>(() => {
    const saved = localStorage.getItem('alcoclone_profile');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [drinks, setDrinks] = useState<Drink[]>(() => {
    const saved = localStorage.getItem('alcoclone_drinks');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [presets, setPresets] = useState<Omit<Drink, 'id' | 'timestamp'>[]>(() => {
    const saved = localStorage.getItem('alcoclone_presets');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  useEffect(() => {
    localStorage.setItem('alcoclone_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('alcoclone_drinks', JSON.stringify(drinks));
  }, [drinks]);

  useEffect(() => {
    localStorage.setItem('alcoclone_presets', JSON.stringify(presets));
  }, [presets]);

  const setProfile = (newProfile: Profile) => setProfileState(newProfile);

  const addDrink = (drink: Omit<Drink, 'id'>) => {
    const newDrink: Drink = {
      ...drink,
      id: Math.random().toString(36).substring(2, 9),
    };
    setDrinks(prev => [...prev, newDrink]);
  };

  const removeDrink = (id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id));
  };

  const addPreset = (preset: Omit<Drink, 'id' | 'timestamp'>) => {
    setPresets(prev => [...prev, preset]);
  };

  const removePreset = (name: string) => {
    setPresets(prev => prev.filter(p => p.name !== name));
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all drink history?')) {
      setDrinks([]);
    }
  };

  const importData = (data: { profile?: Profile; drinks?: Drink[]; presets?: Omit<Drink, 'id' | 'timestamp'>[] }) => {
    if (data.profile) setProfileState(data.profile);
    if (data.drinks) setDrinks(data.drinks);
    if (data.presets) setPresets(data.presets);
  };

  return (
    <AppContext.Provider value={{ 
      profile, setProfile, 
      drinks, addDrink, removeDrink,
      presets, addPreset, removePreset,
      clearHistory,
      importData
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
