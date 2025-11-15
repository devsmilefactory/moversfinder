import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // User types for BMTOA and TaxiCab platforms
  const USER_TYPES = {
    ADMIN: 'admin',
    DRIVER: 'driver',
    TAXI_OPERATOR: 'taxi_operator',
    INDIVIDUAL: 'individual',
    CORPORATE: 'corporate'
  };

  // Dashboard URLs based on user type
  const DASHBOARD_URLS = {
    [USER_TYPES.ADMIN]: '/admin/dashboard',
    [USER_TYPES.DRIVER]: '/driver/dashboard',
    [USER_TYPES.TAXI_OPERATOR]: '/operator/dashboard',
    [USER_TYPES.INDIVIDUAL]: '/user/dashboard',
    [USER_TYPES.CORPORATE]: '/corporate/dashboard'
  };

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock user data - replace with actual API response
      const userData = {
        id: Date.now(),
        email: credentials.email,
        name: credentials.name || 'User',
        userType: credentials.userType || USER_TYPES.DRIVER,
        platform: credentials.platform || 'bmtoa', // 'bmtoa' or 'taxicab'
        createdAt: new Date().toISOString()
      };

      const token = `mock_token_${Date.now()}`;
      
      // Store in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registrationData) => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock user creation - replace with actual API response
      const userData = {
        id: Date.now(),
        email: registrationData.email,
        name: registrationData.name,
        phone: registrationData.phone,
        userType: registrationData.userType,
        platform: registrationData.platform || 'bmtoa',
        createdAt: new Date().toISOString()
      };

      const token = `mock_token_${Date.now()}`;
      
      // Store in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setIsAuthenticated(false);
  };

  const redirectToDashboard = (userType) => {
    const dashboardUrl = DASHBOARD_URLS[userType];
    if (dashboardUrl) {
      // In a real app, you'd use React Router or Next.js router
      window.location.href = dashboardUrl;
    } else {
      console.error('Unknown user type:', userType);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    USER_TYPES,
    DASHBOARD_URLS,
    login,
    register,
    logout,
    redirectToDashboard
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
