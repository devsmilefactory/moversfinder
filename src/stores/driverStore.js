import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { convertDriverProfileData } from '../lib/typeConversion';

import { computeDriverCompletion } from '../utils/driverCompletion';

/**
 * Driver Store - Manages all driver-related data and operations
 *
 * Supabase Tables Used:
 * - profiles: User profile data
 * - driver_profiles: Driver-specific data
 * - rides: Ride bookings and history
 * - documents: Driver documents
 * - payments: Earnings and payouts
 * - support_tickets: Support requests
 * - notifications: Driver notifications
 */

// Map UI document type IDs to DB-allowed values
const UI_TO_DB_DOCUMENT_TYPES = {
  drivers_license: 'drivers_license',
  psv_license: 'psv_permit',
  vehicle_registration: 'vehicle_registration',
  insurance: 'insurance_certificate',
  roadworthy: 'fitness_certificate',
  police_clearance: 'police_clearance',
  medical_certificate: 'medical_certificate',
};

const DB_TO_UI_DOCUMENT_TYPES = Object.fromEntries(
  Object.entries(UI_TO_DB_DOCUMENT_TYPES).map(([ui, db]) => [db, ui])
);

const normalizeDocTypeToUI = (docType) => DB_TO_UI_DOCUMENT_TYPES[docType] || docType;
const normalizeDocumentsToUI = (docs) =>
  (docs || []).map((doc) => ({ ...doc, document_type: normalizeDocTypeToUI(doc.document_type) }));

const useDriverStore = create(
  devtools(
    (set, get) => ({
      // State
      driverProfile: null,
      stats: null,
      activeRequests: [],
      earnings: null,
      rides: [],
      payouts: [],
      documents: [],
      performance: null,
      schedule: null,
      supportTickets: [],
      loading: false,
      error: null,

      batchUploading: false,

      // Dashboard Data - Loads all data needed for main dashboard
      loadDashboardData: async (userId) => {
        set({ loading: true, error: null });
        try {
          // Fetch driver profile; create if missing to avoid 406 (PGRST116)
          const { data: maybeProfile, error: profileError } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (profileError) throw profileError;

          let driverProfileRow = maybeProfile;
          if (!driverProfileRow) {
            const { data: created, error: createError } = await supabase
              .from('driver_profiles')
              .insert({
                user_id: userId,
                profile_status: 'in_progress',
                profile_completion_status: 'incomplete',
                approval_status: 'pending',
                account_status: 'active',
                completion_percentage: 0,
                platform: 'taxicab'
              })
              .select()
              .single();
            if (createError) throw createError;
            driverProfileRow = created;
          }



          // Fetch user profile separately
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (userProfileError) throw userProfileError;

          // Fetch today's stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: todayRides, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', userId)
            .eq('ride_status', 'trip_completed')
            .gte('created_at', today.toISOString());

          if (ridesError) throw ridesError;

          // Calculate stats
          const todayEarnings = todayRides?.reduce((sum, ride) => sum + (parseFloat(ride.fare) || 0), 0) || 0;
          const todayTrips = todayRides?.length || 0;
          const todayDistance = todayRides?.reduce((sum, ride) => sum + (parseFloat(ride.distance) || 0), 0) || 0;

          // Fetch active ride requests (pending rides assigned to this driver)
          const { data: requests, error: requestsError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', userId)
            .eq('ride_status', 'pending')
            .order('created_at', { ascending: false });

          if (requestsError) throw requestsError;

          // Fetch customer names for requests
          const requestsWithCustomers = await Promise.all(
            (requests || []).map(async (request) => {
              const { data: customer } = await supabase
                .from('profiles')
                .select('name, phone')
                .eq('id', request.user_id)
                .single();
              return { ...request, customer_name: customer?.name, customer_phone: customer?.phone };
            })
          );

          // Fetch driver documents
          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId);

          if (docsError) throw docsError;

          // Normalize documents to UI types before calculating completion
          const normalizedDocs = normalizeDocumentsToUI(docs);

          // Recalculate completion percentage and sync to DB if stale
          const calculatedCompletion = computeDriverCompletion(driverProfileRow, normalizedDocs || []);
          const dbCompletion = driverProfileRow.completion_percentage || 0;

          console.log('[loadDashboardData] Completion check:', {
            calculated: calculatedCompletion,
            db: dbCompletion,
            willSync: calculatedCompletion !== dbCompletion,
            profile: {
              full_name: driverProfileRow.full_name,
              profile_photo: !!driverProfileRow.profile_photo,
              vehicle_photo: !!driverProfileRow.vehicle_photo,
              license_document: !!driverProfileRow.license_document
            },
            docsCount: docs?.length || 0,
            normalizedDocsTypes: normalizedDocs?.map(d => d.document_type) || []
          });

          // If calculated value differs from DB, update DB (handles logic changes)
          if (calculatedCompletion !== dbCompletion) {
            console.log(`[loadDashboardData] Syncing completion: DB=${dbCompletion}%, Calculated=${calculatedCompletion}%`);
            const { error: syncError } = await supabase
              .from('driver_profiles')
              .update({
                completion_percentage: calculatedCompletion,
                profile_completion_status: calculatedCompletion === 100 ? 'complete' : 'incomplete',
                completed_at: calculatedCompletion === 100 && !driverProfileRow.completed_at
                  ? new Date().toISOString()
                  : driverProfileRow.completed_at
              })
              .eq('user_id', userId);

            if (syncError) {
              console.error('[loadDashboardData] Sync error:', syncError);
            } else {
              console.log('[loadDashboardData] Sync successful!');
            }

            // Update local state with new value
            driverProfileRow.completion_percentage = calculatedCompletion;
            driverProfileRow.profile_completion_status = calculatedCompletion === 100 ? 'complete' : 'incomplete';
          }

          set({
            driverProfile: {
              ...driverProfileRow,
              ...userProfile,
              documents: normalizeDocumentsToUI(docs)
            },
            stats: {
              todayEarnings,
              todayTrips,
              todayDistance,
              weekEarnings: 0, // TODO: Calculate week earnings
              monthEarnings: 0, // TODO: Calculate month earnings
              averageRating: 0, // TODO: Calculate from ride ratings
              onlineTime: '0h 0m', // TODO: Calculate from session data
            },
            activeRequests: requestsWithCustomers || [],
            loading: false,
          });
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Earnings - Load earnings data
      loadEarnings: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data: profile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!profile) {
            set({
              earnings: {
                today: 0,
                week: 0,
                month: 0,
                total: 0,
                available: 0,
                pending: 0,
              },
              loading: false,
            });
            return;
          }

          // Fetch all completed rides
          const { data: allRides, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', userId)
            .eq('ride_status', 'trip_completed')
            .order('created_at', { ascending: false });

          if (ridesError) throw ridesError;

          // Calculate earnings by period
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const todayEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= todayStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const weekEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= weekStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const monthEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= monthStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const totalEarnings = allRides?.reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          set({
            earnings: {
              today: todayEarnings,
              week: weekEarnings,
              month: monthEarnings,
              total: totalEarnings,
              available: totalEarnings, // TODO: Subtract paid out amounts
              pending: 0, // TODO: Calculate from pending rides
            },
            loading: false,
          });
        } catch (error) {
          console.error('Error loading earnings:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load Ride History
      loadRideHistory: async (userId, filters = {}) => {
        set({ loading: true, error: null });
        try {
          const { data: profile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!profile) {
            set({ rides: [], loading: false });
            return;
          }

          let query = supabase
            .from('rides')
            .select('*')
            .eq('driver_id', userId)
            .order('created_at', { ascending: false });

          if (filters.limit) {
            query = query.limit(filters.limit);
          }

          if (filters.status) {
            query = query.eq('ride_status', filters.status);
          }

          const { data, error } = await query;

          if (error) throw error;

          set({ rides: data || [], loading: false });
        } catch (error) {
          console.error('Error loading ride history:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load Payouts
      loadPayouts: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ payouts: data || [], loading: false });
        } catch (error) {
          console.error('Error loading payouts:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Request Payout
      requestPayout: async (amount, paymentMethod) => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('payments')
            .insert({
              user_id: user.id,
              amount,
              payment_method: paymentMethod,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload payouts
          await get().loadPayouts(user.id);

          set({ loading: false });
          return data;
        } catch (error) {
          console.error('Error requesting payout:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Accept Ride Request
      acceptRideRequest: async (rideId) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('rides')
            .update({
              status: 'accepted',
              driver_status: 'accepted'
            })
            .eq('id', rideId);

          if (error) throw error;

          // Remove from active requests
          set(state => ({
            activeRequests: state.activeRequests.filter(r => r.id !== rideId),
            loading: false,
          }));
        } catch (error) {
          console.error('Error accepting ride:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Decline Ride Request
      declineRideRequest: async (rideId) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('rides')
            .update({
              status: 'cancelled',
              driver_status: 'declined',
              cancelled_by: 'driver'
            })
            .eq('id', rideId);

          if (error) throw error;

          // Remove from active requests
          set(state => ({
            activeRequests: state.activeRequests.filter(r => r.id !== rideId),
            loading: false,
          }));
        } catch (error) {
          console.error('Error declining ride:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Update driver profile photo in state (optimized - no full reload)
      updateProfilePhoto: (photoType, photoUrl) => {
        const { driverProfile } = get();
        if (!driverProfile) return;

        const fieldMap = {
          profile: 'profile_photo',
          vehicle: 'vehicle_photo',
          license: 'license_document',
        };

        const field = fieldMap[photoType];
        if (field) {
          set({
            driverProfile: {
              ...driverProfile,
              [field]: photoUrl,
            },
          });
        }
      },

      // Load Documents
      loadDocuments: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ documents: normalizeDocumentsToUI(data) || [], loading: false });
        } catch (error) {
          console.error('Error loading documents:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Upload Document
      uploadDocument: async (userId, documentType, file, expiryDate = null, documentNumber = null, options = {}) => {
        if (!options?.suppressLoading) {
          set({ loading: true, error: null });
        } else {
          set({ error: null });
        }
        try {
          // Upload file to Supabase Storage (upload_photos bucket)
          const fileExt = file.name.split('.').pop();
          // Validate file type and size (server-side safeguard)
          const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
          const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
          if (!allowedExts.includes(fileExt.toLowerCase()) || (file.type && !allowedMimes.includes(file.type))) {
            throw new Error('Please upload a PDF, JPG, or PNG file');
          }
          if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must be less than 5MB');
          }
          // Map UI document type to DB-allowed value
          const dbDocumentType = UI_TO_DB_DOCUMENT_TYPES[documentType] || documentType;
          const fileName = `documents/${userId}/${documentType}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('upload_photos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('upload_photos')
            .getPublicUrl(fileName);

          // Save document record
          // Database columns: file_url (NOT document_url), expiry_date, document_number
          const { data, error } = await supabase
            .from('documents')
            .insert({
              user_id: userId,
              document_type: dbDocumentType,
              document_number: documentNumber || documentType, // Use documentType as fallback
              file_url: publicUrl, // FIXED: Use file_url instead of document_url
              expiry_date: expiryDate,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload documents to update UI (skip during batch for efficiency)
          if (!options?.skipReload) {
            await get().loadDocuments(userId);
          }

          if (!options?.suppressLoading) {
            set({ loading: false });
          }
          return data;
        } catch (error) {
          console.error('Error uploading document:', error);
          if (!options?.suppressLoading) {
            set({ error: error.message, loading: false });
          }
          throw error;
        }
      },

      // Load Support Tickets
      loadSupportTickets: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ supportTickets: data || [], loading: false });
        } catch (error) {
          console.error('Error loading support tickets:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Create Support Ticket
      createSupportTicket: async (userId, subject, category, priority, description) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .insert({
              user_id: userId,
              subject,
              category,
              priority,
              description,
              status: 'open',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload tickets
          await get().loadSupportTickets(userId);

          set({ loading: false });
          return data;
        } catch (error) {
          console.error('Error creating support ticket:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },


      // Batch upload multiple documents
      uploadDocumentsBatch: async (userId, items = [], { parallel = false } = {}) => {
        set({ batchUploading: true, error: null });
        const results = [];
        try {
          if (parallel) {
            const mapped = await Promise.all(
              items.map(async (it) => {
                try {
                  const data = await get().uploadDocument(
                    userId,
                    it.documentType,
                    it.file,
                    it.expiryDate ?? null,
                    it.documentNumber ?? null,
                    { suppressLoading: true, skipReload: true }
                  );
                  return { documentType: it.documentType, success: true, data };
                } catch (err) {
                  return { documentType: it.documentType, success: false, error: err?.message || String(err) };
                }
              })
            );
            results.push(...mapped);
          } else {
            for (const it of items) {
              try {
                const data = await get().uploadDocument(
                  userId,
                  it.documentType,
                  it.file,
                  it.expiryDate ?? null,
                  it.documentNumber ?? null,
                  { suppressLoading: true, skipReload: true }
                );
                results.push({ documentType: it.documentType, success: true, data });
              } catch (err) {
                results.push({ documentType: it.documentType, success: false, error: err?.message || String(err) });
              }
            }
          }
          // Single refresh at the end
          await get().loadDocuments(userId);
          return results;
        } finally {
          set({ batchUploading: false });
        }
      },

	      // Batch upload profile/license/vehicle photos and persist to driver_profiles
	      uploadPhotosBatch: async (userId, items = [], { parallel = true } = {}) => {
	        set({ loading: true, error: null });
	        const results = [];
	        try {
	          const fieldMap = { profile: 'profile_photo', vehicle: 'vehicle_photo', license: 'license_document' };
	          const prefixMap = { profile: 'profile_photos', vehicle: 'vehicle_photos', license: 'license_photos' };

	          const uploadOne = async (it) => {
	            const { photoType, file } = it || {};
	            if (!userId) throw new Error('Missing user');
	            if (!file || !photoType) throw new Error('Invalid photo item');
	            const fileExt = (file.name || 'jpg').split('.').pop();
	            const fileName = `${userId}_${photoType}_${Date.now()}.${fileExt}`;
	            const filePath = `${prefixMap[photoType] || 'photos'}/${fileName}`;

	            const { error: uploadError } = await supabase.storage
	              .from('upload_photos')
	              .upload(filePath, file, { cacheControl: '3600', upsert: true });
	            if (uploadError) throw uploadError;

	            const { data: { publicUrl } } = supabase.storage
	              .from('upload_photos')
	              .getPublicUrl(filePath);

	            const updateField = fieldMap[photoType];
	            const { error: updateError } = await supabase
	              .from('driver_profiles')
	              .update({ [updateField]: publicUrl })
	              .eq('user_id', userId);
	            if (updateError) throw updateError;

	            const current = get().driverProfile;
	            if (current) {
	              set({ driverProfile: { ...current, [updateField]: publicUrl } });
	            }

	            return { photoType, url: publicUrl };
	          };

	          if (parallel) {
	            const mapped = await Promise.all(
	              items.map(async (it) => {
	                try {
	                  const data = await uploadOne(it);
	                  return { photoType: it.photoType, success: true, data };
	                } catch (err) {
	                  return { photoType: it.photoType, success: false, error: err?.message || String(err) };
	                }
	              })
	            );
	            results.push(...mapped);
	          } else {
	            for (const it of items) {
	              try {
	                const data = await uploadOne(it);
	                results.push({ photoType: it.photoType, success: true, data });
	              } catch (err) {
	                results.push({ photoType: it.photoType, success: false, error: err?.message || String(err) });
	              }
	            }
	          }

	          set({ loading: false });
	          return results;
	        } catch (error) {
	          console.error('Error uploading photos batch:', error);
	          set({ error: error.message, loading: false });
	          throw error;
	        }
	      },


      // Update Driver Profile
      updateDriverProfile: async (userId, profileData) => {
        set({ loading: true, error: null });
        try {
          // Filter profileData to only include fields that exist in driver_profiles table
          // This prevents errors when trying to update non-existent columns
          // Use type conversion utility to safely convert all fields
          const filteredData = convertDriverProfileData(profileData);

          // Ensure driver profile row exists, then update
          const { data: existing, error: existingErr } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingErr) throw existingErr;

          let driverProfile;
          if (existing) {
            const { data, error } = await supabase
              .from('driver_profiles')
              .update(filteredData)
              .eq('user_id', userId)
              .select()
              .single();
            if (error) throw error;
            driverProfile = data;
          } else {
            const insertData = {
              user_id: userId,
              ...filteredData,
              profile_status: 'in_progress',
              profile_completion_status: 'incomplete',
              approval_status: 'pending',
              account_status: 'active',
              completion_percentage: 0,
              platform: 'taxicab'
            };
            const { data, error } = await supabase
              .from('driver_profiles')
              .insert(insertData)
              .select()
              .single();
            if (error) throw error;
            driverProfile = data;
          }

          // Fetch documents to check completion (presence-based)
          const { data: userDocuments } = await supabase
            .from('documents')
            .select('document_type, file_url')
            .eq('user_id', userId);

          // Calculate profile completion (presence-based, DRY via shared util)
          const completionPercentage = computeDriverCompletion(driverProfile, userDocuments);

          // Update driver_profiles table with completion percentage
          const { error: driverProfileError } = await supabase
            .from('driver_profiles')
            .update({
              completion_percentage: completionPercentage,
              profile_completion_status: completionPercentage === 100 ? 'complete' : 'incomplete',
              completed_at: completionPercentage === 100 ? new Date().toISOString() : null
            })
            .eq('user_id', userId);

          if (driverProfileError) throw driverProfileError;


          // Reload dashboard data
          await get().loadDashboardData(userId);

          set({ loading: false });
          return driverProfile;
        } catch (error) {
          console.error('Error updating driver profile:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      // Submit Driver Profile for Approval
      submitDriverProfileForApproval: async (userId) => {
        set({ loading: true, error: null });
        try {
          // Ensure profile exists
          const { data: profileRow, error: profileErr } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (profileErr) throw profileErr;
          if (!profileRow) throw new Error('Driver profile not found');

          // Fetch documents and compute completion
          const { data: userDocuments } = await supabase
            .from('documents')
            .select('document_type, file_url')
            .eq('user_id', userId);

          const completionPercentage = computeDriverCompletion(profileRow, userDocuments);
          if (completionPercentage < 100) {
            throw new Error('Profile is not complete. Please complete all required fields and uploads before submitting.');
          }

          const { error: updErr } = await supabase
            .from('driver_profiles')
            .update({
              approval_status: 'pending',
              profile_completion_status: 'complete',
              completion_percentage: 100,
              submitted_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          if (updErr) throw updErr;

          // Reload dashboard data
          await get().loadDashboardData(userId);

          set({ loading: false });
          return true;
        } catch (error) {
          console.error('Error submitting driver profile for approval:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Recalculate and sync completion percentage for a user
      // Useful for fixing stale values or after logic changes
      recalculateCompletion: async (userId) => {
        try {
          // Fetch current profile and documents
          const { data: profile, error: profileError } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (profileError) throw profileError;
          if (!profile) throw new Error('Driver profile not found');

          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('document_type, file_url')
            .eq('user_id', userId);

          if (docsError) throw docsError;

          // Normalize documents to UI types before calculating completion
          const normalizedDocs = normalizeDocumentsToUI(docs);

          // Calculate completion using current logic
          const calculatedCompletion = computeDriverCompletion(profile, normalizedDocs || []);

          // Update database
          const { error: updateError } = await supabase
            .from('driver_profiles')
            .update({
              completion_percentage: calculatedCompletion,
              profile_completion_status: calculatedCompletion === 100 ? 'complete' : 'incomplete',
              completed_at: calculatedCompletion === 100 && !profile.completed_at
                ? new Date().toISOString()
                : profile.completed_at
            })
            .eq('user_id', userId);

          if (updateError) throw updateError;

          console.log(`Recalculated completion for user ${userId}: ${calculatedCompletion}%`);
          return calculatedCompletion;
        } catch (error) {
          console.error('Error recalculating completion:', error);
          throw error;
        }
      },

    }),
    { name: 'BMTOA Driver Store' }
  )
);

export default useDriverStore;

