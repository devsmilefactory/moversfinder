import React from 'react';
import { isErrandService } from '../../../../../utils/serviceTypes';
import ErrandTaskManager from '../ErrandTaskManager';

/**
 * Active Ride Overlay Registry (Driver)
 *
 * Goal: allow ride-type-specific active handling (errands, bulk, future) without bloating the overlay container.
 *
 * A module can:
 * - render a service panel (e.g. errands tasks, bulk batch info, courier packages)
 * - indicate it "handles completion" so the container doesn't auto-dismiss on trip_completed
 */

/**
 * @typedef {Object} ActiveRideOverlayContext
 * @property {Object} ride
 * @property {boolean} isRideCompleted
 * @property {Function} setLocalRide
 * @property {Function} onCompleted
 * @property {Function} onDismiss
 */

/**
 * @typedef {Object} ActiveRideOverlayModule
 * @property {string} id
 * @property {(ride: any) => boolean} appliesTo
 * @property {boolean} [handlesCompletion]
 * @property {(ctx: ActiveRideOverlayContext) => React.ReactNode} [renderServicePanel]
 */

/** @type {ActiveRideOverlayModule[]} */
const modules = [
  {
    id: 'errands',
    appliesTo: (ride) =>
      isErrandService(ride?.service_type) || String(ride?.service_type || '').toLowerCase() === 'errands',
    handlesCompletion: true,
    renderServicePanel: ({ ride, isRideCompleted, setLocalRide, onCompleted, onDismiss }) => (
      <ErrandTaskManager
        ride={ride}
        errandTasks={ride?.errand_tasks || ride?.tasks}
        isRideCompleted={isRideCompleted}
        onRideCompleted={(completedRide) => {
          setLocalRide(completedRide);
          if (typeof onCompleted === 'function') onCompleted(completedRide);
          if (typeof onDismiss === 'function') onDismiss();
        }}
        onDismiss={onDismiss}
      />
    ),
  },
  {
    id: 'bulk',
    appliesTo: (ride) =>
      (String(ride?.booking_type || '').toLowerCase() === 'bulk' && !!ride?.batch_id) || !!ride?.batch_id,
    handlesCompletion: false,
    renderServicePanel: ({ ride }) => (
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-indigo-700 mb-1">Bulk ride</div>
        <div className="text-sm text-indigo-900 font-medium">
          Batch: <span className="font-mono">{String(ride?.batch_id || '').slice(0, 8) || '—'}</span>
        </div>
        <div className="text-xs text-indigo-700 mt-1">
          This trip may include multiple segments. (Module ready for future batch progress UI)
        </div>
      </div>
    ),
  },
];

export function getActiveRideOverlayModules() {
  return modules;
}

export function getActiveRideOverlayResolution(ctx) {
  const ride = ctx?.ride;
  const applicable = modules.filter((m) => {
    try {
      return m.appliesTo(ride);
    } catch {
      return false;
    }
  });

  return {
    applicable,
    handlesCompletion: applicable.some((m) => m.handlesCompletion),
    servicePanels: applicable
      .map((m) => (typeof m.renderServicePanel === 'function' ? m.renderServicePanel(ctx) : null))
      .filter(Boolean),
  };
}


