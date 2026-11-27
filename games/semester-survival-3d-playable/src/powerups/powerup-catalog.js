export const POWERUPS = Object.freeze([
  { id: "coffee", label: "COFFEE", rarity: "common", duration: 6, effect: "energy", value: 20, weight: 1.4 },
  { id: "mandazi", label: "MANDAZI", rarity: "common", duration: 5, effect: "energy", value: 12, weight: 1.2 },
  { id: "past-papers", label: "PAST PAPERS", rarity: "uncommon", duration: 8, effect: "focus", value: 1, weight: .8 },
  { id: "calculator", label: "CALCULATOR", rarity: "uncommon", duration: 7, effect: "shield", value: 1, weight: .7 },
  { id: "good-wifi", label: "GOOD WI-FI", rarity: "rare", duration: 9, effect: "magnet", value: 1, weight: .45 },
  { id: "helb-disbursement", label: "HELB DISBURSEMENT", rarity: "legendary", duration: 0, effect: "coins", value: 100, weight: .12 },
  { id: "mamas-cooking", label: "MAMA'S COOKING", rarity: "legendary", duration: 10, effect: "energy", value: 45, weight: .1 }
]);
export function rollPowerup(random = Math.random) {
  const total = POWERUPS.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of POWERUPS) { roll -= item.weight; if (roll <= 0) return item; }
  return POWERUPS[POWERUPS.length - 1];
}
