import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Generic CRUD Store Factory
 * Creates a Zustand store with standard CRUD operations
 * 
 * @param {Object} config - Store configuration
 * @param {string} config.name - Store name for devtools
 * @param {string} config.tableName - Supabase table name
 * @param {string} config.itemsKey - State key for items array (e.g., 'savedPlaces')
 * @param {string} config.loadingKey - State key for loading (e.g., 'savedPlacesLoading')
 * @param {string} config.errorKey - State key for error (e.g., 'savedPlacesError')
 * @param {Object} config.orderBy - Default ordering { column, ascending }
 * @param {Function} config.customActions - Additional custom actions
 * @returns {Function} Zustand store hook
 */
export const createCRUDStore = (config) => {
  const {
    name,
    tableName,
    itemsKey,
    loadingKey,
    errorKey,
    orderBy = { column: 'created_at', ascending: false },
    customActions = () => ({}),
  } = config;

  return create(
    devtools(
      (set, get) => ({
        // State
        [itemsKey]: [],
        [loadingKey]: false,
        [errorKey]: null,

        // Load all items for a user
        [`load${capitalize(itemsKey)}`]: async (userId, filters = {}) => {
          set({ [loadingKey]: true, [errorKey]: null });
          try {
            let query = supabase
              .from(tableName)
              .select('*')
              .eq('user_id', userId);

            // Apply additional filters
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.eq(key, value);
              }
            });

            // Apply ordering
            query = query.order(orderBy.column, { ascending: orderBy.ascending });

            const { data, error } = await query;

            if (error) throw error;

            set({ [itemsKey]: data || [], [loadingKey]: false });
            return { success: true, data: data || [] };
          } catch (error) {
            set({ [errorKey]: error.message, [loadingKey]: false });
            return { success: false, error: error.message };
          }
        },

        // Create a new item
        [`create${capitalize(singularize(itemsKey))}`]: async (itemData) => {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .insert([{
                ...itemData,
                created_at: new Date().toISOString(),
              }])
              .select()
              .single();

            if (error) throw error;

            set((state) => ({
              [itemsKey]: [data, ...state[itemsKey]],
            }));

            return { success: true, data };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },

        // Update an existing item
        [`update${capitalize(singularize(itemsKey))}`]: async (itemId, updates) => {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .update(updates)
              .eq('id', itemId)
              .select()
              .single();

            if (error) throw error;

            set((state) => ({
              [itemsKey]: state[itemsKey].map((item) =>
                item.id === itemId ? data : item
              ),
            }));

            return { success: true, data };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },

        // Delete an item
        [`delete${capitalize(singularize(itemsKey))}`]: async (itemId) => {
          try {
            const { error } = await supabase
              .from(tableName)
              .delete()
              .eq('id', itemId);

            if (error) throw error;

            set((state) => ({
              [itemsKey]: state[itemsKey].filter((item) => item.id !== itemId),
            }));

            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },

        // Get item by ID
        [`get${capitalize(singularize(itemsKey))}ById`]: (itemId) => {
          return get()[itemsKey].find((item) => item.id === itemId);
        },

        // Clear error
        clearError: () => set({ [errorKey]: null }),

        // Add custom actions
        ...customActions(set, get),
      }),
      { name }
    )
  );
};

/**
 * Helper: Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper: Convert plural to singular (simple version)
 */
function singularize(str) {
  // Simple singularization - remove trailing 's' or 'es'
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('es')) {
    return str.slice(0, -2);
  }
  if (str.endsWith('s')) {
    return str.slice(0, -1);
  }
  return str;
}

