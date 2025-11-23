# Movers Finder Platform Documentation

**Version:** 1.0  
**Last Updated:** November 22, 2025  
**Platform:** Movers Finder (formerly TaxiCab)

---

## Table of Contents

### 1. [Executive Summary](executive-summary.md)
High-level platform overview, key features, user types, and technology stack.

### 2. Architecture
- [System Architecture](architecture/system-architecture.md)
- [Database Schema](architecture/database-schema.md)
- [API Endpoints](architecture/api-endpoints.md)
- [Technology Stack](architecture/technology-stack.md)

### 3. Authentication
- [Overview](authentication/overview.md)
- [Individual Authentication](authentication/individual-auth.md)
- [Corporate Authentication](authentication/corporate-auth.md)
- [Driver Authentication](authentication/driver-auth.md)
- [Operator Authentication](authentication/operator-auth.md)
- [Admin Authentication](authentication/admin-auth.md)

### 4. Profile Management
- [Profile States](profiles/profile-states.md)
- [Individual Profiles](profiles/individual-profiles.md)
- [Corporate Profiles](profiles/corporate-profiles.md)
- [Driver Profiles](profiles/driver-profiles.md)
- [Operator Profiles](profiles/operator-profiles.md)
- [Approval Workflows](profiles/approval-workflows.md)

### 5. Ride Management
- [Booking Process](ride-management/booking-process.md)
- [Ride Categories](ride-management/ride-categories.md)
- [Pricing Calculation](ride-management/pricing-calculation.md)
- [Bidding System](ride-management/bidding-system.md)
- [Ride Lifecycle](ride-management/ride-lifecycle.md)
- [Scheduled Rides](ride-management/scheduled-rides.md)
- [Bulk Rides](ride-management/bulk-rides.md)

### 6. Features
- [AI-Powered Booking](features/ai-booking.md) *(NEW - To Be Implemented)*
- [Profile Sharing](features/profile-sharing.md) *(NEW - To Be Implemented)*
- [Saved Items](features/saved-items.md)
- [Payment Methods](features/payment-methods.md)
- [Driver Performance](features/driver-performance.md) *(NEW - To Be Implemented)*
- [Community Chat](features/community-chat.md) *(NEW - To Be Implemented)*

### 7. User Journeys
- [Individual Journey](user-journeys/individual-journey.md)
- [Corporate Journey](user-journeys/corporate-journey.md)
- [Driver Journey](user-journeys/driver-journey.md)
- [Operator Journey](user-journeys/operator-journey.md)

### 8. Processes
- [Ride Completion](processes/ride-completion.md)
- [Cancellation](processes/cancellation.md)
- [Rating & Review](processes/rating-review.md)
- [Referral Program](processes/referral-program.md)

### 9. UI Specifications
- [Passenger Interface](ui-specifications/passenger-interface.md)
- [Driver Interface](ui-specifications/driver-interface.md)
- [Operator Interface](ui-specifications/operator-interface.md)
- [Admin Interface](ui-specifications/admin-interface.md)

---

## Quick Links

### For Developers
- [Database Schema Reference](architecture/database-schema.md)
- [API Reference](architecture/api-endpoints.md)
- [Authentication Flows](authentication/overview.md)

### For Product Managers
- [Executive Summary](executive-summary.md)
- [User Journeys](user-journeys/)
- [Feature Specifications](features/)

### For Designers
- [UI Specifications](ui-specifications/)
- [User Journeys](user-journeys/)

### For QA/Testing
- [Ride Lifecycle](ride-management/ride-lifecycle.md)
- [Profile States](profiles/profile-states.md)
- [Process Flows](processes/)

---

## Documentation Standards

### Diagrams
All diagrams use Mermaid syntax for consistency and version control compatibility.

### Code Examples
Code examples include:
- File paths relative to workspace root
- Line numbers where applicable
- Language-specific syntax highlighting

### Status Indicators
- ✅ **Current Implementation**: Features that exist in the codebase
- 🚧 **In Progress**: Features being developed
- 📋 **Planned**: Features specified but not yet implemented
- ⚠️ **Deprecated**: Features being phased out

### Version History
Major documentation updates are tracked in each file's header.

---

## Contributing to Documentation

### When to Update
- After implementing new features
- When fixing bugs that affect documented behavior
- When changing database schema
- When modifying user flows

### How to Update
1. Locate the relevant documentation file
2. Update content to match implementation
3. Update diagrams if affected
4. Update version number and date
5. Test all Mermaid diagrams render correctly

---

## Support

For questions about this documentation:
- Technical questions: Contact development team
- Process questions: Contact product team
- Access issues: Contact admin team

---

**Platform:** Movers Finder  
**Documentation Version:** 1.0  
**Platform Version:** Current  
**Last Review:** November 22, 2025
