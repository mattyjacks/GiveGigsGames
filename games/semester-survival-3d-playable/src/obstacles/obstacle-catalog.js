export const OBSTACLES = Object.freeze([
  { id: "cat-paper", label: "CAT PAPER", category: "academic", lanes: [0,1,2], height: "low", weight: 1.2 },
  { id: "deadline-stack", label: "DEADLINE STACK", category: "academic", lanes: [0,1,2], height: "high", weight: 1 },
  { id: "missing-notes", label: "MISSING NOTES", category: "academic", lanes: [0,1,2], height: "low", weight: .9 },
  { id: "portal-error", label: "PORTAL ERROR", category: "academic", lanes: [0,1,2], height: "full", weight: .7 },
  { id: "printing-queue", label: "PRINTING QUEUE", category: "campus", lanes: [0,1,2], height: "full", weight: .8 },
  { id: "late-bus", label: "LATE BUS", category: "campus", lanes: [0,1,2], height: "full", weight: .65 },
  { id: "campus-rain", label: "CAMPUS RAIN", category: "campus", lanes: [0,1,2], height: "low", weight: .85 },
  { id: "group-work-drama", label: "GROUP WORK DRAMA", category: "social", lanes: [0,1,2], height: "full", weight: .55 }
]);
export function eligibleObstacles({ semester = 1, distance = 0 } = {}) {
  return OBSTACLES.filter(item => item.category !== "academic" || semester >= 1)
    .map(item => ({ ...item, weight: item.weight * (distance > 1500 ? 1.12 : 1) }));
}
export function chooseObstacle(options = eligibleObstacles(), random = Math.random) {
  if (!options.length) return null;
  const total = options.reduce((sum, item) => sum + Math.max(0, item.weight || 0), 0);
  if (!total) return options[Math.floor(random() * options.length)] || null;
  let roll = random() * total;
  for (const item of options) { roll -= Math.max(0, item.weight || 0); if (roll <= 0) return item; }
  return options[options.length - 1];
}
