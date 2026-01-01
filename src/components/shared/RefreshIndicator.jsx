/**
 * Refresh Indicator Component
 * 
 * Shows when new data is available in other tabs with a notification
 * and refresh button.
 */

import React, { useRef } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';

const RefreshIndicator = ({ 
  hasNewData, 
  affectedTabs = [], 
  onRefresh,
  className = ''
}) => {
  const { addToast } = useToast();
  const notifiedTabsRef = useRef(new Set());

  // Show toast notification when new data becomes available (only once per tab)
  React.useEffect(() => {
    if (hasNewData && affectedTabs.length > 0) {
      // Only notify for tabs we haven't notified about yet
      const newTabs = affectedTabs.filter(tab => !notifiedTabsRef.current.has(tab));
      
      if (newTabs.length > 0) {
        newTabs.forEach(tab => notifiedTabsRef.current.add(tab));
        const tabNames = newTabs.join(', ');
        addToast({
          type: 'info',
          title: 'New Updates Available',
          message: `New ride updates available in: ${tabNames}. Click refresh to load.`,
          duration: 5000
        });
      }
    }
  }, [hasNewData, affectedTabs, addToast]);
  
  // Clear notified tabs when indicator is dismissed
  React.useEffect(() => {
    if (!hasNewData) {
      notifiedTabsRef.current.clear();
    }
  }, [hasNewData]);

  if (!hasNewData) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-blue-900">
            New updates available
          </p>
          {affectedTabs.length > 0 && (
            <p className="text-xs text-blue-700">
              Updates in: {affectedTabs.join(', ')}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </Button>
    </div>
  );
};

export default RefreshIndicator;






