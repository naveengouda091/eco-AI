const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const chooseTransportType = () => {
  const roll = Math.random();
  if (roll < 0.45) return 'car';
  if (roll < 0.75) return 'cycling';
  return 'walking';
};

const buildDistance = (transportType) => {
  switch (transportType) {
    case 'walking':
      return randomFloat(1, 5, 1);
    case 'cycling':
      return randomFloat(3, 10, 1);
    case 'car':
    default:
      return randomFloat(5, 30, 1);
  }
};

const estimateCarbon = (transportType, distance) => {
  if (transportType === 'walking') return 0;
  if (transportType === 'cycling') return parseFloat((distance * 0.02).toFixed(2));
  return parseFloat((distance * 0.2).toFixed(2));
};

const estimateDeviceUsage = () => randomFloat(2, 6, 1);

export const generateDemoActivityEntries = (days = 7) => {
  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - 1 - index));
    const date = formatDateKey(day);
    const transportType = chooseTransportType();
    const distance = buildDistance(transportType);
    const carbonEmission = estimateCarbon(transportType, distance);
    const deviceUsageHours = estimateDeviceUsage();

    return {
      date,
      transportType,
      distance,
      carbonEmission,
      deviceUsageHours,
      demo: true,
    };
  });
};

export const buildDemoActivities = (entries) => {
  return entries.flatMap((entry) => {
    const deviceEmission = parseFloat((entry.deviceUsageHours * 0.05 * 0.82).toFixed(2));
    return [
      {
        type: 'transport',
        value: entry.distance,
        carbonEmission: entry.carbonEmission,
        date: entry.date,
        transportType: entry.transportType,
        demo: true,
      },
      {
        type: 'device',
        value: entry.deviceUsageHours,
        carbonEmission: deviceEmission,
        date: entry.date,
        demo: true,
      },
    ];
  });
};

export const buildDemoDeviceUsageHistory = (entries) => {
  return entries.map((entry) => ({
    userId: null,
    date: entry.date,
    screenTimeSeconds: Math.round(entry.deviceUsageHours * 3600),
    energyConsumed: parseFloat((entry.deviceUsageHours * 0.05).toFixed(4)),
    carbonEmission: parseFloat((entry.deviceUsageHours * 0.05 * 0.82).toFixed(4)),
    demo: true,
  }));
};

export const isBackendUnavailableError = (error) => {
  if (!error) return false;
  const normalized = error.message?.toLowerCase() || '';
  return /failed to fetch|networkerror|network request failed|fetch error|service unavailable|gateway timeout/.test(normalized);
};
