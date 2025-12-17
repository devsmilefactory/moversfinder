import React from 'react';
import { MapPin, Calendar, DollarSign, RotateCcw, Trash2, Car, Package, ShoppingBag, GraduationCap, Briefcase, Zap, Repeat } from 'lucide-react';
import Button from '../../shared/Button';
import { normalizeServiceType } from '../../../utils/serviceTypes';

/**
 * Card component for saved trip templates
 */
const SavedTripCard = ({ ride, onClick, onBookAgain, onDelete }) => {
  // Get service type icon and label
  const getServiceTypeInfo = () => {
    const serviceType = normalizeServiceType(ride.service_type || 'taxi');
    const serviceMap = {
      taxi: { icon: Car, label: 'Taxi', color: 'text-blue-600', bgColor: 'bg-blue-50' },
      courier: { icon: Package, label: 'Courier', color: 'text-purple-600', bgColor: 'bg-purple-50' },
      errand: { icon: ShoppingBag, label: 'Errand', color: 'text-green-600', bgColor: 'bg-green-50' },
      school_run: { icon: GraduationCap, label: 'School Run', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      work_run: { icon: Briefcase, label: 'Work Run', color: 'text-slate-600', bgColor: 'bg-slate-50' }
    };
    return serviceMap[serviceType] || serviceMap.taxi;
  };

  // Get ride timing info
  const getRideTimingInfo = () => {
    const timing = ride.ride_timing || 'instant';
    if (timing === 'instant') {
      return { icon: Zap, label: 'Instant', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else if (timing === 'scheduled_recurring') {
      return { icon: Repeat, label: 'Recurring', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else {
      return { icon: Calendar, label: 'Scheduled', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    }
  };

  const serviceInfo = getServiceTypeInfo();
  const timingInfo = getRideTimingInfo();
  const ServiceIcon = serviceInfo.icon;
  const TimingIcon = timingInfo.icon;

  const handleBookAgain = (e) => {
    e.stopPropagation();
    if (onBookAgain) onBookAgain(ride);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved trip?')) {
      if (onDelete) onDelete(ride.id);
    }
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border border-purple-200 hover:border-purple-400"
      onClick={onClick}
    >
      {/* Header - Service Type & Ride Timing */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Service Type - Prominent */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${serviceInfo.bgColor} rounded-lg`}>
              <ServiceIcon className={`w-5 h-5 ${serviceInfo.color}`} />
              <span className={`font-bold text-sm ${serviceInfo.color}`}>
                {serviceInfo.label}
              </span>
            </div>
            {/* Ride Timing Badge */}
            <div className={`flex items-center gap-1 px-2 py-1 ${timingInfo.bgColor} rounded-full`}>
              <TimingIcon className={`w-3.5 h-3.5 ${timingInfo.color}`} />
              <span className={`text-xs font-semibold ${timingInfo.color}`}>
                {timingInfo.label}
              </span>
            </div>
          </div>
          {/* Saved Template Badge */}
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Saved Template
          </span>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold text-slate-600">
            ${(parseFloat(ride.estimated_cost || ride.fare) || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">Est. Cost</div>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">From</div>
            <div className="text-sm text-slate-800 truncate">
              {ride.pickup_address || ride.pickup_location || '—'}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">To</div>
            <div className="text-sm text-slate-800 truncate">
              {ride.dropoff_address || ride.dropoff_location || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Saved Date */}
      <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2">
        <div className="flex items-center text-xs text-slate-600">
          <Calendar className="w-3 h-3 mr-1" />
          Saved on {new Date(ride.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleBookAgain}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Book Again
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default SavedTripCard;

