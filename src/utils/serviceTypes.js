export const normalizeServiceType = (value) => {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'errands') return 'errand';
  return normalized;
};

export const isErrandService = (value) => normalizeServiceType(value) === 'errand';








