/**
 * useRideNotifications Hook
 * 
 * Manages real-time notifications for ride status updates.
 * Subscribes to the notifications table and displays toast notifications.
 */

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';

export default function useRideNotifications(userId) {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousNotificationIds = useRef(new Set());

  useEffect(() => {
    if (!userId) return;

    // Load initial notifications
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read_at).length || 0);
        
        // Track existing notification IDs
        data?.forEach(n => previousNotificationIds.current.add(n.id));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel(`ride-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new;
          
          // Only show toast for truly new notifications
          if (!previousNotificationIds.current.has(newNotification.id)) {
            console.log('📬 New notification received:', newNotification);
            
            // Add to notifications list
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Track this notification
            previousNotificationIds.current.add(newNotification.id);
            
            // Show toast notification
            addToast({
              type: 'info',
              title: newNotification.title,
              message: newNotification.message,
              duration: 8000,
              onClick: () => {
                if (newNotification.action_url) {
                  window.location.href = newNotification.action_url;
                }
              }
            });

            // Play notification sound (optional)
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch (e) {}
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Notification subscription status:', status);
      });

    // Cleanup subscription
    return () => {
      console.log('📡 Cleaning up notification subscription');
      channel.unsubscribe();
    };
  }, [userId, addToast]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
