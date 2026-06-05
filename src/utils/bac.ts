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

export const GENDER_CONSTANTS = {
  male: 0.68,
  female: 0.55,
};

export const ETHANOL_DENSITY = 0.789; // g/ml

/**
 * Calculates the Widmark r factor using Watson formula if possible.
 * Fallback to standard averages if height/age are invalid.
 */
export function calculateWidmarkR(profile: Profile): number {
  const { weight, height, age, gender } = profile;

  if (gender === 'male') {
    // Watson Formula (Male)
    const tbw = 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight);
    const r = tbw / (weight * 0.8);
    // Sanity check: r for men is usually between 0.60 and 0.80
    return Math.min(Math.max(r, 0.5), 0.9);
  } else {
    // Watson Formula (Female)
    const tbw = -2.097 + (0.1069 * height) + (0.2466 * weight);
    const r = tbw / (weight * 0.8);
    // Sanity check: r for women is usually between 0.45 and 0.70
    return Math.min(Math.max(r, 0.4), 0.8);
  }
}

/**
 * Calculates current BAC based on Widmark formula.
 * BAC = (Alcohol in grams / (Weight in grams * r)) * 100 - (Metabolism * hours)
 * 
 * Note: This implementation assumes instant absorption for simplicity, 
 * which is common for basic BAC trackers.
 */
export function calculateBAC(drinks: Drink[], profile: Profile, currentTime: number = Date.now()): number {
  if (drinks.length === 0) return 0;

  // Filter drinks that haven't happened yet
  const pastDrinks = drinks.filter(d => d.timestamp <= currentTime);
  if (pastDrinks.length === 0) return 0;

  // Sort drinks chronologically
  const sortedDrinks = [...pastDrinks].sort((a, b) => a.timestamp - b.timestamp);

  const weightInGrams = profile.weight * 1000;
  const r = calculateWidmarkR(profile);

  let currentBAC = 0;
  let lastTime = sortedDrinks[0].timestamp;

  for (const drink of sortedDrinks) {
    // 1. Calculate hours since the last event (drink)
    const hoursPassed = (drink.timestamp - lastTime) / (1000 * 60 * 60);
    
    // 2. Subtract metabolized BAC since the last event
    currentBAC -= profile.metabolismRate * hoursPassed;
    if (currentBAC < 0) currentBAC = 0;

    // 3. Add the contribution of the new drink
    const alcoholGrams = drink.volume * (drink.abv / 100) * ETHANOL_DENSITY;
    const addedBAC = (alcoholGrams / (weightInGrams * r)) * 100;
    currentBAC += addedBAC;

    // 4. Update the tracker time
    lastTime = drink.timestamp;
  }

  // 5. Final metabolism from the last drink to the current time
  const finalHoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);
  currentBAC -= profile.metabolismRate * finalHoursPassed;

  return Math.max(0, currentBAC);
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

export interface Session {
  id: string;
  drinks: Drink[];
  startTime: number;
  endTime: number;
  totalAlcoholGrams: number;
  peakBAC: number;
}

/**
 * Groups drinks into logical sessions based on a 12-hour gap threshold.
 */
export function groupIntoSessions(drinks: Drink[], profile: Profile): Session[] {
  if (drinks.length === 0) return [];

  const sortedDrinks = [...drinks].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: Session[] = [];
  let currentSessionDrinks: Drink[] = [sortedDrinks[0]];

  for (let i = 1; i < sortedDrinks.length; i++) {
    const prevDrink = sortedDrinks[i - 1];
    const currentDrink = sortedDrinks[i];
    const gap = currentDrink.timestamp - prevDrink.timestamp;

    if (gap > 12 * 3600000) {
      // Gap > 12 hours, start new session
      sessions.push(createSessionObject(currentSessionDrinks, profile));
      currentSessionDrinks = [currentDrink];
    } else {
      currentSessionDrinks.push(currentDrink);
    }
  }

  sessions.push(createSessionObject(currentSessionDrinks, profile));
  
  // Return sessions sorted newest first
  return sessions.sort((a, b) => b.startTime - a.startTime);
}

function createSessionObject(drinks: Drink[], profile: Profile): Session {
  const totalAlcoholGrams = drinks.reduce((sum, d) => sum + (d.volume * (d.abv / 100) * ETHANOL_DENSITY), 0);
  
  // Calculate Peak BAC during this specific session
  let peakBAC = 0;
  const startTime = drinks[0].timestamp;
  const lastDrinkTime = drinks[drinks.length - 1].timestamp;
  const endTime = lastDrinkTime + (calculateTimeToZero(drinks, profile, lastDrinkTime) * 3600000);

  // Sample BAC every 15 mins to find peak
  for (let t = startTime; t <= endTime; t += 15 * 60000) {
    const bac = calculateBAC(drinks, profile, t);
    if (bac > peakBAC) peakBAC = bac;
  }

  return {
    id: `session-${startTime}`,
    drinks: [...drinks].sort((a, b) => b.timestamp - a.timestamp),
    startTime,
    endTime,
    totalAlcoholGrams,
    peakBAC
  };
}

/**
 * Formats BAC to a standard display based on unit.
 */
export function formatBAC(bac: number, unit: '%' | '‰' = '%'): string {
  if (unit === '‰') {
    return (bac * 10).toFixed(2);
  }
  return bac.toFixed(3);
}
