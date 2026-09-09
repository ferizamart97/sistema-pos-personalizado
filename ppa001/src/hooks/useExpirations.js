import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export function useExpirations() {
  const [data, setData] = useState({ red: [], orange: [], yellow: [], green: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Dummy fetch
    setTimeout(() => {
      setData({ red: [], orange: [], yellow: [], green: [] });
      setLoading(false);
    }, 500);
  }, []);

  return { data, loading };
}
