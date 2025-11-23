// Profile availability configuration for phased rollout
// Active: individual, driver
// Coming Soon: corporate, operator

export const profileAvailability = {
  individual: 'active',
  driver: 'active',
  corporate: 'coming_soon',
  operator: 'coming_soon',
};

export const getAvailability = (type) => profileAvailability[type] || 'inactive';
export const isProfileActive = (type) => getAvailability(type) === 'active';
export const isComingSoon = (type) => getAvailability(type) === 'coming_soon';

export const bmtoaUrl = import.meta?.env?.VITE_BMTOA_URL || 'https://bmtoa.co.zw';

