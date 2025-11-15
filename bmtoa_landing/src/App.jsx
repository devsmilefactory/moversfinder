import React, { useEffect } from "react";
import Routes from "./Routes";
import useAuthStore from "./stores/authStore";

/**
 * BMTOA App Component
 *
 * Note: AuthModalV2 has been removed in favor of dedicated /sign-up and /sign-in pages
 * All authentication now flows through these dedicated pages for better UX
 *
 * ProfileCompletionModal has been removed - profile completion is now handled via:
 * - ProfileCompletionBanner in dashboards (guides users to profile edit pages)
 * - Existing profile edit pages in /driver/profile and /operator/profile
 * This avoids duplicate profile creation flows and provides better UX
 */
function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    // Initialize auth from Supabase session
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Routes />
    </>
  );
}

export default App;
