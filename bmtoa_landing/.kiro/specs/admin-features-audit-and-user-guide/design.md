# Design Document

## Overview

This design document outlines the architecture and implementation approach for auditing and fixing all admin features in the TaxiCab/BMTOA platform, ensuring proper Supabase integration, and adding a comprehensive user guide section. The solution will systematically review each admin page, verify database queries, implement proper filtering and pagination, ensure CRUD operations work correctly, and create a new user guide feature.

### Goals

1. Ensure all admin pages query the correct Supabase tables with proper joins
2. Implement functional filters and pagination across all admin pages
3. Verify and fix all CRUD operations to match database schema
4. Remove all demo/mock data and replace with real database queries
5. Add a comprehensive user guide section accessible to all user types

### Non-Goals

- Redesigning the UI/UX of existing admin pages
- Adding new admin features beyond the user guide
- Modifying the database schema
- Implementing real-time updates or websockets

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Users Page   │  │ Trips Page   │  │ Payments     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Members Page │  │ Corporate    │  │ Content      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Client Layer                      │
│  - Query Builder                                             │
│  - Filter Logic                                              │
│  - Pagination Handler                                        │
│  - Error Handling                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  Tables: profiles, rides, payments, memberships, etc.       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Page Load**: Admin page component mounts and triggers data fetch
2. **Query Construction**: Build Supabase query with filters, joins, and pagination
3. **Data Fetch**: Execute query against Supabase database
4. **Data Transform**: Transform database response to UI-friendly format
5. **Render**: Display data in tables with filter controls
6. **User Action**: Admin applies filters, changes page, or performs CRUD operation
7. **Update**: Re-fetch data or update database, then refresh UI

## Components and Interfaces

### 1. Admin Page Component Pattern

All admin pages will follow a consistent structure:

```javascript
const AdminPage = () => {
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [totalCount, setTotalCount] = useState(0);
  
  // Data fetching
  useEffect(() => {
    loadData();
  }, [filters, pagination]);
  
  const loadData = async () => {
    // Build query with filters and pagination
    // Execute query
    // Transform and set data
  };
  
  // CRUD operations
  const handleCreate = async (formData) => {};
  const handleUpdate = async (id, formData) => {};
  const handleDelete = async (id) => {};
  
  // Render
  return (
    <div>
      <StatsCards />
      <FilterControls />
      <DataTable />
      <Pagination />
    </div>
  );
};
```

### 2. Supabase Query Service

Create a centralized service for building consistent queries:

```javascript
// services/adminQueries.js
export const buildQuery = (table, options = {}) => {
  let query = supabase.from(table).select(options.select || '*', {
    count: 'exact'
  });
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        query = query.eq(key, value);
      }
    });
  }
  
  // Apply search
  if (options.search) {
    query = query.or(options.search);
  }
  
  // Apply pagination
  if (options.pagination) {
    const { page, pageSize } = options.pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }
  
  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending
    });
  }
  
  return query;
};
```

### 3. Filter Component

Reusable filter component for all admin pages:

```javascript
const FilterBar = ({ filters, onFilterChange, options }) => {
  return (
    <div className="filter-bar">
      {options.map(option => (
        <select
          key={option.key}
          value={filters[option.key] || 'all'}
          onChange={(e) => onFilterChange(option.key, e.target.value)}
        >
          <option value="all">All {option.label}</option>
          {option.values.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
};
```

### 4. Pagination Component

Reusable pagination component:

```javascript
const Pagination = ({ currentPage, pageSize, totalCount, onPageChange }) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  
  return (
    <div className="pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};
```

## Data Models

### Query Specifications by Page

#### 1. Dashboard Overview
```sql
-- Total users
SELECT COUNT(*) FROM profiles;

-- Total trips
SELECT COUNT(*) FROM rides;

-- Revenue
SELECT SUM(fare) FROM rides WHERE status = 'completed';

-- Active drivers
SELECT COUNT(*) FROM profiles WHERE user_type = 'driver' AND account_status = 'active';
```

#### 2. Users Page
```sql
SELECT 
  p.id,
  p.email,
  p.name,
  p.phone,
  p.user_type,
  p.platform,
  p.account_status,
  p.created_at,
  p.last_login_at,
  COUNT(r.id) as total_rides
FROM profiles p
LEFT JOIN rides r ON r.user_id = p.id
WHERE 
  (p.platform = $platform OR $platform = 'all')
  AND (p.user_type = $userType OR $userType = 'all')
  AND (p.account_status = $status OR $status = 'all')
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT $pageSize OFFSET $offset;
```


#### 3. Trips Page
```sql
SELECT 
  r.id,
  r.pickup_location,
  r.dropoff_location,
  r.service_type,
  r.ride_status,
  r.fare,
  r.payment_method,
  r.created_at,
  r.trip_started_at,
  r.trip_completed_at,
  u.name as user_name,
  u.user_type,
  d.name as driver_name,
  c.company_name,
  v.license_plate
FROM rides r
LEFT JOIN profiles u ON r.user_id = u.id
LEFT JOIN profiles d ON r.driver_id = d.id
LEFT JOIN corporate_profiles c ON r.company_id = c.user_id
LEFT JOIN vehicles v ON r.vehicle_id = v.id
WHERE 
  (r.ride_status = $status OR $status = 'all')
  AND (r.service_type = $serviceType OR $serviceType = 'all')
  AND (r.created_at >= $startDate OR $startDate IS NULL)
  AND (r.created_at <= $endDate OR $endDate IS NULL)
ORDER BY r.created_at DESC
LIMIT $pageSize OFFSET $offset;
```

#### 4. Payment Verification Page
```sql
SELECT 
  pp.id,
  pp.amount,
  pp.payment_method,
  pp.payment_date,
  pp.payment_reference,
  pp.proof_document_url,
  pp.verification_status,
  pp.verified_at,
  pp.admin_notes,
  pp.created_at,
  c.company_name,
  c.credit_balance,
  p.name as contact_name,
  p.email as contact_email,
  vb.name as verified_by_name
FROM payment_proofs pp
LEFT JOIN corporate_profiles c ON pp.company_id = c.user_id
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN profiles vb ON pp.verified_by = vb.id
WHERE 
  (pp.verification_status = $status OR $status = 'all')
  AND (pp.payment_method = $method OR $method = 'all')
ORDER BY pp.created_at DESC
LIMIT $pageSize OFFSET $offset;
```

#### 5. BMTOA Reports Page
```sql
-- Membership statistics
SELECT 
  membership_tier,
  COUNT(*) as count,
  SUM(monthly_fee) as total_revenue
FROM operator_profiles
WHERE bmtoa_verified = true
GROUP BY membership_tier;

-- Subscription payments by month
SELECT 
  DATE_TRUNC('month', payment_for_month) as month,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count
FROM subscription_payments
WHERE payment_for_month >= $startDate AND payment_for_month <= $endDate
GROUP BY DATE_TRUNC('month', payment_for_month)
ORDER BY month DESC;
```

#### 6. Corporate Accounts Page
```sql
SELECT 
  c.user_id,
  c.company_name,
  c.account_tier,
  c.credit_balance,
  c.monthly_spend,
  c.verification_status,
  c.credit_booking_approved,
  c.created_at,
  p.email,
  p.phone,
  COUNT(r.id) as total_trips,
  COUNT(cp.id) as total_passengers
FROM corporate_profiles c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN rides r ON r.company_id = c.user_id
LEFT JOIN corporate_passengers cp ON cp.company_id = c.user_id
WHERE 
  (c.account_tier = $tier OR $tier = 'all')
  AND (c.verification_status = $status OR $status = 'all')
GROUP BY c.user_id, p.email, p.phone
ORDER BY c.created_at DESC
LIMIT $pageSize OFFSET $offset;
```

#### 7. Members Page
```sql
SELECT 
  op.user_id,
  op.company_name,
  op.bmtoa_member_number,
  op.membership_tier,
  op.subscription_status,
  op.bmtoa_verified,
  op.bmtoa_member_since,
  op.total_drivers,
  op.monthly_revenue,
  p.name,
  p.email,
  p.phone,
  COUNT(ov.id) as total_vehicles
FROM operator_profiles op
LEFT JOIN profiles p ON op.user_id = p.id
LEFT JOIN operator_vehicles ov ON ov.operator_id = op.user_id
WHERE 
  op.bmtoa_verified = true
  AND (op.membership_tier = $tier OR $tier = 'all')
  AND (op.subscription_status = $status OR $status = 'all')
GROUP BY op.user_id, p.name, p.email, p.phone
ORDER BY op.bmtoa_member_since DESC
LIMIT $pageSize OFFSET $offset;
```

#### 8. Member Requests Page
```sql
SELECT 
  op.user_id,
  op.company_name,
  op.business_registration,
  op.fleet_size,
  op.approval_status,
  op.profile_status,
  op.created_at,
  op.rejection_reason,
  p.name,
  p.email,
  p.phone,
  COUNT(d.id) as document_count
FROM operator_profiles op
LEFT JOIN profiles p ON op.user_id = p.id
LEFT JOIN documents d ON d.user_id = op.user_id
WHERE 
  op.approval_status = 'pending'
  AND (op.profile_status = $profileStatus OR $profileStatus = 'all')
GROUP BY op.user_id, p.name, p.email, p.phone
ORDER BY op.created_at ASC
LIMIT $pageSize OFFSET $offset;
```

#### 9. Driver Verification Page
```sql
SELECT 
  dp.id,
  dp.user_id,
  dp.full_name,
  dp.license_number,
  dp.license_expiry,
  dp.verification_status,
  dp.approval_status,
  dp.submission_status,
  dp.created_at,
  dp.submitted_at,
  p.email,
  p.phone,
  op.company_name as operator_name,
  COUNT(d.id) as document_count
FROM driver_profiles dp
LEFT JOIN profiles p ON dp.user_id = p.id
LEFT JOIN operator_profiles op ON dp.operator_id = op.user_id
LEFT JOIN documents d ON d.user_id = dp.user_id
WHERE 
  (dp.approval_status = $status OR $status = 'all')
  AND (dp.submission_status = $submissionStatus OR $submissionStatus = 'all')
GROUP BY dp.id, p.email, p.phone, op.company_name
ORDER BY dp.submitted_at DESC NULLS LAST
LIMIT $pageSize OFFSET $offset;
```

#### 10. Subscriptions Page
```sql
SELECT 
  m.id,
  m.user_id,
  m.membership_tier,
  m.bmtoa_member_number,
  m.status,
  m.joined_date,
  m.expiry_date,
  m.monthly_fee,
  p.name,
  p.email,
  op.company_name,
  COUNT(sp.id) as payment_count,
  SUM(sp.amount) as total_paid
FROM memberships m
LEFT JOIN profiles p ON m.user_id = p.id
LEFT JOIN operator_profiles op ON op.user_id = m.user_id
LEFT JOIN subscription_payments sp ON sp.membership_id = m.id
WHERE 
  (m.status = $status OR $status = 'all')
  AND (m.membership_tier = $tier OR $tier = 'all')
GROUP BY m.id, p.name, p.email, op.company_name
ORDER BY m.joined_date DESC
LIMIT $pageSize OFFSET $offset;
```

#### 11. Admin Users Page
```sql
SELECT 
  p.id,
  p.email,
  p.name,
  p.phone,
  p.account_status,
  p.created_at,
  p.last_login_at,
  p.login_count
FROM profiles p
WHERE 
  p.user_type = 'admin'
  AND (p.account_status = $status OR $status = 'all')
ORDER BY p.created_at DESC
LIMIT $pageSize OFFSET $offset;
```

#### 12. Support Tickets Page
```sql
SELECT 
  st.id,
  st.subject,
  st.category,
  st.priority,
  st.status,
  st.created_at,
  st.resolved_at,
  u.name as user_name,
  u.email as user_email,
  a.name as assigned_to_name
FROM support_tickets st
LEFT JOIN profiles u ON st.user_id = u.id
LEFT JOIN profiles a ON st.assigned_to = a.id
WHERE 
  (st.status = $status OR $status = 'all')
  AND (st.priority = $priority OR $priority = 'all')
  AND (st.category = $category OR $category = 'all')
ORDER BY 
  CASE WHEN st.priority = 'urgent' THEN 1
       WHEN st.priority = 'high' THEN 2
       WHEN st.priority = 'medium' THEN 3
       ELSE 4 END,
  st.created_at DESC
LIMIT $pageSize OFFSET $offset;
```

### User Guide Data Model

```javascript
// Database table: user_guides
{
  id: uuid,
  title: string,
  slug: string,
  category: string, // 'getting-started', 'booking', 'payments', 'account', 'troubleshooting'
  user_type: string[], // ['individual', 'corporate', 'driver', 'operator', 'admin']
  content: text, // Markdown content
  order: integer,
  featured: boolean,
  tags: string[],
  created_at: timestamp,
  updated_at: timestamp,
  published: boolean
}
```

## Error Handling

### Database Query Errors

```javascript
const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const { data, error, count } = await buildQuery('table_name', {
      filters,
      pagination,
      select: '*, related_table(*)'
    });
    
    if (error) throw error;
    
    setData(data || []);
    setTotalCount(count || 0);
  } catch (error) {
    console.error('Error loading data:', error);
    setError(error.message);
    setData([]);
  } finally {
    setLoading(false);
  }
};
```

### CRUD Operation Errors

```javascript
const handleUpdate = async (id, formData) => {
  try {
    setProcessing(true);
    
    // Validate form data
    const validationError = validateFormData(formData);
    if (validationError) {
      throw new Error(validationError);
    }
    
    // Update database
    const { error } = await supabase
      .from('table_name')
      .update(formData)
      .eq('id', id);
    
    if (error) throw error;
    
    // Show success message
    showSuccessToast('Record updated successfully');
    
    // Reload data
    await loadData();
  } catch (error) {
    console.error('Error updating record:', error);
    showErrorToast(error.message);
  } finally {
    setProcessing(false);
  }
};
```

### User-Friendly Error Messages

```javascript
const getErrorMessage = (error) => {
  const errorMap = {
    '23505': 'A record with this value already exists',
    '23503': 'Cannot delete this record as it is referenced by other records',
    '42501': 'You do not have permission to perform this action',
    'PGRST116': 'No records found matching your criteria'
  };
  
  return errorMap[error.code] || error.message || 'An unexpected error occurred';
};
```

## Testing Strategy

### Unit Tests

Test individual functions and components:

```javascript
describe('buildQuery', () => {
  it('should build query with filters', () => {
    const query = buildQuery('profiles', {
      filters: { user_type: 'driver', platform: 'taxicab' }
    });
    expect(query).toBeDefined();
  });
  
  it('should apply pagination correctly', () => {
    const query = buildQuery('profiles', {
      pagination: { page: 2, pageSize: 20 }
    });
    // Verify range is set to 20-39
  });
});
```

### Integration Tests

Test database queries against Supabase:

```javascript
describe('Users Page Queries', () => {
  it('should fetch users with correct filters', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'driver')
      .limit(10);
    
    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data.every(u => u.user_type === 'driver')).toBe(true);
  });
});
```

### Manual Testing Checklist

For each admin page:
- [ ] Page loads without errors
- [ ] Data displays correctly from database
- [ ] All filters work as expected
- [ ] Pagination works correctly
- [ ] Create operation works and validates input
- [ ] Update operation works and validates input
- [ ] Delete operation works with confirmation
- [ ] No demo data is displayed
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly

## User Guide Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Guide Section                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Category     │  │ Article      │  │ Search       │     │
│  │ Navigation   │  │ Content      │  │ Results      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Guide Categories

1. **Getting Started**
   - Creating an account
   - Completing your profile
   - Understanding user types
   - Platform navigation

2. **Booking & Rides**
   - How to book a ride
   - Scheduling recurring trips
   - Managing saved places
   - Cancellation policies

3. **Payments & Billing**
   - Payment methods
   - Corporate credit accounts
   - Viewing invoices
   - Payment verification

4. **Account Management**
   - Updating profile information
   - Managing documents
   - Subscription management
   - Account security

5. **Troubleshooting**
   - Common issues and solutions
   - Contact support
   - FAQ

### Content Structure

Each guide article will have:
- Clear title and description
- Step-by-step instructions with numbered lists
- Screenshots or diagrams where helpful
- Related articles section
- "Was this helpful?" feedback mechanism

### Search Functionality

```javascript
const searchGuides = async (query) => {
  const { data, error } = await supabase
    .from('user_guides')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
    .eq('published', true)
    .order('order', { ascending: true });
  
  return data;
};
```

## Performance Considerations

### Query Optimization

1. **Use Indexes**: Ensure database tables have indexes on frequently filtered columns
2. **Limit Joins**: Only join tables when necessary for display
3. **Select Specific Columns**: Avoid `SELECT *` when only specific fields are needed
4. **Use Count Efficiently**: Use Supabase's `count: 'exact'` option for pagination

### Pagination Strategy

- Default page size: 20 items
- Maximum page size: 100 items
- Use offset-based pagination for simplicity
- Display total count and current page info

### Caching Strategy

- Cache filter options (user types, statuses, etc.) in component state
- Debounce search inputs to reduce query frequency
- Use React Query or SWR for automatic caching and revalidation (optional enhancement)

## Security Considerations

### Row Level Security (RLS)

Ensure RLS policies are enabled on all tables:

```sql
-- Example: Only admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);
```

### Input Validation

- Validate all form inputs before submission
- Sanitize user input to prevent SQL injection
- Use Supabase's built-in parameterized queries

### Authentication

- Verify admin user type before allowing access to admin pages
- Use Supabase auth to check user session
- Redirect non-admin users to appropriate dashboard

## Deployment Strategy

### Phase 1: Audit and Fix Core Pages (Week 1)
- Dashboard overview
- Users page
- Trips page
- Payments verification

### Phase 2: BMTOA Features (Week 2)
- BMTOA reports
- Members page
- Member requests
- Driver verification
- Subscriptions

### Phase 3: Additional Features (Week 3)
- Corporate accounts
- Content management
- Admin users
- Support tickets

### Phase 4: User Guide (Week 4)
- Create user_guides table
- Build guide UI components
- Write initial guide content
- Implement search functionality

### Testing and Validation
- Test each page after implementation
- Verify all queries return correct data
- Ensure filters and pagination work
- Remove all demo data
- User acceptance testing

## Monitoring and Maintenance

### Logging

Log important operations:
```javascript
const logAdminAction = async (action, details) => {
  await supabase.from('admin_logs').insert({
    admin_id: currentUser.id,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};
```

### Error Tracking

- Use console.error for development
- Integrate error tracking service (e.g., Sentry) for production
- Monitor Supabase logs for query errors

### Performance Monitoring

- Track query execution times
- Monitor page load times
- Set up alerts for slow queries or errors
