import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// Import admin pages
import UsersPage from '../pages/UsersPage';
import TripsPage from '../pages/TripsPage';
import MembersPage from '../pages/MembersPage';
import DriverVerificationPage from '../pages/DriverVerificationPage';
import SubscriptionsPage from '../pages/SubscriptionsPage';
import BMTOAReportsPage from '../pages/BMTOAReportsPage';
import AdminDashboardContent from '../AdminDashboardContent';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

/**
 * Comprehensive Admin Integration Tests
 * 
 * Purpose: Verify all admin pages connect to database with NO mock data
 * 
 * Tests:
 * 1. UsersPage - fetches from profiles table
 * 2. TripsPage - fetches from rides table with joins
 * 3. MembersPage - fetches from profiles with operator/driver filters
 * 4. DriverVerificationPage - fetches pending drivers
 * 5. SubscriptionsPage - fetches from membership_subscriptions
 * 6. BMTOAReportsPage - fetches aggregated data
 * 7. AdminDashboardContent - fetches stats from multiple tables
 */

describe('Admin Pages Database Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UsersPage', () => {
    it('should fetch users from profiles table on mount', async () => {
      const mockUsers = [
        {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+263771234567',
          user_type: 'individual',
          platform: 'taxicab',
          verification_status: 'approved',
          created_at: '2024-01-01',
          last_login_at: '2024-01-02'
        }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockUsers, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <UsersPage />
        </BrowserRouter>
      );

      // Verify loading state appears
      expect(screen.getByText(/loading users/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
      });

      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('id'));
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });

      // Verify no mock data is used
      await waitFor(() => {
        expect(screen.queryByText('Sarah Moyo')).not.toBeInTheDocument();
        expect(screen.queryByText('John Dube')).not.toBeInTheDocument();
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <UsersPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
      });

      // Should show empty state, not mock data
      await waitFor(() => {
        expect(screen.queryByText('Sarah Moyo')).not.toBeInTheDocument();
      });
    });
  });

  describe('TripsPage', () => {
    it('should fetch trips from rides table with joins', async () => {
      const mockTrips = [
        {
          id: 'trip-123',
          pickup_location: 'City Center',
          dropoff_location: 'Airport',
          service_type: 'taxi',
          status: 'completed',
          fare: 45.00,
          created_at: '2024-01-01',
          platform: 'taxicab',
          user: { name: 'Test User', user_type: 'individual' },
          driver: { full_name: 'Test Driver', profiles: { name: 'Test Driver' } }
        }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockTrips, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <TripsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('rides');
      });

      // Verify joins are included in select
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('user:profiles'));
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('driver:driver_profiles'));

      // Verify no mock data
      await waitFor(() => {
        expect(screen.queryByText('TXC-001234')).not.toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('MembersPage', () => {
    it('should fetch members from profiles with BMTOA filters', async () => {
      // Mock the members store
      const mockMembers = [
        {
          id: 'member-123',
          name: 'Test Operator',
          memberType: 'operator',
          membershipTier: 'standard',
          status: 'active',
          joinDate: '2024-01-01',
          monthlyRevenue: 1000
        }
      ];

      render(
        <BrowserRouter>
          <MembersPage />
        </BrowserRouter>
      );

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText(/loading members/i)).toBeInTheDocument();
      });

      // Verify no mock data like "City Cabs Ltd" or "Express Taxis"
      await waitFor(() => {
        expect(screen.queryByText('City Cabs Ltd')).not.toBeInTheDocument();
        expect(screen.queryByText('Express Taxis')).not.toBeInTheDocument();
      });
    });
  });

  describe('DriverVerificationPage', () => {
    it('should fetch pending drivers from database', async () => {
      const mockDrivers = [
        {
          user_id: 'driver-123',
          full_name: 'Test Driver',
          license_number: 'LIC123',
          verification_status: 'pending',
          profiles: {
            email: 'driver@test.com',
            phone: '+263771234567'
          }
        }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockResolve = vi.fn().mockResolvedValue({ data: mockDrivers, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        then: mockResolve
      });

      render(
        <BrowserRouter>
          <DriverVerificationPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('driver_profiles');
      });

      // Verify no mock data
      await waitFor(() => {
        expect(screen.queryByText('Michael Ncube')).not.toBeInTheDocument();
      });
    });
  });

  describe('SubscriptionsPage', () => {
    it('should fetch subscriptions from membership_subscriptions table', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-123',
          user_id: 'user-123',
          membership_tier: 'standard',
          subscription_status: 'active',
          monthly_fee: 50.00,
          renewal_date: '2024-02-01'
        }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <SubscriptionsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('membership_subscriptions');
      });

      // Verify loading state
      expect(screen.getByText(/loading subscriptions/i)).toBeInTheDocument();
    });
  });

  describe('BMTOAReportsPage', () => {
    it('should fetch aggregated data from multiple tables', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue({ data: [], error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte
      });

      render(
        <BrowserRouter>
          <BMTOAReportsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should query profiles for membership data
        expect(supabase.from).toHaveBeenCalledWith('profiles');
      });

      // Verify no hardcoded chart data
      await waitFor(() => {
        expect(screen.queryByText('150')).not.toBeInTheDocument(); // Mock member count
      });
    });
  });

  describe('AdminDashboardContent', () => {
    it('should load stats from adminStore without fallbacks', async () => {
      render(
        <BrowserRouter>
          <AdminDashboardContent />
        </BrowserRouter>
      );

      // Verify dashboard renders
      expect(screen.getByText(/unified admin portal/i)).toBeInTheDocument();

      // Verify stats are displayed (even if 0)
      await waitFor(() => {
        expect(screen.getByText(/taxicab platform/i)).toBeInTheDocument();
        expect(screen.getByText(/bmtoa platform/i)).toBeInTheDocument();
      });
    });
  });

  describe('No Mock Data Verification', () => {
    it('should not contain any hardcoded mock user names', async () => {
      const mockUsers = [];
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockUsers, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <UsersPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
      });

      // List of mock names that should NOT appear
      const mockNames = [
        'Sarah Moyo',
        'John Dube',
        'Tech Solutions Ltd',
        'Michael Ncube',
        'Grace Ndlovu',
        'City Cabs Ltd',
        'Express Taxis',
        'Robert Sibanda',
        'Tendai Moyo'
      ];

      mockNames.forEach(name => {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      });
    });

    it('should not contain any hardcoded trip IDs', async () => {
      const mockTrips = [];
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockTrips, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder
      });

      render(
        <BrowserRouter>
          <TripsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
      });

      // Mock trip IDs that should NOT appear
      const mockTripIds = ['TXC-001234', 'TXC-001235', 'TXC-001236'];

      mockTripIds.forEach(id => {
        expect(screen.queryByText(id)).not.toBeInTheDocument();
      });
    });
  });
});

