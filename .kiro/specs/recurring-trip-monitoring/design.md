# Design Document: Recurring Trip Monitoring

## Overview

This design document outlines the technical approach for implementing recurring trip monitoring in the TaxiCab e-hailing PWA. The solution enables tracking of trips remaining, next trip dates, and automated reminders for recurring trip series.

## Architecture

### Database Schema

#### New Table: `recurring_trip_series`

```sql
CREATE TABLE recurring_trip_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  driver_id UUID REFERENCES profiles(id),
  
  -- Series Configuration
  series_name VARCHAR(255),
  recurrence_pattern VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'weekdays', 'weekends', 'custom'
  recurrence_days INTEGER[], -- Array of day numbers (0=Sunday, 6=Saturday)
  
  -- Trip Details
  pickup_address TEXT NOT NULL,
  pickup_coordinates JSONB,
  dropoff_address TEXT NOT NULL,
  dropoff_coordinates JSONB,
  service_type VARCHAR(50),
  
  -- Schedule
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  trip_time TIME NOT NULL, -- Time of day for trips
  
  -- Progress Tracking
  total_trips INTEGER NOT NULL,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  next_trip_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_total_trips CHECK (total_trips > 0),
  CONSTRAINT valid_completed_trips CHECK (completed_trips >= 0 AND completed_trips <= total_trips)
);

-- Indexes
CREATE INDEX idx_recurring_series_user ON recurring_trip_series(user_id);
CREATE INDEX idx_recurring_series_driver ON recurring_trip_series(driver_id);
CREATE INDEX idx_recurring_series_status ON recurring_trip_series(status);
CREATE INDEX idx_recurring_series_next_trip ON recurring_trip_series(next_trip_date) WHERE status = 'active';
```

#### Update `rides` Table

```sql
-- Add series_id to link rides to recurring series
ALTER TABLE rides ADD COLUMN series_id UUID REFERENCES recurring_trip_series(id);
ALTER TABLE rides ADD COLUMN series_trip_number INTEGER; -- Which trip in the series (1, 2, 3, etc.)

CREATE INDEX idx_rides_series ON rides(series_id);
```

#### New Table: `trip_reminders`

```sql
CREATE TABLE trip_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES recurring_trip_series(id),
  ride_id UUID REFERENCES rides(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Reminder Details
  reminder_type VARCHAR(50) NOT NULL, -- '24_hours', '1_hour', 'series_ending', 'series_complete'
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_pending ON trip_reminders(reminder_time, status) WHERE status = 'pending';
CREATE INDEX idx_reminders_series ON trip_reminders(series_id);
```

### Components

#### 1. RecurringTripCard Component

```javascript
// src/dashboards/driver/components/RecurringTripCard.jsx

const RecurringTripCard = ({ series, onViewDetails }) => {
  const tripsRemaining = series.total_trips - series.completed_trips;
  const progressPercent = (series.completed_trips / series.total_trips) * 100;
  
  return (
    <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
      {/* Series Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="font-semibold text-lg">{series.series_name || 'Recurring Trip'}</h3>
            <p className="text-sm text-gray-600">{series.recurrence_pattern}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          series.status === 'active' ? 'bg-green-100 text-green-800' :
          series.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {series.status}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{series.completed_trips} / {series.total_trips} trips</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">{tripsRemaining} trips remaining</p>
      </div>
      
      {/* Next Trip */}
      {series.next_trip_date && (
        <div className="bg-purple-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-purple-600 font-medium mb-1">Next Trip</p>
          <p className="text-sm font-semibold">{formatNextTripDate(series.next_trip_date)}</p>
        </div>
      )}
      
      {/* Locations */}
      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-start gap-2">
          <span className="text-green-600">📍</span>
          <span className="text-gray-700">{series.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-600">📍</span>
          <span className="text-gray-700">{series.dropoff_address}</span>
        </div>
      </div>
      
      {/* Actions */}
      <Button onClick={() => onViewDetails(series)} className="w-full">
        View Details
      </Button>
    </div>
  );
};
```

#### 2. RecurringTripsView Component

```javascript
// src/dashboards/driver/components/RecurringTripsView.jsx

const RecurringTripsView = () => {
  const { user } = useAuthStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRecurringSeries();
    setupRealtimeSubscription();
  }, [user?.id]);
  
  const loadRecurringSeries = async () => {
    const { data, error } = await supabase
      .from('recurring_trip_series')
      .select('*')
      .eq('driver_id', user.id)
      .in('status', ['active', 'paused'])
      .order('next_trip_date', { ascending: true });
    
    if (!error) setSeries(data || []);
  };
  
  // ... rest of component
};
```

### Backend Functions

#### 1. Calculate Next Trip Date

```sql
CREATE OR REPLACE FUNCTION calculate_next_trip_date(
  p_series_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  v_series RECORD;
  v_next_date TIMESTAMP WITH TIME ZONE;
  v_current_date DATE;
  v_days_to_add INTEGER;
BEGIN
  -- Get series details
  SELECT * INTO v_series
  FROM recurring_trip_series
  WHERE id = p_series_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Start from the last completed trip or start date
  v_current_date := COALESCE(
    (SELECT MAX(scheduled_datetime)::DATE FROM rides WHERE series_id = p_series_id AND ride_status = 'completed'),
    v_series.start_date::DATE
  );
  
  -- Calculate next date based on recurrence pattern
  CASE v_series.recurrence_pattern
    WHEN 'daily' THEN
      v_next_date := v_current_date + INTERVAL '1 day';
    
    WHEN 'weekly' THEN
      v_next_date := v_current_date + INTERVAL '7 days';
    
    WHEN 'weekdays' THEN
      -- Find next weekday (Mon-Fri)
      v_days_to_add := 1;
      LOOP
        v_next_date := v_current_date + (v_days_to_add || ' days')::INTERVAL;
        EXIT WHEN EXTRACT(DOW FROM v_next_date) BETWEEN 1 AND 5;
        v_days_to_add := v_days_to_add + 1;
      END LOOP;
    
    WHEN 'weekends' THEN
      -- Find next weekend (Sat-Sun)
      v_days_to_add := 1;
      LOOP
        v_next_date := v_current_date + (v_days_to_add || ' days')::INTERVAL;
        EXIT WHEN EXTRACT(DOW FROM v_next_date) IN (0, 6);
        v_days_to_add := v_days_to_add + 1;
      END LOOP;
    
    ELSE
      RETURN NULL;
  END CASE;
  
  -- Combine date with trip time
  v_next_date := v_next_date::DATE + v_series.trip_time;
  
  -- Check if within end date
  IF v_series.end_date IS NOT NULL AND v_next_date > v_series.end_date THEN
    RETURN NULL;
  END IF;
  
  RETURN v_next_date;
END;
$$;
```

#### 2. Update Series Progress

```sql
CREATE OR REPLACE FUNCTION update_series_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only process if ride is part of a series and was completed
  IF NEW.series_id IS NOT NULL AND NEW.ride_status = 'completed' AND OLD.ride_status != 'completed' THEN
    
    -- Increment completed trips
    UPDATE recurring_trip_series
    SET 
      completed_trips = completed_trips + 1,
      updated_at = NOW()
    WHERE id = NEW.series_id;
    
    -- Calculate next trip date
    v_next_date := calculate_next_trip_date(NEW.series_id);
    
    -- Update next trip date or mark as complete
    IF v_next_date IS NOT NULL THEN
      UPDATE recurring_trip_series
      SET next_trip_date = v_next_date
      WHERE id = NEW.series_id;
      
      -- Create next ride in series
      INSERT INTO rides (
        series_id,
        series_trip_number,
        user_id,
        driver_id,
        pickup_address,
        pickup_coordinates,
        dropoff_address,
        dropoff_coordinates,
        service_type,
        ride_timing,
        ride_status,
        scheduled_datetime
      )
      SELECT
        s.id,
        s.completed_trips + 1,
        s.user_id,
        s.driver_id,
        s.pickup_address,
        s.pickup_coordinates,
        s.dropoff_address,
        s.dropoff_coordinates,
        s.service_type,
        'scheduled_recurring',
        'accepted',
        v_next_date
      FROM recurring_trip_series s
      WHERE s.id = NEW.series_id;
      
    ELSE
      -- Mark series as complete
      UPDATE recurring_trip_series
      SET 
        status = 'completed',
        next_trip_date = NULL
      WHERE id = NEW.series_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_series_progress
AFTER UPDATE ON rides
FOR EACH ROW
EXECUTE FUNCTION update_series_progress();
```

#### 3. Schedule Reminders

```sql
CREATE OR REPLACE FUNCTION schedule_trip_reminders(
  p_series_id UUID,
  p_ride_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_ride RECORD;
  v_series RECORD;
BEGIN
  -- Get ride and series details
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id;
  SELECT * INTO v_series FROM recurring_trip_series WHERE id = p_series_id;
  
  -- Schedule 24-hour reminder for driver
  INSERT INTO trip_reminders (series_id, ride_id, user_id, reminder_type, reminder_time)
  VALUES (
    p_series_id,
    p_ride_id,
    v_series.driver_id,
    '24_hours',
    v_ride.scheduled_datetime - INTERVAL '24 hours'
  );
  
  -- Schedule 1-hour reminder for driver
  INSERT INTO trip_reminders (series_id, ride_id, user_id, reminder_type, reminder_time)
  VALUES (
    p_series_id,
    p_ride_id,
    v_series.driver_id,
    '1_hour',
    v_ride.scheduled_datetime - INTERVAL '1 hour'
  );
  
  -- Schedule 24-hour reminder for passenger
  INSERT INTO trip_reminders (series_id, ride_id, user_id, reminder_type, reminder_time)
  VALUES (
    p_series_id,
    p_ride_id,
    v_series.user_id,
    '24_hours',
    v_ride.scheduled_datetime - INTERVAL '24 hours'
  );
END;
$$;
```

## Implementation Plan

1. **Phase 1: Database Schema**
   - Create `recurring_trip_series` table
   - Create `trip_reminders` table
   - Add `series_id` to `rides` table
   - Create database functions

2. **Phase 2: Backend Logic**
   - Implement next trip date calculation
   - Implement series progress tracking
   - Create reminder scheduling system

3. **Phase 3: UI Components**
   - Create RecurringTripCard component
   - Create RecurringTripsView component
   - Add recurring trips tab to driver dashboard
   - Add series progress to passenger dashboard

4. **Phase 4: Notifications**
   - Implement reminder notification system
   - Add notification preferences
   - Test reminder delivery

5. **Phase 5: Analytics**
   - Add recurring trip analytics
   - Create calendar view
   - Add revenue projections

