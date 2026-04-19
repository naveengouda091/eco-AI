import { useEffect, useState } from 'react';
import { fetchActivities } from '../services/api.js';
import { generateDemoActivityEntries, buildDemoActivities, isBackendUnavailableError } from '../utils/demoData.js';

export function useActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let active = true;

    fetchActivities()
      .then((data) => {
        if (active) {
          setActivities(data.activities || []);
          setDemoMode(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!active) return;

        if (isBackendUnavailableError(err)) {
          const demoEntries = generateDemoActivityEntries(7);
          setActivities(buildDemoActivities(demoEntries));
          setDemoMode(true);
          setError(null);
        } else {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    activities,
    setActivities,
    loading,
    error,
    demoMode,
  };
}
