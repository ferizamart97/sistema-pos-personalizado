import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export function useCRUD(endpoint) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [endpoint]);

  return { data, loading, error, fetchAll };
}
