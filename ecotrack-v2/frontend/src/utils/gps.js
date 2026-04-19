export const toRadians = (degrees) => degrees * (Math.PI / 180);

export const distanceKm = (pointA, pointB) => {
  const R = 6371;
  const dLat = toRadians(pointB.lat - pointA.lat);
  const dLon = toRadians(pointB.lng - pointA.lng);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const classifyTransportMode = (speedKmH) => {
  if (speedKmH <= 6) return 'walking';
  if (speedKmH <= 25) return 'cycling';
  return 'car';
};

export const computeSegmentSpeed = (distanceKm, durationMs) => {
  if (!durationMs || durationMs <= 0) return 0;
  return parseFloat(((distanceKm / (durationMs / 1000)) * 3600).toFixed(1));
};

export const inferTransportMode = (speeds) => {
  if (!speeds.length) return 'unknown';
  const counts = speeds.reduce((acc, speed) => {
    const mode = classifyTransportMode(speed);
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
};

export const emissionFactor = (mode) => {
  switch (mode) {
    case 'walking':
      return 0.01;
    case 'cycling':
      return 0.03;
    case 'car':
      return 0.19;
    default:
      return 0.1;
  }
};

export const computeEmissions = (distanceKm, mode) => parseFloat((distanceKm * emissionFactor(mode)).toFixed(2));
