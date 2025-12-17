import useAuthStore from '../../stores/authStore';
import useNotifications from '../../hooks/useNotifications';

/**
 * RideStatusToasts
 *
 * Legacy placeholder that now simply mounts the unified notification hook.
 * All toast / browser / push notifications are handled centrally inside
 * useNotifications, so this component just ensures the hook is active at
 * the root of the application.
 */
const RideStatusToasts = () => {
  const { user } = useAuthStore();
  useNotifications(user?.id);
  return null;
};

export default RideStatusToasts;

