# Requirements Document

## Introduction

This document outlines the requirements for rebranding the TaxiCab e-hailing platform to "Movers Finder" and creating comprehensive documentation for all platform features, processes, and user types. The project encompasses analyzing the current implementation across three applications (pwa_app, taxicab_landing, bmtoa_landing), documenting existing features, and specifying new enhancements including AI-powered booking, expanded ride categories, and driver/operator interface improvements.

## Glossary

- **PWA**: Progressive Web Application - the main e-hailing application for passengers and drivers
- **Landing Page**: Marketing website for the platform
- **Members Platform**: Administrative interface for drivers, operators, and platform administrators (bmtoa)
- **Individual**: Regular passenger user type
- **Corporate**: Business account user type with bulk booking capabilities
- **Driver**: Individual service provider user type
- **Operator**: Fleet manager user type managing multiple vehicles
- **Admin**: Platform administrator user type
- **E-hailing**: Electronic hailing - on-demand transportation booking via mobile application
- **Ride Category**: Type of service offered (Taxi, Courier, Errands, School Run, Work Run, etc.)
- **Bulk Ride**: Corporate feature allowing multiple passengers or destinations in a single booking
- **Recurring Ride**: Scheduled ride that repeats on a defined pattern
- **Bidding System**: inDrive-style model where drivers submit offers and passengers accept them
- **Supabase**: Backend-as-a-Service platform used for database, authentication, and real-time features
- **RLS**: Row Level Security - database security policies in Supabase
- **RPC**: Remote Procedure Call - database functions callable from the application

## Requirements

### Requirement 1

**User Story:** As a project stakeholder, I want comprehensive documentation of the current platform implementation, so that I can understand all existing features, processes, and user flows before implementing enhancements.

#### Acceptance Criteria

1. WHEN analyzing the codebase THEN the system SHALL examine authentication flows, profile creation processes, ride booking logic, pricing calculations, and all features across pwa_app, taxicab_landing, and bmtoa_landing applications
2. WHEN reviewing database schemas THEN the system SHALL document all tables, fields, relationships, constraints, and RPC functions using Supabase
3. WHEN identifying current features THEN the system SHALL distinguish between implemented functionality and planned future enhancements
4. WHEN documenting processes THEN the system SHALL include process flows, state diagrams, and detailed descriptions matching the actual codebase implementation
5. WHEN finding inconsistencies THEN the system SHALL highlight them and request clarification before documenting

### Requirement 2

**User Story:** As a developer, I want documentation of authentication processes for all user types, so that I can understand and maintain the authentication system.

#### Acceptance Criteria

1. WHEN documenting Individual authentication THEN the system SHALL describe the complete login, registration, and password recovery flows
2. WHEN documenting Corporate authentication THEN the system SHALL describe business account-specific authentication requirements and flows
3. WHEN documenting Driver authentication THEN the system SHALL describe driver-specific authentication including approval requirements
4. WHEN documenting Operator authentication THEN the system SHALL describe fleet operator authentication including approval requirements
5. WHEN documenting Admin authentication THEN the system SHALL describe platform administrator authentication and access controls

### Requirement 3

**User Story:** As a developer, I want documentation of profile creation, update, and approval processes, so that I can understand the different approval workflows for each user type and how profile states affect the user interface.

#### Acceptance Criteria

1. WHEN documenting profile states THEN the system SHALL describe Incomplete, Awaiting Approval, and Approved states
2. WHEN documenting state-based UI THEN the system SHALL specify how the interface changes based on profile state
3. WHEN documenting Individual profiles THEN the system SHALL specify that no approval is required
4. WHEN documenting Corporate profiles THEN the system SHALL specify that approval is required only when choosing credit accounts
5. WHEN documenting Driver profiles THEN the system SHALL specify that approval is required and document the complete approval workflow
6. WHEN documenting Operator profiles THEN the system SHALL specify that approval is required and document the complete approval workflow
7. WHEN creating state diagrams THEN the system SHALL show all profile states including Incomplete, Awaiting Approval, Approved, Rejected, and Suspended

### Requirement 4

**User Story:** As a developer, I want documentation of the ride booking process and price calculation, so that I can understand and maintain the booking system.

#### Acceptance Criteria

1. WHEN documenting ride booking THEN the system SHALL describe the complete flow for Individual users
2. WHEN documenting corporate booking THEN the system SHALL describe bulk booking features including passenger management
3. WHEN documenting price calculation THEN the system SHALL detail the methodology for each ride category
4. WHEN documenting payment options THEN the system SHALL list all available payment methods including regular payment methods, prepaid accounts for individuals, and both prepaid and credit accounts for corporates
5. WHEN documenting credit accounts THEN the system SHALL specify that corporate users choosing credit accounts require approval
6. WHEN documenting scheduled rides THEN the system SHALL describe instant, scheduled single, and recurring ride options

### Requirement 5

**User Story:** As a product manager, I want documentation of existing and new ride categories, so that I can plan the UI changes and feature rollout.

#### Acceptance Criteria

1. WHEN documenting existing categories THEN the system SHALL list Taxi, Courier, Errands, School Run, and Work Run with their features
2. WHEN documenting new categories THEN the system SHALL list Bulk, Car Hire, Refuse Movers, Gas Movers, House Movers, Haulage, and Other as planned features
3. WHEN describing UI changes THEN the system SHALL specify that bottom tabs become scrollable to accommodate all categories
4. WHEN documenting category features THEN the system SHALL describe unique characteristics and pricing for each category
5. WHEN marking new features THEN the system SHALL clearly label them as "NEW FEATURE - TO BE IMPLEMENTED"

### Requirement 6

**User Story:** As a product manager, I want documentation of the AI-powered audio booking feature, so that I can understand the planned user experience and implementation requirements.

#### Acceptance Criteria

1. WHEN documenting AI booking button THEN the system SHALL specify it is always visible on top with higher z-index
2. WHEN describing button position THEN the system SHALL specify it is centered just above bottom tabs with slight overlap
3. WHEN documenting AI interface THEN the system SHALL describe the chat interface with CTAs and quick action buttons
4. WHEN documenting AI flow THEN the system SHALL detail the complete booking interaction flow
5. WHEN marking the feature THEN the system SHALL clearly label it as "NEW FEATURE - TO BE IMPLEMENTED"

### Requirement 7

**User Story:** As a developer, I want documentation of corporate booking enhancements, so that I can implement bulk ride features and passenger management.

#### Acceptance Criteria

1. WHEN documenting bulk rides THEN the system SHALL describe scheduled bulk rides and passenger list management
2. WHEN documenting bulk options THEN the system SHALL detail single destination, multiple destinations with single pickup, and multiple pickups and drop-offs
3. WHEN documenting passenger management THEN the system SHALL describe selecting from saved lists, manual entry, dynamic addition, and CSV upload
4. WHEN documenting targeting THEN the system SHALL specify that corporate rides are mainly targeted towards operators
5. WHEN documenting visual indicators THEN the system SHALL specify that all rides display a badge showing "Corporate" or "Individual"

### Requirement 8

**User Story:** As a developer, I want documentation of the driver/operator rides feed, so that I can understand the current implementation and maintain it.

#### Acceptance Criteria

1. WHEN documenting rides feed THEN the system SHALL describe the existing implementation for both operators and drivers
2. WHEN documenting feed features THEN the system SHALL detail filtering, sorting, and real-time updates
3. WHEN documenting ride states THEN the system SHALL describe Available, My Bids, Active, and Completed states
4. WHEN documenting bidding system THEN the system SHALL detail the offer placement and acceptance process
5. WHEN referencing code THEN the system SHALL include actual code examples from the codebase

### Requirement 9

**User Story:** As a product manager, I want documentation of driver/operator UI enhancements, so that I can plan the new bottom tab navigation and features.

#### Acceptance Criteria

1. WHEN documenting new tabs THEN the system SHALL describe Rides, Performance, Share Profile, and Community tabs
2. WHEN documenting Performance tab THEN the system SHALL specify it includes metrics, earnings, and analytics as a new feature
3. WHEN documenting Share Profile tab THEN the system SHALL describe profile sharing functionality and post-ride prompts as a new feature
4. WHEN documenting Community tab THEN the system SHALL describe WhatsApp-style group chat with message labels as a new feature
5. WHEN documenting message labels THEN the system SHALL list Ride Offers, Alerts, Emergency, Police Roadblock, and Other

### Requirement 10

**User Story:** As a developer, I want documentation of all user processes, so that I can understand complete user journeys for each user type.

#### Acceptance Criteria

1. WHEN documenting authentication process THEN the system SHALL cover all user types with login, registration, and password recovery
2. WHEN documenting profile processes THEN the system SHALL include creation, update, and approval workflows with state diagrams
3. WHEN documenting ride processes THEN the system SHALL cover booking, acceptance, completion, and cancellation flows
4. WHEN documenting rating process THEN the system SHALL describe the rating and review system for all applicable user types
5. WHEN documenting referral process THEN the system SHALL describe the referral program mechanics

### Requirement 11

**User Story:** As a technical writer, I want documentation following a consistent style and format, so that all documentation is professional and easy to understand.

#### Acceptance Criteria

1. WHEN creating documentation THEN the system SHALL follow the format and depth of TAXICAB_RIDE_MANAGEMENT_ANALYSIS.md
2. WHEN including diagrams THEN the system SHALL use Mermaid for flowcharts and state diagrams
3. WHEN providing descriptions THEN the system SHALL be clear, detailed, and technically accurate
4. WHEN separating features THEN the system SHALL use distinct sections for "Current Implementation" and "Planned Features"
5. WHEN referencing code THEN the system SHALL include actual code examples with file paths and line numbers

### Requirement 12

**User Story:** As a passenger, I want to save drivers, rides, and addresses after ride completion, so that I can easily rebook with preferred drivers, repeat common trips, and quickly select frequently used locations.

#### Acceptance Criteria

1. WHEN a ride is completed THEN the system SHALL provide an option to save the driver as a favorite
2. WHEN a ride is completed THEN the system SHALL provide an option to save the trip as a template
3. WHEN using addresses THEN the system SHALL provide an option to save pickup and dropoff addresses as saved places
4. WHEN documenting driver saving THEN the system SHALL describe the workflow for saving and managing favorite drivers
5. WHEN documenting ride saving THEN the system SHALL describe the workflow for saving trip templates and using them for future bookings
6. WHEN documenting address saving THEN the system SHALL describe the workflow for saving places and selecting them during booking
7. WHEN documenting saved items THEN the system SHALL specify how saved drivers, trips, and addresses are displayed and accessed in the interface

### Requirement 13

**User Story:** As a driver or operator, I want to share my profile with passengers and corporates, so that I can build my customer base and receive direct bookings.

#### Acceptance Criteria

1. WHEN documenting profile sharing THEN the system SHALL describe the complete profile sharing workflow
2. WHEN a ride is completed THEN the system SHALL provide a prompt for the driver to share their profile
3. WHEN documenting shareable profiles THEN the system SHALL specify the format of shareable profile links or cards
4. WHEN documenting profile access THEN the system SHALL describe how passengers and corporates can view and save shared profiles
5. WHEN documenting direct bookings THEN the system SHALL specify how saved drivers can be selected during the booking process

### Requirement 14

**User Story:** As a project manager, I want all documentation organized in a /docs folder, so that it is easily accessible and maintainable.

#### Acceptance Criteria

1. WHEN creating documentation structure THEN the system SHALL create a /docs folder in the workspace root
2. WHEN organizing documents THEN the system SHALL create separate files for each major process or feature area
3. WHEN creating an index THEN the system SHALL provide a README.md with table of contents and navigation
4. WHEN naming files THEN the system SHALL use clear, descriptive names following kebab-case convention
5. WHEN structuring content THEN the system SHALL use consistent heading levels and section organization
