const VEHICLES = [
  ["late bus", "late university bus"],
  ["matatu", "matatu"],
  ["shuttle", "university shuttle"],
  ["bus", "bus"],
  ["truck", "truck"],
  ["van", "van"],
  ["car", "car"],
  ["vehicle", "vehicle"]
];

const clean = value => String(value ?? "").trim();
const titleCase = value => value.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());

export function buildCollisionReport({
  label = "unknown obstacle",
  action = "lane",
  distance = 0,
  energyBefore = 100,
  energyAfter = 0
} = {}) {
  const obstacle = clean(label) || "unknown obstacle";
  const normal = obstacle.toLowerCase();
  const vehicle = VEHICLES.find(([needle]) => normal.includes(needle));
  const vehicleName = vehicle?.[1] ?? null;
  const damage = Math.max(0, Number(energyBefore) - Number(energyAfter));
  const severity = Number(energyAfter) <= 0 || damage >= 32 ? "severe" : "minor";

  let mistake;
  let advice;
  if (action === "jump") {
    mistake = "The obstacle reached your lane before your jump cleared it.";
    advice = "Watch the approach distance and jump earlier, allowing time for the landing.";
  } else if (action === "slide") {
    mistake = "You did not get low enough, or your slide started too late.";
    advice = "Begin the slide before entering the obstacle zone and let the slide finish cleanly.";
  } else {
    mistake = "You remained in the occupied lane when the obstacle reached you.";
    advice = "Read the traffic pattern sooner and move into a clear lane before the approach.";
  }

  const subject = vehicleName
    ? `You collided with the ${vehicleName}.`
    : `You collided with ${obstacle}.`;
  const impact = severity === "severe"
    ? "The impact exhausted your remaining energy and ended the run."
    : "The impact cost you energy, but the run continued.";

  return Object.freeze({
    title: vehicleName ? `Collision: ${titleCase(vehicleName)}` : `Collision: ${titleCase(obstacle)}`,
    summary: subject,
    detail: `${impact} ${mistake}`,
    advice,
    severity,
    distance: Math.max(0, Math.floor(Number(distance) || 0)),
    damage: Math.round(damage)
  });
}
