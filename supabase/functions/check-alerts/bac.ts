export interface Drink {
  id: string;
  timestamp: number; // ms
  volume: number; // ml
  abv: number; // percentage (e.g. 5.0)
  name?: string;
}

export interface Profile {
  weight: number; // kg
  gender: 'male' | 'female';
  metabolismRate: number; // BAC % reduction per hour, default ~0.015
  displayUnit: '%' | '‰';
  height: number; // cm
  age: number; // years
}

export const ETHANOL_DENSITY = 0.789; // g/ml

export function calculateWidmarkR(profile: Profile): number {
  const { weight, height, age, gender } = profile;

  if (gender === 'male') {
    const tbw = 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight);
    const r = tbw / (weight * 0.8);
    return Math.min(Math.max(r, 0.5), 0.9);
  } else {
    const tbw = -2.097 + (0.1069 * height) + (0.2466 * weight);
    const r = tbw / (weight * 0.8);
    return Math.min(Math.max(r, 0.4), 0.8);
  }
}

export function calculateBAC(drinks: Drink[], profile: Profile, currentTime: number = Date.now()): number {
  if (drinks.length === 0) return 0;

  const pastDrinks = drinks.filter(d => d.timestamp <= currentTime);
  if (pastDrinks.length === 0) return 0;

  const sortedDrinks = [...pastDrinks].sort((a, b) => a.timestamp - b.timestamp);

  const weightInGrams = profile.weight * 1000;
  const r = calculateWidmarkR(profile);

  let currentBAC = 0;
  let lastTime = sortedDrinks[0].timestamp;

  for (const drink of sortedDrinks) {
    const hoursPassed = (drink.timestamp - lastTime) / (1000 * 60 * 60);
    currentBAC -= profile.metabolismRate * hoursPassed;
    if (currentBAC < 0) currentBAC = 0;

    const alcoholGrams = drink.volume * (drink.abv / 100) * ETHANOL_DENSITY;
    const addedBAC = (alcoholGrams / (weightInGrams * r)) * 100;
    currentBAC += addedBAC;

    lastTime = drink.timestamp;
  }

  const finalHoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);
  currentBAC -= profile.metabolismRate * finalHoursPassed;

  return Math.max(0, currentBAC);
}
