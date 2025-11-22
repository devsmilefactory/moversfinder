# Design Document

## Overview

This design addresses the non-functional "View Details" and "Place Bid" buttons on the driver rides page. The root cause is event propagation - button clicks are bubbling up to the parent card element, preventing the intended actions from executing. Additionally, there is no bid placement modal component, causing the "Place Bid" button to attempt navigation to a non-existent route.

The solution involves:
1. Fixing event propagation in the ride card component
2. Creating a new PlaceBidModal component
3. Updating the DriverRidesPage to handle bid placement properly
4. Ensuring the DriverRideDetailsModal opens correctly

## Architecture

### Component Hierarchy

```
DriverRidesPage (Container)
├── RideList (Presentational)
│   └── renderRideCard (Render Function)
│       ├── Card Container (onClick → View Details)
│       ├── View Details Button (onClick → stopPropagation + View Details)
│       └── Place Bid Button (onClick → stopPropagation + Open Bid Modal)
├── DriverRideDetailsModal (Existing)
├── PlaceBidModal (New Component)
└── CancelRideModal (Existing)
```

### Data Flow

1. **View Details Flow**:
   - User clicks "View Details" button
   - Event propagation stopped
   - `handleViewRideDetails(ride)` called
   - `setSelectedRide(ride)` and `setShowDetailsModal(true)`
   - DriverRideDetailsModal renders with ride data

2. **Place Bid Flow**:
   - User clicks "Place Bid" button
   - Event propagation stopped
   - `handlePlaceBid(ride)` called
   - `setSelectedRide(ride)` and `setShowBidModal(true)`
   - PlaceBidModal renders with ride data
   - User enters bid amount
   - Bid submitted to `ride_offers` table
   - Modal closes and ride list refreshes

## Components and Interfaces

### 1. PlaceBidModal Component

**Location**: `src/dashboards/driver/components/PlaceBidModal.jsx`

**Props**:
```javascript
{
  open: boolean,           // Controls modal visibility
  ride: object,            // The ride object to bid on
  onClose: function,       // Callback to close modal
  onSubmit: function       // Callback when bid is submitted
}
```

**State**:
```javascript
{
  bidAmount: string,       // User-entered bid amount
  submitting: boolean,     // Loading state during submission
  error: string | null     // Error message if submission fails
}
```

**Features**:
- Display ride summary (pickup, dropoff, estimated cost)
- Input field for bid amount with validation
- Show estimated cost as reference
- Disable submit if bid amount is invalid
- Show loading state during submission
- Display error messages
- Close on successful submission

### 2. Updated DriverRidesPage

**New State**:
```javascript
const [showBidModal, setShowBidModal] = useState(false);
```

**New Handler**:
```javascript
const handlePlaceBid = (ride) => {
  setSelectedRide(ride);
  setShowBidModal(true);
};

const handleSubmitBid = async (bidAmount) => {
  // Submit bid to ride_offers table
  // Close modal on success
  // Refresh ride list
  // Show toast notification
};
```

**Updated renderRideCard**:
- Add `e.stopPropagation()` to all button onClick handlers
- Replace navigation with `handlePlaceBid(ride)` call
- Ensure card onClick only triggers for card area, not buttons

### 3. Updated RideList Component

No changes needed - the component already passes through the necessary callbacks.

## Data Models

### ride_offers Table Structure

Based on the migrations, the `ride_offers` table has:
```sql
{
  id: uuid,
  ride_id: uuid,
  driver_id: uuid,
  offer_amount: numeric,
  offer_status: text,  -- 'pending', 'accepted', 'rejected'
  created_at: timestamp,
  accepted_at: timestamp,
  rejected_at: timestamp
}
```

### Bid Submission Payload

```javascript
{
  ride_id: ride.id,
  driver_id: user.id,
  offer_amount: parseFloat(bidAmount),
  offer_status: 'pending',
  created_at: new Date().toISOString()
}
```

## Error Handling

### Event Propagation Issues
- **Problem**: Button clicks trigger both button handler and card handler
- **Solution**: Call `e.stopPropagation()` in all button onClick handlers
- **Validation**: Test that clicking buttons doesn't trigger card click

### Bid Submission Errors
- **Database errors**: Show user-friendly error message in modal
- **Validation errors**: Prevent submission if bid amount is invalid
- **Network errors**: Show retry option
- **Duplicate bids**: Check if driver already has pending bid for this ride

### Modal State Management
- **Multiple modals**: Ensure only one modal is open at a time
- **Cleanup**: Reset selectedRide when modal closes
- **Unmount**: Handle component unmount during async operations

## Testing Strategy

### Manual Testing Checklist

1. **View Details Button**:
   - Click "View Details" on any ride card
   - Verify modal opens with correct ride data
   - Verify card click handler doesn't fire
   - Verify modal can be closed

2. **Place Bid Button**:
   - Click "Place Bid" on available ride
   - Verify bid modal opens with correct ride data
   - Verify card click handler doesn't fire
   - Enter valid bid amount and submit
   - Verify bid is created in database
   - Verify modal closes and list refreshes
   - Verify toast notification appears

3. **Card Click**:
   - Click on card area (not buttons)
   - Verify details modal opens
   - Verify this works for all ride types

4. **Edge Cases**:
   - Test with active instant ride (bid button should be disabled)
   - Test with scheduled rides (activate button should work)
   - Test rapid clicking on buttons
   - Test clicking outside modal to close

### Integration Testing

1. **Bid Flow**:
   - Place bid on ride
   - Verify ride moves to "BID" tab
   - Verify passenger can see the offer
   - Verify bid acceptance flow still works

2. **State Consistency**:
   - Place bid and refresh page
   - Verify ride appears in correct tab
   - Verify bid status is correct

## Implementation Notes

### Event Propagation Fix

The key fix is adding `e.stopPropagation()` to button handlers:

```javascript
onClick={(e) => {
  e.stopPropagation();  // Prevent card click
  onRideClick(ride);    // Execute button action
}}
```

### Bid Amount Validation

- Minimum bid: $1.00
- Maximum bid: $9999.99
- Must be numeric with up to 2 decimal places
- Show validation error in real-time

### Database Interaction

Use Supabase client to insert bid:

```javascript
const { data, error } = await supabase
  .from('ride_offers')
  .insert({
    ride_id: ride.id,
    driver_id: user.id,
    offer_amount: parseFloat(bidAmount),
    offer_status: 'pending'
  })
  .select()
  .single();
```

### Notification

After successful bid placement:
- Show success toast: "Bid placed successfully"
- Refresh ride list to update UI
- Close modal automatically

## UI/UX Considerations

### PlaceBidModal Design

- Clean, focused interface
- Show ride summary at top
- Large, clear input for bid amount
- Show estimated cost as reference (not editable)
- Primary action button: "Place Bid"
- Secondary action: "Cancel"
- Loading state with disabled inputs
- Error messages in red below input

### Button States

- **Enabled**: Blue background, white text, hover effect
- **Disabled**: Gray background, gray text, cursor not-allowed
- **Loading**: Show spinner, disable interaction

### Accessibility

- Modal should trap focus
- ESC key should close modal
- Enter key should submit form (when valid)
- Proper ARIA labels for screen readers
- Clear error messages
