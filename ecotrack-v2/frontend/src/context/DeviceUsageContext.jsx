import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { fetchDeviceUsageHistory, postDeviceUsage } from '../services/api.js';
import {
  DEVICE_USAGE_DAILY_KEY,
  DEVICE_USAGE_QUEUE_KEY,
  DEVICE_USAGE_SESSION_KEY,
  formatDateKey,
  buildCompareWindow,
  computeCarbonFromSeconds,
  computeEnergyFromSeconds,
  formatHours,
} from '../utils/deviceUsage.js';
import { generateDemoActivityEntries, buildDemoDeviceUsageHistory, isBackendUnavailableError } from '../utils/demoData.js';

const DeviceUsageContext = createContext();

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value || 'null') || fallback;
  } catch {
    return fallback;
  }
};

export function DeviceUsageProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [backendHistory, setBackendHistory] = useState([]);
  const [localDaily, setLocalDaily] = useState({});
  const [active, setActive] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  const sessionRef = useRef(null);
  const activeRef = useRef(false);
  const intervalRef = useRef(null);
  const queueRef = useRef([]);

  const loadLocalDaily = () => safeJsonParse(localStorage.getItem(DEVICE_USAGE_DAILY_KEY), {});
  const loadQueue = () => safeJsonParse(localStorage.getItem(DEVICE_USAGE_QUEUE_KEY), []);
  const loadSession = () => safeJsonParse(localStorage.getItem(DEVICE_USAGE_SESSION_KEY), null);

  const persistLocalDaily = (value) => {
    localStorage.setItem(DEVICE_USAGE_DAILY_KEY, JSON.stringify(value));
    setLocalDaily(value);
  };

  const persistQueue = (queue) => {
    localStorage.setItem(DEVICE_USAGE_QUEUE_KEY, JSON.stringify(queue));
    queueRef.current = queue;
  };

  const persistSession = (payload) => {
    if (payload) {
      localStorage.setItem(DEVICE_USAGE_SESSION_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(DEVICE_USAGE_SESSION_KEY);
    }
  };

  const mergeDailyMap = useMemo(() => {
    const merged = { ...backendHistory.reduce((acc, usage) => {
      const key = formatDateKey(usage.date);
      acc[key] = usage.screenTimeSeconds;
      return acc;
    }, {}), ...localDaily };
    return merged;
  }, [backendHistory, localDaily]);

  const todayKey = formatDateKey(new Date());
  const yesterdayKey = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const todaySeconds = mergeDailyMap[todayKey] || 0;
  const yesterdaySeconds = mergeDailyMap[yesterdayKey] || 0;

  const displayedTodaySeconds = active ? todaySeconds + liveSeconds : todaySeconds;
  const todayHours = Number(formatHours(displayedTodaySeconds));
  const todayEnergy = computeEnergyFromSeconds(displayedTodaySeconds);
  const todayCarbon = computeCarbonFromSeconds(displayedTodaySeconds);

  const last7Days = useMemo(() => {
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = formatDateKey(date);
      days.push({
        date: key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        seconds: mergeDailyMap[key] || 0,
        energy: computeEnergyFromSeconds(mergeDailyMap[key] || 0),
        carbon: computeCarbonFromSeconds(mergeDailyMap[key] || 0),
      });
    }
    return days;
  }, [mergeDailyMap]);

  const weeklyChange = useMemo(() => {
    const currentWeekTotal = last7Days.reduce((sum, day) => sum + day.seconds, 0);
    const previousWeekTotal = Array.from({ length: 7 }).reduce((sum, _, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (7 + index));
      const key = formatDateKey(date);
      return sum + (mergeDailyMap[key] || 0);
    }, 0);

    if (!previousWeekTotal) {
      return 0;
    }

    return Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100);
  }, [last7Days, mergeDailyMap]);

  const weeklyBarData = useMemo(() => buildCompareWindow(mergeDailyMap), [mergeDailyMap]);

  const queueUpdate = (date, seconds) => {
    const nextQueue = queueRef.current.filter((item) => item.date !== date);
    nextQueue.push({ date, screenTimeSeconds: seconds });
    persistQueue(nextQueue);
    syncQueue(nextQueue);
  };

  const syncQueue = async (queue = queueRef.current) => {
    if (!isAuthenticated || queue.length === 0) {
      return;
    }

    const pending = [...queue];
    const unresolved = [];

    for (const entry of pending) {
      try {
        await postDeviceUsage(entry.date, entry.screenTimeSeconds);
      } catch (error) {
        unresolved.push(entry);
        setSyncError(error.message || 'Unable to sync device usage data.');
      }
    }

    persistQueue(unresolved);

    if (unresolved.length === 0) {
      setSyncError(null);
      await loadBackendHistory();
    }
  };

  const loadBackendHistory = async () => {
    if (!isAuthenticated) return;

    try {
      const data = await fetchDeviceUsageHistory();
      setBackendHistory(data.usages || []);
      setDemoMode(false);
      setSyncError(null);
    } catch (error) {
      console.error(error);
      if (isBackendUnavailableError(error)) {
        const demoEntries = generateDemoActivityEntries(7);
        setBackendHistory(buildDemoDeviceUsageHistory(demoEntries));
        setDemoMode(true);
        setSyncError('Backend not reachable. Showing demo device usage data.');
      } else {
        setSyncError(error.message || 'Could not load device usage history.');
      }
    }
  };

  const recordOneSession = (seconds) => {
    if (seconds <= 0) return;
    const date = formatDateKey(new Date());
    const nextDaily = { ...loadLocalDaily(), [date]: (loadLocalDaily()[date] || 0) + seconds };
    persistLocalDaily(nextDaily);
    queueUpdate(date, nextDaily[date]);
  };

  const pauseTracking = () => {
    if (!activeRef.current || !sessionRef.current) {
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - sessionRef.current) / 1000);
    recordOneSession(elapsedSeconds);
    setActive(false);
    activeRef.current = false;
    setLiveSeconds(0);
    sessionRef.current = null;
    persistSession(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTracking = () => {
    if (activeRef.current) return;

    const now = Date.now();
    sessionRef.current = now;
    persistSession({ startTime: now });
    setActive(true);
    activeRef.current = true;
    setLiveSeconds(0);

    intervalRef.current = window.setInterval(() => {
      if (!sessionRef.current) return;
      setLiveSeconds(Math.floor((Date.now() - sessionRef.current) / 1000));
    }, 1000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      startTracking();
    } else {
      pauseTracking();
    }
  };

  const handleUnload = () => {
    pauseTracking();
  };

  useEffect(() => {
    persistLocalDaily(loadLocalDaily());
    persistQueue(loadQueue());

    const session = loadSession();
    if (session?.startTime && document.visibilityState === 'visible') {
      const resumeSeconds = Math.floor((Date.now() - session.startTime) / 1000);
      if (resumeSeconds > 0) {
        sessionRef.current = Date.now() - resumeSeconds * 1000;
        setActive(true);
        setLiveSeconds(resumeSeconds);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadBackendHistory();
    syncQueue();
  }, [isAuthenticated]);

  useEffect(() => {
    window.addEventListener('load', startTracking);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);

    if (document.readyState === 'complete' && document.visibilityState === 'visible') {
      startTracking();
    }

    return () => {
      window.removeEventListener('load', startTracking);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      pauseTracking();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const interval = window.setInterval(() => {
      syncQueue();
    }, 300000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  const trendPhrase = useMemo(() => {
    if (!weeklyChange) {
      return 'Keep tracking device usage to see your weekly trend.';
    }
    if (weeklyChange > 0) {
      return `Your usage increased ${weeklyChange}% this week compared to last week.`;
    }
    if (weeklyChange < 0) {
      return `Great job — your device usage dropped ${Math.abs(weeklyChange)}% this week.`;
    }
    return 'Your device usage is steady compared to last week.';
  }, [weeklyChange]);

  return (
    <DeviceUsageContext.Provider
      value={{
        todaySeconds: displayedTodaySeconds,
        todayHours,
        todayEnergy,
        todayCarbon,
        yesterdaySeconds,
        yesterdayHours: Number(formatHours(yesterdaySeconds)),
        last7Days,
        weeklyBarData,
        isActive: active,
        activeSeconds: liveSeconds,
        trendPhrase,
        syncError,
        demoMode,
      }}
    >
      {children}
    </DeviceUsageContext.Provider>
  );
}

export function useDeviceUsage() {
  const context = useContext(DeviceUsageContext);
  if (!context) {
    throw new Error('useDeviceUsage must be used within a DeviceUsageProvider');
  }
  return context;
}
