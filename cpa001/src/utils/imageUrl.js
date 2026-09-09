export function getProductImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // En local o producción, asegurar que sea una ruta relativa o apunte al host de la API si se define
  const apiBase = import.meta.env.VITE_API_URL || '';
  if (apiBase.startsWith('http')) {
    const serverHost = apiBase.replace(/\/api\/?$/, '');
    return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}
