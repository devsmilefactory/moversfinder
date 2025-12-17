# Requirements Document

## Introduction

This specification defines the requirements for auditing and ensuring all admin features in the TaxiCab/BMTOA platform are fully functional with proper Supabase integration, and adding a comprehensive user guide section. The admin dashboard manages users, trips, payments, corporate accounts, BMTOA members, driver verification, subscriptions, and support tickets. All features must have correct database queries, functional filters, proper pagination, and complete CRUD operations.

## Glossary

- **Admin Dashboard**: The administrative interface for managing the TaxiCab and BMTOA platforms
- **Supabase**: The backend database and API service used for data storage and retrieval
- **CRUD Operations**: Create, Read, Update, Delete operations on database entities
- **RLS**: Row Level Security policies in Supabase
- **Pagination**: Breaking large datasets into pages for better performance
- **Filter**: User interface controls to narrow down displayed data based on criteria
- **BMTOA**: Bermuda Minibus Taxi Operators Association
- **Corporate Account**: Business accounts that book rides for employees or groups
- **User Guide**: Documentation section helping users understand platform features

## Requirements

### Requirement 1: Admin Dashboard Overview Page

**User Story:** As an admin, I want to see accurate statistics and data on the dashboard overview, so that I can monitor platform health at a glance

#### Acceptance Criteria

1. WHEN THE Admin Dashboard loads, THE System SHALL display total user counts from the profiles table
2. WHEN THE Admin Dashboard loads, THE System SHALL display total trip counts from the rides table
3. WHEN THE Admin Dashboard loads, THE System SHALL display revenue statistics calculated from the payments table
4. WHEN THE Admin Dashboard loads, THE System SHALL display active driver counts WHERE user_type equals 'driver'
5. THE System SHALL remove any demo or mock data from the dashboard statistics

### Requirement 2: Users Management Page

**User Story:** As an admin, I want to manage all platform users with proper filtering and pagination, so that I can efficiently oversee user accounts

#### Acceptance Criteria


1. WHEN THE Users Page loads, THE System SHALL query the profiles table with proper joins to related profile tables
2. WHEN an admin applies filters, THE System SHALL filter users by user_type, platform, account_status, and date ranges
3. WHEN displaying user lists, THE System SHALL implement pagination with configurable page sizes
4. WHEN an admin views user details, THE System SHALL display complete profile information from the appropriate profile table
5. WHEN an admin updates a user, THE System SHALL validate form fields against database schema constraints
6. WHEN an admin creates a user, THE System SHALL insert records into both auth.users and profiles tables
7. WHEN an admin deletes a user, THE System SHALL handle cascading deletes for related records
8. THE System SHALL remove any demo or hardcoded user data

### Requirement 3: Trips Management Page

**User Story:** As an admin, I want to view and manage all trips with accurate data and filtering, so that I can monitor ride activity

#### Acceptance Criteria

1. WHEN THE Trips Page loads, THE System SHALL query the rides table with joins to profiles, vehicles, and corporate_profiles
2. WHEN an admin applies filters, THE System SHALL filter trips by status, service_type, date range, and payment_status
3. WHEN displaying trip lists, THE System SHALL implement pagination with proper offset and limit calculations
4. WHEN an admin views trip details, THE System SHALL display complete ride information including pickup, dropoff, and fare details
5. WHEN an admin updates trip status, THE System SHALL update the ride_status field and create a ride_status_history record
6. THE System SHALL calculate accurate trip statistics using COUNT and SUM aggregations
7. THE System SHALL remove any demo or mock trip data

### Requirement 4: Payments Verification Page

**User Story:** As an admin, I want to verify and manage payment records, so that I can ensure financial accuracy

#### Acceptance Criteria

1. WHEN THE Payments Page loads, THE System SHALL query subscription_payments and payment_proofs tables
2. WHEN an admin applies filters, THE System SHALL filter payments by verification_status, payment_method, and date range
3. WHEN displaying payment lists, THE System SHALL implement pagination with proper row counting
4. WHEN an admin verifies a payment, THE System SHALL update verification_status to 'verified' and record verified_by and verified_at
5. WHEN an admin rejects a payment, THE System SHALL update verification_status to 'rejected' and store rejection_reason
6. THE System SHALL display proof_of_payment_url documents for review
7. THE System SHALL remove any demo payment data

### Requirement 5: BMTOA Reports Page

**User Story:** As an admin, I want to generate and view BMTOA-specific reports, so that I can track association metrics

#### Acceptance Criteria

1. WHEN THE BMTOA Reports Page loads, THE System SHALL query operator_profiles WHERE platform equals 'bmtoa' OR 'both'
2. WHEN generating membership reports, THE System SHALL count memberships by membership_tier
3. WHEN generating subscription reports, THE System SHALL query subscription_payments grouped by payment_for_month
4. WHEN an admin applies date filters, THE System SHALL filter reports by created_at or payment_date ranges
5. WHEN displaying reports, THE System SHALL implement pagination for large result sets
6. THE System SHALL calculate accurate totals using database aggregation functions
7. THE System SHALL remove any demo report data

### Requirement 6: Corporate Accounts Management Page

**User Story:** As an admin, I want to manage corporate accounts with full CRUD operations, so that I can oversee business clients

#### Acceptance Criteria

1. WHEN THE Corporate Accounts Page loads, THE System SHALL query corporate_profiles with credit_balance and monthly_spend
2. WHEN an admin applies filters, THE System SHALL filter accounts by account_tier, verification_status, and credit_booking_approved
3. WHEN displaying account lists, THE System SHALL implement pagination with proper limit and offset
4. WHEN an admin creates a corporate account, THE System SHALL validate all required fields against corporate_profiles schema
5. WHEN an admin updates account details, THE System SHALL update corporate_profiles and handle credit_transactions if balance changes
6. WHEN an admin views account details, THE System SHALL display related corporate_passengers and invoices
7. THE System SHALL remove any demo corporate account data

### Requirement 7: Content Management Page

**User Story:** As an admin, I want to manage platform content, so that I can update information displayed to users

#### Acceptance Criteria

1. WHEN THE Content Page loads, THE System SHALL query content tables or configuration storage
2. WHEN an admin creates content, THE System SHALL validate content structure and save to appropriate table
3. WHEN an admin updates content, THE System SHALL update the content record with updated_at timestamp
4. WHEN an admin deletes content, THE System SHALL remove the content record from the database
5. WHEN displaying content lists, THE System SHALL implement pagination for large content sets
6. THE System SHALL support filtering content by type, status, or category
7. THE System SHALL remove any demo content data

### Requirement 8: Members Management Page

**User Story:** As an admin, I want to manage BMTOA members, so that I can oversee association membership

#### Acceptance Criteria

1. WHEN THE Members Page loads, THE System SHALL query operator_profiles WHERE bmtoa_verified equals true
2. WHEN an admin applies filters, THE System SHALL filter members by membership_tier, subscription_status, and bmtoa_member_since
3. WHEN displaying member lists, THE System SHALL implement pagination with configurable page sizes
4. WHEN an admin views member details, THE System SHALL display operator_profiles with related vehicles and drivers
5. WHEN an admin updates member information, THE System SHALL update operator_profiles table
6. THE System SHALL calculate membership statistics using COUNT and GROUP BY operations
7. THE System SHALL remove any demo member data

### Requirement 9: Member Requests Management Page

**User Story:** As an admin, I want to review and approve member requests, so that I can control association membership

#### Acceptance Criteria

1. WHEN THE Member Requests Page loads, THE System SHALL query operator_profiles WHERE approval_status equals 'pending'
2. WHEN an admin applies filters, THE System SHALL filter requests by profile_status and created_at date range
3. WHEN displaying request lists, THE System SHALL implement pagination with proper row counting
4. WHEN an admin approves a request, THE System SHALL update approval_status to 'approved', set approved_by, approved_at, and bmtoa_verified to true
5. WHEN an admin rejects a request, THE System SHALL update approval_status to 'rejected' and store rejection_reason
6. WHEN an admin views request details, THE System SHALL display all operator_profiles fields and uploaded documents
7. THE System SHALL remove any demo request data

### Requirement 10: Driver Verification Page

**User Story:** As an admin, I want to verify driver profiles and documents, so that I can ensure driver compliance

#### Acceptance Criteria

1. WHEN THE Driver Verification Page loads, THE System SHALL query driver_profiles with related documents from documents table
2. WHEN an admin applies filters, THE System SHALL filter drivers by verification_status, approval_status, and submission_status
3. WHEN displaying driver lists, THE System SHALL implement pagination with proper offset calculations
4. WHEN an admin verifies a driver, THE System SHALL update approval_status to 'approved', set approved_by and approved_at
5. WHEN an admin declines a driver, THE System SHALL update approval_status to 'rejected' and store decline_reasons as jsonb array
6. WHEN an admin views driver details, THE System SHALL display driver_profiles with all document URLs
7. THE System SHALL remove any demo driver data

### Requirement 11: Subscriptions Management Page

**User Story:** As an admin, I want to manage subscriptions and membership tiers, so that I can oversee recurring payments

#### Acceptance Criteria

1. WHEN THE Subscriptions Page loads, THE System SHALL query memberships table with related subscription_payments
2. WHEN an admin applies filters, THE System SHALL filter subscriptions by status, membership_tier, and expiry_date
3. WHEN displaying subscription lists, THE System SHALL implement pagination with configurable limits
4. WHEN an admin creates a subscription, THE System SHALL insert into memberships table with proper tier and fee
5. WHEN an admin updates a subscription, THE System SHALL update memberships table and handle status changes
6. WHEN an admin views subscription details, THE System SHALL display payment history from subscription_payments
7. THE System SHALL remove any demo subscription data

### Requirement 12: Admin Users Management Page

**User Story:** As an admin, I want to manage admin user accounts, so that I can control platform administration access

#### Acceptance Criteria

1. WHEN THE Admin Users Page loads, THE System SHALL query profiles WHERE user_type equals 'admin'
2. WHEN an admin applies filters, THE System SHALL filter admin users by account_status and created_at
3. WHEN displaying admin user lists, THE System SHALL implement pagination with proper row limits
4. WHEN an admin creates an admin user, THE System SHALL insert into auth.users and profiles with user_type 'admin'
5. WHEN an admin updates admin user details, THE System SHALL update profiles table with validation
6. WHEN an admin deactivates an admin user, THE System SHALL update account_status to 'disabled'
7. THE System SHALL remove any demo admin user data

### Requirement 13: Support Tickets Management Page

**User Story:** As an admin, I want to manage support tickets, so that I can provide customer support

#### Acceptance Criteria

1. WHEN THE Support Tickets Page loads, THE System SHALL query support_tickets with joins to profiles for user details
2. WHEN an admin applies filters, THE System SHALL filter tickets by status, priority, category, and created_at
3. WHEN displaying ticket lists, THE System SHALL implement pagination with proper offset and limit
4. WHEN an admin assigns a ticket, THE System SHALL update assigned_to field with admin user_id
5. WHEN an admin resolves a ticket, THE System SHALL update status to 'resolved', set resolution text, and record resolved_at
6. WHEN an admin views ticket details, THE System SHALL display complete ticket information with user context
7. THE System SHALL remove any demo ticket data

### Requirement 14: User Guide Section

**User Story:** As a platform user, I want to access comprehensive guides on using the platform, so that I can learn features independently

#### Acceptance Criteria

1. WHEN a user navigates to the user guide section, THE System SHALL display a categorized list of guide articles
2. WHEN a user selects a guide article, THE System SHALL display the article content with clear formatting
3. THE System SHALL organize guides by user type: individual, corporate, driver, operator, and admin
4. THE System SHALL include guides for common tasks: booking rides, managing payments, profile setup, and troubleshooting
5. THE System SHALL provide search functionality to find relevant guide articles
6. THE System SHALL display guide articles with step-by-step instructions and screenshots where applicable
7. THE System SHALL store guide content in a database table or content management system for easy updates
