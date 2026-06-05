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
 * Generates data points for a BAC graph.
 */
export function generateBACGraphData(drinks: Drink[], profile: Profile, now: number = Date.now()): { time: number; label: string; bac: number }[] {
  if (drinks.length === 0) return [];

  const sortedDrinks = [...drinks].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sortedDrinks[0].timestamp;
  const timeToZero = calculateTimeToZero(drinks, profile, now);
  const endTime = now + (timeToZero * 3600000);

  // Buffer before and after
  const graphStart = startTime - (30 * 60000); // 30 mins before first drink
  const graphEnd = endTime + (60 * 60000); // 1 hour after sober

  const data = [];
  const step = 30 * 60000; // 30 minute intervals

  for (let t = graphStart; t <= graphEnd; t += step) {
    const bac = calculateBAC(drinks, profile, t);
    data.push({
      time: t,
      label: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bac: parseFloat(bac.toFixed(4))
    });
    
    // Ensure we include 'now' specifically
    if (t < now && t + step > now) {
      const currentBac = calculateBAC(drinks, profile, now);
      data.push({
        time: now,
        label: 'Now',
        bac: parseFloat(currentBac.toFixed(4))
      });
    }
  }

  return data;
}

/**
 * Formats BAC to a standard display (e.g. 0.050)
 */
export function formatBAC(bac: number): string {
  return bac.toFixed(3);
}
