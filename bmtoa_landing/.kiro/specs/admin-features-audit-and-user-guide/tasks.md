# Implementation Plan

- [x] 1. Create shared admin utilities and services




  - Create centralized Supabase query builder service at `src/services/adminQueries.js`
  - Create reusable filter component at `src/dashboards/shared/FilterBar.jsx`
  - Create reusable pagination component at `src/dashboards/shared/Pagination.jsx`
  - Create error handling utilities at `src/utils/errorHandling.js`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1_

- [x] 2. Audit and fix Dashboard Overview page




  - [x] 2.1 Update AdminDashboardContent.jsx to query profiles table for total user count

    - Replace any demo data with `SELECT COUNT(*) FROM profiles`
    - Add proper error handling for query failures
    - _Requirements: 1.1_
  - [x] 2.2 Query rides table for total trip count and revenue statistics

    - Implement `SELECT COUNT(*) FROM rides` for total trips
    - Implement `SELECT SUM(fare) FROM rides WHERE status = 'completed'` for revenue
    - _Requirements: 1.2, 1.3_

  - [x] 2.3 Query for active driver count

    - Implement `SELECT COUNT(*) FROM profiles WHERE user_type = 'driver' AND account_status = 'active'`
    - _Requirements: 1.4_
  - [x] 2.4 Remove all demo/mock data from dashboard


    - Search for hardcoded values and replace with database queries
    - _Requirements: 1.5_

- [x] 3. Audit and fix Users Management page



  - [x] 3.1 Update UsersPage.jsx query to include proper joins


    - Add LEFT JOIN to count total rides per user
    - Ensure query matches design specification
    - _Requirements: 2.1_
  - [x] 3.2 Implement all filter functionality

    - Add filters for user_type, platform, account_status, and date ranges
    - Ensure filters update query correctly
    - _Requirements: 2.2_
  - [x] 3.3 Implement pagination with configurable page sizes

    - Add pagination controls with page size selector (10, 20, 50, 100)
    - Implement proper offset calculation
    - Display total count and current page info
    - _Requirements: 2.3_

  - [x] 3.4 Verify user details modal displays complete profile information



    - Ensure modal queries appropriate profile table (individual_profiles, corporate_profiles, driver_profiles, operator_profiles)








    - _Requirements: 2.4_





  - [ ] 3.5 Validate update user form against database schema
    - Add form validation for all fields



    - Ensure constraints match profiles table schema



    - _Requirements: 2.5_


  - [ ] 3.6 Implement create user functionality
    - Create form for new user creation

    - Insert into both auth.users and profiles tables
    - Handle errors and display success message
    - _Requirements: 2.6_

  - [ ] 3.7 Implement delete user with cascading deletes
    - Add confirmation dialog


    - Handle related records appropriately
    - _Requirements: 2.7_
  - [ ] 3.8 Remove demo user data
    - _Requirements: 2.8_

- [-] 4. Audit and fix Trips Management page

  - [x] 4.1 Update TripsPage.jsx query with all necessary joins






    - Add joins to profiles (user and driver), vehicles, and corporate_profiles
    - Ensure query matches design specification
    - _Requirements: 3.1_

  - [x] 4.2 Implement all trip filters

    - Add filters for status, service_type, date range, and payment_status




    - Ensure filters work correctly with query

    - _Requirements: 3.2_

  - [ ] 4.3 Implement pagination for trips
    - Add pagination controls with proper offset and limit

    - Display total count


    - _Requirements: 3.3_


  - [x] 4.4 Verify trip details modal shows complete information

    - Ensure all trip fields display correctly


    - _Requirements: 3.4_
  - [ ] 4.5 Implement trip status update functionality
    - Update ride_status field
    - Create ride_status_history record

    - _Requirements: 3.5_


  - [x] 4.6 Add trip statistics calculations







    - Use COUNT and SUM aggregations for stats cards
    - _Requirements: 3.6_
  - [x] 4.7 Remove demo trip data




    - _Requirements: 3.7_

- [x] 5. Audit and fix Payment Verification page



  - [x] 5.1 Update PaymentVerificationPage.jsx query

    - Query subscription_payments and payment_proofs tables





    - Add joins to corporate_profiles and profiles
    - _Requirements: 4.1_

  - [ ] 5.2 Implement payment filters
    - Add filters for verification_status, payment_method, and date range

    - _Requirements: 4.2_
  - [x] 5.3 Implement pagination for payments




    - Add pagination with proper row counting
    - _Requirements: 4.3_
  - [ ] 5.4 Verify payment approval workflow
    - Update verification_status to 'verified'
    - Record verified_by and verified_at



    - Update corporate account credit_balance
    - Create credit_transaction record
    - _Requirements: 4.4_

















  - [x] 5.5 Verify payment rejection workflow

    - Update verification_status to 'rejected'
    - Store rejection_reason
    - _Requirements: 4.5_
  - [ ] 5.6 Ensure proof_of_payment_url displays correctly
    - _Requirements: 4.6_
  - [ ] 5.7 Remove demo payment data
    - _Requirements: 4.7_

- [x] 6. Audit and fix BMTOA Reports page


  - [x] 6.1 Update BMTOAReportsPage.jsx queries

    - Query operator_profiles WHERE platform = 'bmtoa' OR 'both'
    - _Requirements: 5.1_

  - [ ] 6.2 Implement membership reports
    - Count memberships by membership_tier

    - _Requirements: 5.2_
  - [x] 6.3 Implement subscription reports

    - Query subscription_payments grouped by payment_for_month
    - _Requirements: 5.3_

  - [x] 6.4 Implement date filters for reports

    - Filter by created_at or payment_date ranges

    - _Requirements: 5.4_
  - [ ] 6.5 Implement pagination for reports
    - _Requirements: 5.5_
  - [ ] 6.6 Use database aggregation functions for totals
    - _Requirements: 5.6_
  - [ ] 6.7 Remove demo report data
    - _Requirements: 5.7_

- [x] 7. Audit and fix Corporate Accounts page



  - [x] 7.1 Update CorporateAccountsPage.jsx query

    - Query corporate_profiles with credit_balance and monthly_spend
    - Add joins for related data
    - _Requirements: 6.1_

  - [ ] 7.2 Implement corporate account filters
    - Add filters for account_tier, verification_status, and credit_booking_approved

    - _Requirements: 6.2_



  - [ ] 7.3 Implement pagination for corporate accounts
    - _Requirements: 6.3_

  - [x] 7.4 Implement create corporate account form


    - Validate all required fields against corporate_profiles schema
    - _Requirements: 6.4_




  - [x] 7.5 Implement update corporate account functionality

    - Update corporate_profiles table
    - Handle credit_transactions if balance changes
    - _Requirements: 6.5_
  - [ ] 7.6 Display related corporate_passengers and invoices
    - _Requirements: 6.6_
  - [ ] 7.7 Remove demo corporate account data
    - _Requirements: 6.7_

- [x] 8. Audit and fix Content Management page




  - [x] 8.1 Update ContentPage.jsx to query content tables

    - Determine content storage structure
    - _Requirements: 7.1_


  - [ ] 8.2 Implement create content functionality
    - Validate content structure
    - Save to appropriate table


    - _Requirements: 7.2_
  - [x] 8.3 Implement update content functionality


    - Update content record with updated_at timestamp
    - _Requirements: 7.3_

  - [x] 8.4 Implement delete content functionality




    - Remove content record from database

    - _Requirements: 7.4_


  - [x] 8.5 Implement pagination for content

    - _Requirements: 7.5_



  - [ ] 8.6 Implement content filters
    - Filter by type, status, or category
    - _Requirements: 7.6_
  - [ ] 8.7 Remove demo content data
    - _Requirements: 7.7_





- [x] 9. Audit and fix Members Management page

  - [x] 9.1 Update MembersPage.jsx query


    - Query operator_profiles WHERE bmtoa_verified = true
    - Add joins for related vehicles and drivers
    - _Requirements: 8.1_


  - [ ] 9.2 Implement member filters
    - Add filters for membership_tier, subscription_status, and bmtoa_member_since


    - _Requirements: 8.2_




  - [ ] 9.3 Implement pagination for members
    - _Requirements: 8.3_




  - [ ] 9.4 Display member details with related data
    - Show operator_profiles with related vehicles and drivers






    - _Requirements: 8.4_
  - [x] 9.5 Implement update member functionality

    - Update operator_profiles table
    - _Requirements: 8.5_


  - [x] 9.6 Calculate membership statistics


    - Use COUNT and GROUP BY operations
    - _Requirements: 8.6_



  - [x] 9.7 Remove demo member data


    - _Requirements: 8.7_



- [ ] 10. Audit and fix Member Requests page
  - [x] 10.1 Update MemberRequestsPage.jsx query

    - Query operator_profiles WHERE approval_status = 'pending'



    - _Requirements: 9.1_
  - [x] 10.2 Implement member request filters

    - Add filters for profile_status and created_at date range







    - _Requirements: 9.2_


  - [ ] 10.3 Implement pagination for member requests
    - _Requirements: 9.3_


  - [x] 10.4 Implement approve member request functionality




    - Update approval_status to 'approved'


    - Set approved_by, approved_at, and bmtoa_verified to true
    - _Requirements: 9.4_


  - [x] 10.5 Implement reject member request functionality




    - Update approval_status to 'rejected'


    - Store rejection_reason


    - _Requirements: 9.5_


  - [x] 10.6 Display request details with documents

    - Show all operator_profiles fields and uploaded documents
    - _Requirements: 9.6_











  - [x] 10.7 Remove demo request data


    - _Requirements: 9.7_








- [x] 11. Audit and fix Driver Verification page










  - [x] 11.1 Update DriverVerificationPage.jsx query
































    - Query driver_profiles with related documents from documents table


    - _Requirements: 10.1_



  - [ ] 11.2 Implement driver filters
    - Add filters for verification_status, approval_status, and submission_status






    - _Requirements: 10.2_

  - [ ] 11.3 Implement pagination for drivers
    - _Requirements: 10.3_


  - [ ] 11.4 Implement verify driver functionality
    - Update approval_status to 'approved'




    - Set approved_by and approved_at
    - _Requirements: 10.4_
  - [x] 11.5 Implement decline driver functionality


    - Update approval_status to 'rejected'


    - Store decline_reasons as jsonb array
    - _Requirements: 10.5_


  - [ ] 11.6 Display driver details with document URLs
    - _Requirements: 10.6_

  - [x] 11.7 Remove demo driver data





    - _Requirements: 10.7_



- [ ] 12. Audit and fix Subscriptions Management page
  - [ ] 12.1 Update SubscriptionsPage.jsx query
    - Query memberships table with related subscription_payments




    - _Requirements: 11.1_

  - [x] 12.2 Implement subscription filters

    - Add filters for status, membership_tier, and expiry_date
    - _Requirements: 11.2_
  - [ ] 12.3 Implement pagination for subscriptions
    - _Requirements: 11.3_

  - [ ] 12.4 Implement create subscription functionality
    - Insert into memberships table with proper tier and fee

    - _Requirements: 11.4_
  - [ ] 12.5 Implement update subscription functionality
    - Update memberships table and handle status changes
    - _Requirements: 11.5_
  - [ ] 12.6 Display subscription payment history
    - Show payment history from subscription_payments
    - _Requirements: 11.6_
  - [ ] 12.7 Remove demo subscription data
    - _Requirements: 11.7_

- [ ] 13. Audit and fix Admin Users Management page
  - [ ] 13.1 Update AdminUsersPage.jsx query
    - Query profiles WHERE user_type = 'admin'
    - _Requirements: 12.1_
  - [ ] 13.2 Implement admin user filters
    - Add filters for account_status and created_at
    - _Requirements: 12.2_
  - [ ] 13.3 Implement pagination for admin users
    - _Requirements: 12.3_
  - [ ] 13.4 Implement create admin user functionality
    - Insert into auth.users and profiles with user_type 'admin'
    - _Requirements: 12.4_
  - [ ] 13.5 Implement update admin user functionality
    - Update profiles table with validation
    - _Requirements: 12.5_
  - [ ] 13.6 Implement deactivate admin user functionality
    - Update account_status to 'disabled'
    - _Requirements: 12.6_
  - [ ] 13.7 Remove demo admin user data
    - _Requirements: 12.7_

- [ ] 14. Audit and fix Support Tickets page
  - [ ] 14.1 Update SupportTicketsPage.jsx query
    - Query support_tickets with joins to profiles for user details
    - _Requirements: 13.1_
  - [ ] 14.2 Implement ticket filters
    - Add filters for status, priority, category, and created_at
    - _Requirements: 13.2_
  - [ ] 14.3 Implement pagination for tickets
    - _Requirements: 13.3_
  - [ ] 14.4 Implement assign ticket functionality
    - Update assigned_to field with admin user_id
    - _Requirements: 13.4_
  - [ ] 14.5 Implement resolve ticket functionality
    - Update status to 'resolved'
    - Set resolution text and record resolved_at
    - _Requirements: 13.5_
  - [ ] 14.6 Display ticket details with user context
    - _Requirements: 13.6_
  - [ ] 14.7 Remove demo ticket data
    - _Requirements: 13.7_

- [ ] 15. Create user guide database and infrastructure
  - [ ] 15.1 Create user_guides table in Supabase
    - Create migration with table schema (id, title, slug, category, user_type, content, order, featured, tags, created_at, updated_at, published)
    - Add indexes on category, user_type, and published columns
    - _Requirements: 14.7_
  - [ ] 15.2 Create guide categories seed data
    - Insert initial categories: getting-started, booking, payments, account, troubleshooting
    - _Requirements: 14.3_
  - [ ] 15.3 Create guide query service
    - Create `src/services/guideService.js` with functions for fetching guides by category, searching, and filtering by user type
    - _Requirements: 14.1, 14.5_

- [ ] 16. Build user guide UI components
  - [ ] 16.1 Create UserGuide layout component
    - Create `src/pages/UserGuide/UserGuideLayout.jsx` with sidebar navigation and content area
    - _Requirements: 14.1_
  - [ ] 16.2 Create GuideCategoryList component
    - Create `src/pages/UserGuide/GuideCategoryList.jsx` to display categorized guide articles
    - _Requirements: 14.1_
  - [ ] 16.3 Create GuideArticle component
    - Create `src/pages/UserGuide/GuideArticle.jsx` to display article content with markdown rendering
    - _Requirements: 14.2, 14.6_
  - [ ] 16.4 Create GuideSearch component
    - Create `src/pages/UserGuide/GuideSearch.jsx` with search input and results display
    - _Requirements: 14.5_
  - [ ] 16.5 Add user guide routes to Routes.jsx
    - Add routes for /user-guide, /user-guide/:category, /user-guide/article/:slug
    - _Requirements: 14.1_

- [ ] 17. Write initial user guide content
  - [ ] 17.1 Write Getting Started guides
    - Create guides for: Creating an account, Completing your profile, Understanding user types, Platform navigation
    - _Requirements: 14.4_
  - [ ] 17.2 Write Booking & Rides guides
    - Create guides for: How to book a ride, Scheduling recurring trips, Managing saved places, Cancellation policies
    - _Requirements: 14.4_
  - [ ] 17.3 Write Payments & Billing guides
    - Create guides for: Payment methods, Corporate credit accounts, Viewing invoices, Payment verification
    - _Requirements: 14.4_
  - [ ] 17.4 Write Account Management guides
    - Create guides for: Updating profile information, Managing documents, Subscription management, Account security
    - _Requirements: 14.4_
  - [ ] 17.5 Write Troubleshooting guides
    - Create guides for: Common issues and solutions, Contact support, FAQ
    - _Requirements: 14.4_

- [ ] 18. Final testing and validation
  - [ ] 18.1 Test all admin pages for correct data display
    - Verify each page loads without errors and displays real database data
    - _Requirements: All_
  - [ ] 18.2 Test all filters and pagination
    - Verify filters work correctly on all pages
    - Verify pagination calculates offsets correctly
    - _Requirements: All_
  - [ ] 18.3 Test all CRUD operations
    - Verify create, update, and delete operations work correctly
    - Verify form validation matches database schema
    - _Requirements: All_
  - [ ] 18.4 Verify no demo data remains
    - Search codebase for hardcoded demo data
    - _Requirements: All_
  - [ ] 18.5 Test user guide functionality
    - Verify guides display correctly
    - Test search functionality
    - Test category filtering
    - _Requirements: 14.1-14.7_
