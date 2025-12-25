/**
 * @deprecated Not used by the current routed driver experience.
 * Driver routes render `dashboards/driver/pages/RideRequestsPage.jsx` which uses
 * `dashboards/driver/DriverRidesPage.jsx` (unified feed + `useSmartRealtimeFeed`).
 *
 * Kept for reference for the older modular ride-requests container approach.
 * See: `docs/DEPRECATED_CODE_MAP.md`
 */

import React from 'react';
import RideRequestsViewContainer from './RideRequestsViewContainer';

/**
 * RideRequestsView Component
 * 
 * Main entry point for the ride requests view.
 * This is a simple wrapper around the container component.
 */
const RideRequestsView = (props) => {
  return <RideRequestsViewContainer {...props} />;
};

export default RideRequestsView;