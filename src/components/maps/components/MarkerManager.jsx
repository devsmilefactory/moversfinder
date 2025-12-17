import { useEffect, useRef } from 'react';

/**
 * MarkerManager Component
 * 
 * Manages map markers and their interactions
 */
const MarkerManager = ({ 
  mapInstance, 
  markers = [], 
  onMarkerClick,
  draggableMarkerPosition,
  onDraggableMarkerDrag,
  onDraggableMarkerDragEnd,
  draggableMarkerIcon
}) => {
  const markersRef = useRef([]);
  const draggableMarkerRef = useRef(null);

  // Helper function to coerce coordinates
  const coerceLatLng = (coords) => {
    if (!coords) return null;
    
    return {
      lat: typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat),
      lng: typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng)
    };
  };

  // Update regular markers
  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return;

    const updateMarkers = async () => {
      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

        // Clear existing markers
        markersRef.current.forEach(marker => {
          if (marker.map) {
            marker.map = null;
          }
        });
        markersRef.current = [];

        // Create new markers
        markers.forEach((markerData, index) => {
          const position = coerceLatLng(markerData);
          if (!position) return;

          try {
            const marker = new AdvancedMarkerElement({
              map: mapInstance,
              position: position,
              title: markerData.title || markerData.label || `Marker ${index + 1}`
            });

            // Add click listener
            if (onMarkerClick) {
              marker.addListener('click', () => {
                onMarkerClick(markerData, index);
              });
            }

            markersRef.current.push(marker);
          } catch (error) {
            console.error('Error creating marker:', error, markerData);
          }
        });
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        if (marker.map) {
          marker.map = null;
        }
      });
      markersRef.current = [];
    };
  }, [mapInstance, markers, onMarkerClick]);

  // Update draggable marker
  useEffect(() => {
    if (!mapInstance || !draggableMarkerPosition || !window.google?.maps) return;

    const updateDraggableMarker = async () => {
      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

        // Remove existing draggable marker
        if (draggableMarkerRef.current) {
          draggableMarkerRef.current.map = null;
          draggableMarkerRef.current = null;
        }

        const position = coerceLatLng(draggableMarkerPosition);
        if (!position) return;

        // Create new draggable marker
        const marker = new AdvancedMarkerElement({
          map: mapInstance,
          position: position,
          title: 'Draggable Marker',
          gmpDraggable: true
        });

        // Add drag listeners
        if (onDraggableMarkerDrag) {
          marker.addListener('drag', (event) => {
            const newPosition = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            onDraggableMarkerDrag(newPosition);
          });
        }

        if (onDraggableMarkerDragEnd) {
          marker.addListener('dragend', (event) => {
            const newPosition = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            onDraggableMarkerDragEnd(newPosition);
          });
        }

        draggableMarkerRef.current = marker;
      } catch (error) {
        console.error('Error creating draggable marker:', error);
      }
    };

    updateDraggableMarker();

    // Cleanup function
    return () => {
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.map = null;
        draggableMarkerRef.current = null;
      }
    };
  }, [mapInstance, draggableMarkerPosition, onDraggableMarkerDrag, onDraggableMarkerDragEnd]);

  // This component doesn't render anything visible
  return null;
};

export default MarkerManager;