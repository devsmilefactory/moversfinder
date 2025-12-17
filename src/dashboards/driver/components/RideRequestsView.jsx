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