import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';

export function useProducts(categoryType = '', subcategoryId = '', search = '') {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { is_active: 'true', per_page: 50 };
      if (categoryType) params.category_type = categoryType;
      if (subcategoryId) params.subcategory_id = subcategoryId;
      if (search) params.search = search;

      const response = await api.get('/products', { params });
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [categoryType, subcategoryId, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
