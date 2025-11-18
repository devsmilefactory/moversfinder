import React, { useState, useEffect } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getCategories } from '../../services/guideService';

/**
 * User Guide Layout Component
 * Provides sidebar navigation and content area for user guides
 */
const UserGuideLayout = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { category } = useParams();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-slate-700">📚 Help Center</h1>
            </div>
            <Link
              to="/"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block w-64 flex-shrink-0`}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Categories</h2>
              
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <nav className="space-y-2">
                  <Link
                    to="/user-guide"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      !category
                        ? 'bg-yellow-50 text-yellow-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">🏠</span>
                    <span>All Guides</span>
                  </Link>
                  
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      to={`/user-guide/${cat.id}`}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                        category === cat.id
                          ? 'bg-yellow-50 text-yellow-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm">{cat.name}</div>
                        <div className="text-xs text-slate-400">{cat.count} guides</div>
                      </div>
                    </Link>
                  ))}
                </nav>
              )}

              {/* Search Link */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <Link
                  to="/user-guide/search"
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xl">🔍</span>
                  <span>Search Guides</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserGuideLayout;
