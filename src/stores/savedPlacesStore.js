import { createCRUDStore } from './createCRUDStore';

/**
 * Saved Places Store
 * Manages saved locations for quick address selection
 */
const useSavedPlacesStore = createCRUDStore({
  name: 'SavedPlacesStore',
  tableName: 'saved_places',
  itemsKey: 'savedPlaces',
  loadingKey: 'savedPlacesLoading',
  errorKey: 'savedPlacesError',
  orderBy: { column: 'created_at', ascending: false },
  customActions: (set, get) => ({
    // Get places by category
    getPlacesByCategory: (category) => {
      if (category === 'all') return get().savedPlaces;
      return get().savedPlaces.filter((place) => place.category === category);
    },
  }),
});

export default useSavedPlacesStore;

