import { supabase } from '../lib/supabase';

/**
 * User Guide Service
 * Handles fetching and searching user guide articles
 */

/**
 * Get all published guides
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of guide articles
 */
export const getAllGuides = async (options = {}) => {
  try {
    let query = supabase
      .from('user_guides')
      .select('*')
      .eq('published', true)
      .order('order', { ascending: true });

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.userType) {
      query = query.contains('user_type', [options.userType]);
    }

    if (options.featured !== undefined) {
      query = query.eq('featured', options.featured);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching guides:', error);
    throw error;
  }
};

/**
 * Get guides by category
 * @param {string} category - Category name
 * @param {string} userType - Optional user type filter
 * @returns {Promise<Array>} Array of guide articles
 */
export const getGuidesByCategory = async (category, userType = null) => {
  try {
    let query = supabase
      .from('user_guides')
      .select('*')
      .eq('category', category)
      .eq('published', true)
      .order('order', { ascending: true });

    if (userType) {
      query = query.contains('user_type', [userType]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching guides by category:', error);
    throw error;
  }
};

/**
 * Get a single guide by slug
 * @param {string} slug - Guide slug
 * @returns {Promise<Object>} Guide article
 */
export const getGuideBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('user_guides')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching guide by slug:', error);
    throw error;
  }
};

/**
 * Search guides by query string
 * @param {string} searchQuery - Search term
 * @param {string} userType - Optional user type filter
 * @returns {Promise<Array>} Array of matching guide articles
 */
export const searchGuides = async (searchQuery, userType = null) => {
  try {
    let query = supabase
      .from('user_guides')
      .select('*')
      .eq('published', true);

    // Search in title, content, and tags
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`
      );
    }

    if (userType) {
      query = query.contains('user_type', [userType]);
    }

    query = query.order('order', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching guides:', error);
    throw error;
  }
};

/**
 * Get featured guides
 * @param {string} userType - Optional user type filter
 * @param {number} limit - Maximum number of guides to return
 * @returns {Promise<Array>} Array of featured guide articles
 */
export const getFeaturedGuides = async (userType = null, limit = 5) => {
  try {
    let query = supabase
      .from('user_guides')
      .select('*')
      .eq('published', true)
      .eq('featured', true)
      .order('order', { ascending: true })
      .limit(limit);

    if (userType) {
      query = query.contains('user_type', [userType]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured guides:', error);
    throw error;
  }
};

/**
 * Get all categories with guide counts
 * @param {string} userType - Optional user type filter
 * @returns {Promise<Array>} Array of categories with counts
 */
export const getCategories = async (userType = null) => {
  try {
    let query = supabase
      .from('user_guides')
      .select('category')
      .eq('published', true);

    if (userType) {
      query = query.contains('user_type', [userType]);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count guides per category
    const categoryCounts = {};
    (data || []).forEach(guide => {
      categoryCounts[guide.category] = (categoryCounts[guide.category] || 0) + 1;
    });

    // Return formatted category list
    const categories = [
      { id: 'getting-started', name: 'Getting Started', icon: '🚀', count: categoryCounts['getting-started'] || 0 },
      { id: 'booking', name: 'Booking & Rides', icon: '🚕', count: categoryCounts['booking'] || 0 },
      { id: 'payments', name: 'Payments & Billing', icon: '💳', count: categoryCounts['payments'] || 0 },
      { id: 'account', name: 'Account Management', icon: '👤', count: categoryCounts['account'] || 0 },
      { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧', count: categoryCounts['troubleshooting'] || 0 }
    ];

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};
