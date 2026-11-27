const PROFILES = Object.freeze({
  High: Object.freeze({ pixelRatioCap: 1.5, shadowMapSize: 1024, shadows: true }),
  Balanced: Object.freeze({ pixelRatioCap: 1.15, shadowMapSize: 768, shadows: true }),
  Performance: Object.freeze({ pixelRatioCap: 0.9, shadowMapSize: 512, shadows: false })
});

export function resolveQualityProfile(value, devicePixelRatio = 1) {
  const profile = PROFILES[value] || PROFILES.Balanced;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Object.freeze({
    ...profile,
    pixelRatio: Math.min(dpr, profile.pixelRatioCap)
  });
}
