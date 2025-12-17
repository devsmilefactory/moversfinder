# Implementation Plan

## Overview

This implementation plan outlines the tasks for creating comprehensive documentation for the Movers Finder platform (formerly TaxiCab). The documentation will cover all current features, user types, processes, and planned enhancements.

## Tasks

- [x] 1. Set up documentation structure and tooling



  - Create `/docs` folder in workspace root
  - Set up documentation templates
  - Configure Mermaid diagram rendering
  - Create README.md with table of contents



  - _Requirements: 14.1, 14.2, 14.3_

- [ ] 2. Analyze current implementation across all applications
  - [ ] 2.1 Analyze pwa_app codebase
    - Review authentication flows
    - Review profile management
    - Review ride booking and lifecycle
    - Review payment processing
    - Document findings
    - _Requirements: 1.1, 1.3_
  
  - [ ] 2.2 Analyze taxicab_landing codebase
    - Review marketing pages
    - Review public-facing features
    - Document findings
    - _Requirements: 1.1, 1.3_
  
  - [ ] 2.3 Analyze bmtoa_landing codebase
    - Review admin features
    - Review member management
    - Document findings
    - _Requirements: 1.1, 1.3_
  
  - [ ] 2.4 Query and document database schema
    - Use Supabase MCP to list all tables
    - Document table structures
    - Document relationships and constraints
    - Document RPC functions
    - _Requirements: 1.2_

- [ ] 3. Create executive summary and architecture documentation
  - [ ] 3.1 Write executive summary
    - Platform overview
    - Key features
    - User types
    - Technology stack
    - _Requirements: 11.1_
  
  - [ ] 3.2 Document system architecture
    - Create architecture diagrams
    - Document component interactions
    - Document real-time subscriptions
    - _Requirements: 11.2_
  
  - [ ] 3.3 Document database schema
    - Complete table documentation
    - Relationship diagrams
    - RPC function reference
    - _Requirements: 1.2, 11.2_

- [ ] 4. Document authentication for all user types
  - [ ] 4.1 Document Individual authentication
    - Registration flow with diagrams
    - Login flow (password and OTP)
    - Password recovery
    - Code examples from implementation
    - _Requirements: 2.1_
  
  - [ ] 4.2 Document Corporate authentication
    - Registration flow
    - Login flow
    - Business-specific requirements
    - _Requirements: 2.2_
  
  - [ ] 4.3 Document Driver authentication
    - Registration flow
    - Login flow (OTP-based)
    - Approval requirements
    - _Requirements: 2.3_
  
  - [ ] 4.4 Document Operator authentication
    - Registration flow
    - Login flow
    - BMTOA verification
    - _Requirements: 2.4_
  
  - [ ] 4.5 Document Admin authentication
    - Access controls
    - Permission levels
    - _Requirements: 2.5_

- [ ] 5. Document profile management and approval workflows
  - [ ] 5.1 Create profile state machine documentation
    - State diagram (not_created → in_progress → pending_approval → approved)
    - State-based UI rendering
    - Transition rules
    - _Requirements: 3.1, 3.2_
  
  - [ ] 5.2 Document Individual profile management
    - Profile creation process
    - Auto-approval flow
    - Profile fields and validation
    - _Requirements: 3.3_
  
  - [ ] 5.3 Document Corporate profile management
    - Profile creation process
    - Credit account approval workflow
    - Profile fields and validation
    - _Requirements: 3.4_
  
  - [ ] 5.4 Document Driver profile management
    - Profile creation process
    - Document requirements
    - Approval workflow with state diagram
    - Operator assignment process
    - _Requirements: 3.5_
  
  - [ ] 5.5 Document Operator profile management
    - Profile creation process
    - BMTOA verification process
    - Approval workflow
    - Grace period management
    - _Requirements: 3.6_
  
  - [ ] 5.6 Create comprehensive approval workflow documentation
    - Approval criteria for each user type
    - Admin review process
    - Rejection and resubmission flows
    - _Requirements: 3.7_

- [ ] 6. Document ride booking and management
  - [ ] 6.1 Document ride booking process
    - Individual booking flow
    - Corporate booking flow
    - Booking form fields
    - Validation rules
    - _Requirements: 4.1, 4.2_
  
  - [ ] 6.2 Document all ride categories
    - Existing categories (taxi, courier, errands, school_run, work_run)
    - Category-specific features
    - Database fields for each category
    - _Requirements: 5.1_
  
  - [ ] 6.3 Document pricing calculation
    - Pricing methodology for each category
    - Base rates and multipliers
    - Distance and time calculations
    - Code examples
    - _Requirements: 4.3_
  
  - [ ] 6.4 Document bidding system
    - Driver offer placement
    - Passenger offer acceptance
    - Atomic bid acceptance (RPC function)
    - _Requirements: 8.4_
  
  - [ ] 6.5 Document ride lifecycle
    - Complete state machine
    - Passenger-side states and sub-states
    - Driver-side states and sub-states
    - State transitions with diagrams
    - _Requirements: 8.1, 8.2_
  
  - [ ] 6.6 Document scheduled and recurring rides
    - Instant vs scheduled rides
    - Recurring ride series
    - Reminder system
    - _Requirements: 4.6_

- [ ] 7. Document corporate booking enhancements
  - [ ] 7.1 Document bulk ride features
    - Single destination bulk rides
    - Multiple destinations with single pickup
    - Multiple pickups and drop-offs
    - _Requirements: 7.2_
  
  - [ ] 7.2 Document passenger management
    - Saved passenger lists
    - Manual passenger entry
    - Dynamic passenger addition
    - CSV upload functionality
    - _Requirements: 7.4_
  
  - [ ] 7.3 Document corporate ride targeting
    - Operator targeting
    - Corporate vs Individual badge
    - _Requirements: 7.5_

- [ ] 8. Document payment methods and processing
  - [ ] 8.1 Document all payment methods
    - EcoCash, OneMoney, Bank Transfer, Cash, USD Card
    - Payment method setup
    - Default payment selection
    - _Requirements: 4.4_
  
  - [ ] 8.2 Document prepaid accounts
    - Account setup for individuals
    - Account setup for corporates
    - Balance management
    - Top-up process
    - _Requirements: 4.4_
  
  - [ ] 8.3 Document corporate credit accounts
    - Credit account request process
    - Approval workflow
    - Credit limit management
    - Billing and invoicing
    - _Requirements: 4.5_

- [ ] 9. Document saved items features
  - [ ] 9.1 Document saved places
    - Saving addresses during booking
    - Managing saved places
    - Using saved places in bookings
    - Database schema
    - _Requirements: 12.3, 12.6_
  
  - [ ] 9.2 Document saved trips
    - Saving trips after completion
    - Managing saved trip templates
    - Using templates for new bookings
    - Database schema
    - _Requirements: 12.2, 12.5_
  
  - [ ] 9.3 Document saved drivers (planned feature)
    - Saving drivers after completion
    - Managing favorite drivers
    - Booking with saved drivers
    - Proposed database schema
    - _Requirements: 12.1, 12.4_

- [ ] 10. Document complete user journeys
  - [ ] 10.1 Document Individual user journey
    - Registration to first ride
    - Booking process
    - Ride completion and rating
    - Saved items usage
    - _Requirements: 10.1_
  
  - [ ] 10.2 Document Corporate user journey
    - Registration and profile setup
    - Bulk booking process
    - Passenger management
    - Credit account usage
    - _Requirements: 10.1_
  
  - [ ] 10.3 Document Driver user journey
    - Registration and profile creation
    - Document submission
    - Approval process
    - Accepting rides
    - Ride completion
    - _Requirements: 10.1_
  
  - [ ] 10.4 Document Operator user journey
    - Registration and profile creation
    - BMTOA verification
    - Fleet management
    - Driver assignment
    - _Requirements: 10.1_

- [ ] 11. Document key processes
  - [ ] 11.1 Document ride completion process
    - Driver completion flow
    - Passenger rating flow
    - Driver rating flow
    - Payment processing
    - _Requirements: 10.2_
  
  - [ ] 11.2 Document cancellation workflows
    - Passenger cancellation
    - Driver cancellation
    - Cancellation reasons
    - Refund processing
    - _Requirements: 10.2_
  
  - [ ] 11.3 Document rating and review system
    - Passenger rating drivers
    - Drivers rating passengers
    - Review submission
    - Rating display
    - _Requirements: 10.3_
  
  - [ ] 11.4 Document referral program
    - Referral mechanics
    - Reward system
    - Tracking referrals
    - _Requirements: 10.4_

- [ ] 12. Specify new features (to be implemented)
  - [ ] 12.1 Specify AI-powered audio booking
    - UI placement and design
    - Chat interface specifications
    - AI interaction flow
    - CTA and quick action buttons
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 12.2 Specify new ride categories
    - Bulk, Car Hire, Refuse Movers, Gas Movers
    - House Movers, Haulage, Other
    - Category-specific features
    - Pricing models
    - _Requirements: 5.2, 5.3_
  
  - [ ] 12.3 Specify scrollable bottom tabs UI
    - UI design for expanded categories
    - Scrolling behavior
    - Category icons and labels
    - _Requirements: 5.3_
  
  - [ ] 12.4 Specify driver/operator profile sharing
    - Profile sharing workflow
    - Post-ride sharing prompt
    - Shareable profile format
    - Direct booking with shared profiles
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 12.5 Specify driver/operator UI enhancements
    - New bottom tab navigation
    - Rides tab (existing functionality)
    - Performance tab (metrics, earnings, analytics)
    - Share Profile tab
    - Community tab (WhatsApp-style chat)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 12.6 Specify community chat feature
    - Message labels (Ride Offers, Alerts, Emergency, Police Roadblock, Other)
    - Chat filtering by label
    - Group chat functionality
    - _Requirements: 9.5_

- [ ] 13. Create UI specifications
  - [ ] 13.1 Document passenger interface
    - Screen layouts
    - Navigation patterns
    - Component specifications
    - State-based UI changes
    - _Requirements: 11.1_
  
  - [ ] 13.2 Document driver interface
    - Current interface
    - New bottom tab navigation
    - Screen layouts for new tabs
    - _Requirements: 11.1_
  
  - [ ] 13.3 Document operator interface
    - Fleet management screens
    - Driver assignment interface
    - Analytics and reporting
    - _Requirements: 11.1_
  
  - [ ] 13.4 Document admin interface
    - User management
    - Approval workflows
    - System configuration
    - _Requirements: 11.1_

- [ ] 14. Review and finalize documentation
  - [ ] 14.1 Validate code cross-references
    - Verify all code examples exist
    - Validate file paths and line numbers
    - Ensure code snippets are current
    - _Requirements: 11.4_
  
  - [ ] 14.2 Validate database schema documentation
    - Cross-reference with actual database
    - Verify field names and types
    - Validate RPC function signatures
    - _Requirements: 11.4_
  
  - [ ] 14.3 Validate process flows
    - Trace flows through code
    - Verify state transitions
    - Validate user journey completeness
    - _Requirements: 11.4_
  
  - [ ] 14.4 Validate diagrams
    - Ensure Mermaid diagrams render
    - Verify diagram logic matches code
    - Validate state machine completeness
    - _Requirements: 11.2_
  
  - [ ] 14.5 Final review and polish
    - Check for consistency
    - Verify all requirements covered
    - Update table of contents
    - Fix broken cross-references
    - _Requirements: 11.1, 11.5_

- [ ] 15. Checkpoint - Documentation complete
  - Ensure all documentation is accurate and complete
  - Verify all diagrams render correctly
  - Confirm all user types and processes are documented
  - Ask the user if questions arise
