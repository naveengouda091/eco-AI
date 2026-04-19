export const DEVICE_USAGE_DAILY_KEY = 'ecotrack_device_usage_daily';
export const DEVICE_USAGE_QUEUE_KEY = 'ecotrack_device_usage_queue';
export const DEVICE_USAGE_SESSION_KEY = 'ecotrack_device_usage_session';

export const formatDateKey = (value = new Date()) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

export const formatDayLabel = (dateKey) => {
  const date = new Date(dateKey);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

export const secondsToHours = (seconds) => seconds / 3600;
export const formatHours = (seconds) => (secondsToHours(seconds)).toFixed(2);
export const computeEnergyFromSeconds = (seconds) => parseFloat(((seconds / 3600) * 0.05).toFixed(4));
export const computeCarbonFromEnergy = (energy) => parseFloat((energy * 0.82).toFixed(4));
export const computeCarbonFromSeconds = (seconds) => computeCarbonFromEnergy(computeEnergyFromSeconds(seconds));

export const buildDailyWindow = (days = 7) => {
  const entries = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = formatDateKey(date);
    entries.push({ key, label: formatDayLabel(key) });
  }
  return entries;
};

export const buildCompareWindow = (dailyMap) => {
  const now = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const target = new Date(now);
    target.setDate(target.getDate() - (6 - index));
    const currentKey = formatDateKey(target);
    const previousKey = formatDateKey(new Date(target.getTime() - 7 * 24 * 60 * 60 * 1000));
    return {
      name: target.toLocaleDateString(undefined, { weekday: 'short' }),
      'This Week': computeCarbonFromSeconds(dailyMap[currentKey] || 0),
      'Last Week': computeCarbonFromSeconds(dailyMap[previousKey] || 0),
    };
  });
};
