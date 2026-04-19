import { useEffect, useState } from 'react';
import { fetchTrackHistory } from '../services/api.js';

export function useTrackHistory() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    fetchTrackHistory()
      .then((data) => {
        if (active) {
          setTracks(data.tracks || []);
        }
      })
      .catch((err) => {
        if (active) {
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

  return { tracks, loading, error, setTracks };
}
