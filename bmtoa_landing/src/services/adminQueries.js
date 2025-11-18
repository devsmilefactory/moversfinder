import { supabase } from '../lib/supabase';

/**
 * Centralized Supabase Query Builder for Admin Pages
 * 
 * Provides consistent query building with filters, pagination, search, and ordering
 * for all admin dashboard pages.
 */

/**
 * Build a Supabase query with filters, pagination, search, and ordering
 * 
 * @param {string} table - The table name to query
 * @param {Object} options - Query options
 * @param {string} options.select - Select clause (default: '*')
 * @param {Object} options.filters - Key-value pairs for exact match filters
 * @param {string} options.search - OR search clause for text search
 * @param {Object} options.pagination - Pagination config { page, pageSize }
 * @param {Object} options.orderBy - Order config { column, ascending }
 * @param {boolean} options.count - Whether to include count (default: true)
 * @returns {Promise} Supabase query promise
 */
export const buildQuery = async (table, options = {}) => {
  const {
    select = '*',
    filters = {},
    search = null,
    pagination = null,
    orderBy = null,
    count = true
  } = options;

  // Start query with count option
  let query = supabase.from(table).select(select, {
    count: count ? 'exact' : null
  });

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== 'all' && value !== '') {
      // Handle array filters (for IN queries)
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  });

  // Apply search (OR clause)
  if (search) {
    query = query.or(search);
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, {
      ascending: orderBy.ascending !== false
    });
  }

  // Apply pagination
  if (pagination) {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  return query;
};

/**
 * Execute a query and return formatted results
 * 
 * @param {string} table - The table name to query
 * @param {Object} options - Query options (same as buildQuery)
 * @returns {Promise<{data: Array, count: number, error: Error|null}>}
 */
export const executeQuery = async (table, options = {}) => {
  try {
    const query = await buildQuery(table, options);
    const { data, error, count } = await query;

    if (error) {
      console.error(`Error querying ${table}:`, error);
      return { data: [], count: 0, error };
    }

    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error(`Exception querying ${table}:`, error);
    return { data: [], count: 0, error };
  }
};

/**
 * Build search clause for multiple columns
 * 
 * @param {string} searchTerm - The search term
 * @param {Array<string>} columns - Column names to search
 * @returns {string} OR clause for Supabase query
 */
export const buildSearchClause = (searchTerm, columns) => {
  if (!searchTerm || !columns || columns.length === 0) {
    return null;
  }

  const term = searchTerm.toLowerCase();
  return columns.map(col => `${col}.ilike.%${term}%`).join(',');
};

/**
 * Calculate pagination metadata
 * 
 * @param {number} totalCount - Total number of records
 * @param {number} page - Current page number
 * @param {number} pageSize - Number of records per page
 * @returns {Object} Pagination metadata
 */
export const getPaginationMeta = (totalCount, page, pageSize) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    from,
    to
  };
};

/**
 * Common admin queries for reuse across pages
 */
export const adminQueries = {
  /**
   * Get total count from a table with optional filters
   */
  getCount: async (table, filters = {}) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .match(filters);

    return error ? 0 : count;
  },

  /**
   * Get sum of a column with optional filters
   */
  getSum: async (table, column, filters = {}) => {
    let query = supabase.from(table).select(column);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'all') {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    
    if (error || !data) return 0;
    
    return data.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
  },

  /**
   * Get grouped counts
   */
  getGroupedCounts: async (table, groupByColumn, filters = {}) => {
    let query = supabase.from(table).select(groupByColumn);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'all') {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    
    if (error || !data) return {};
    
    return data.reduce((acc, row) => {
      const key = row[groupByColumn];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
};

export default {
  buildQuery,
  executeQuery,
  buildSearchClause,
  getPaginationMeta,
  adminQueries
};
