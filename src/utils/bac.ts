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
}

export const GENDER_CONSTANTS = {
  male: 0.68,
  female: 0.55,
};

export const ETHANOL_DENSITY = 0.789; // g/ml

/**
 * Calculates current BAC based on Widmark formula.
 * BAC = (Alcohol in grams / (Weight in grams * r)) * 100 - (Metabolism * hours)
 * 
 * Note: This implementation assumes instant absorption for simplicity, 
 * which is common for basic BAC trackers.
 */
export function calculateBAC(drinks: Drink[], profile: Profile, currentTime: number = Date.now()): number {
  if (drinks.length === 0) return 0;

  // Filter drinks that haven't happened yet (if any)
  const pastDrinks = drinks.filter(d => d.timestamp <= currentTime);
  if (pastDrinks.length === 0) return 0;

  // Sort drinks by timestamp to find the start
  const sortedDrinks = [...pastDrinks].sort((a, b) => a.timestamp - b.timestamp);
  const firstDrinkTime = sortedDrinks[0].timestamp;
  const hoursSinceFirstDrink = (currentTime - firstDrinkTime) / (1000 * 60 * 60);

  let totalAlcoholGrams = 0;
  for (const drink of sortedDrinks) {
    totalAlcoholGrams += drink.volume * (drink.abv / 100) * ETHANOL_DENSITY;
  }

  const weightInGrams = profile.weight * 1000;
  const r = GENDER_CONSTANTS[profile.gender];

  // Widmark Formula
  const peakBAC = (totalAlcoholGrams / (weightInGrams * r)) * 100;
  const metabolized = profile.metabolismRate * hoursSinceFirstDrink;

  const currentBAC = Math.max(0, peakBAC - metabolized);
  return currentBAC;
}

/**
 * Calculates time until BAC reaches zero in hours.
 */
export function calculateTimeToZero(drinks: Drink[], profile: Profile, currentTime: number = Date.now()): number {
  const currentBAC = calculateBAC(drinks, profile, currentTime);
  if (currentBAC <= 0) return 0;

  return currentBAC / profile.metabolismRate;
}

/**
 * Formats BAC to a standard display (e.g. 0.050)
 */
export function formatBAC(bac: number): string {
  return bac.toFixed(3);
}
