import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGuidesByCategory, getFeaturedGuides, getAllGuides } from '../../services/guideService';

/**
 * Guide Category List Component
 * Displays guide articles filtered by category
 */
const GuideCategoryList = () => {
  const [guides, setGuides] = useState([]);
  const [featuredGuides, setFeaturedGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const { category } = useParams();

  useEffect(() => {
    loadGuides();
  }, [category]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      
      if (category) {
        // Load guides for specific category
        const data = await getGuidesByCategory(category);
        setGuides(data);
        setFeaturedGuides([]);
      } else {
        // Load all guides and featured guides for home page
        const [allData, featuredData] = await Promise.all([
          getAllGuides(),
          getFeaturedGuides()
        ]);
        setGuides(allData);
        setFeaturedGuides(featuredData);
      }
    } catch (error) {
      console.error('Error loading guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => {
    const categories = {
      'getting-started': { name: 'Getting Started', icon: '🚀', color: 'blue' },
      'booking': { name: 'Booking & Rides', icon: '🚕', color: 'yellow' },
      'payments': { name: 'Payments & Billing', icon: '💳', color: 'green' },
      'account': { name: 'Account Management', icon: '👤', color: 'purple' },
      'troubleshooting': { name: 'Troubleshooting', icon: '🔧', color: 'red' }
    };
    return categories[categoryId] || { name: categoryId, icon: '📄', color: 'slate' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading guides...</p>
        </div>
      </div>
    );
  }

  const categoryInfo = category ? getCategoryInfo(category) : null;

  return (
    <div className="space-y-8">
      {/* Category Header */}
      {categoryInfo && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{categoryInfo.icon}</span>
            <h1 className="text-3xl font-bold text-slate-700">{categoryInfo.name}</h1>
          </div>
          <p className="text-slate-600">
            Browse all guides in this category
          </p>
        </div>
      )}

      {/* Featured Guides (Home page only) */}
      {!category && featuredGuides.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-700 mb-6">⭐ Featured Guides</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {featuredGuides.map(guide => {
              const catInfo = getCategoryInfo(guide.category);
              return (
                <Link
                  key={guide.id}
                  to={`/user-guide/article/${guide.slug}`}
                  className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{catInfo.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-700 mb-1">{guide.title}</h3>
                      <p className="text-sm text-slate-500">{catInfo.name}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* All Guides */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-700 mb-6">
          {category ? 'All Guides' : '📚 All Help Articles'}
        </h2>

        {guides.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No guides found in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {guides.map(guide => {
              const catInfo = getCategoryInfo(guide.category);
              return (
                <Link
                  key={guide.id}
                  to={`/user-guide/article/${guide.slug}`}
                  className="block p-6 border border-slate-200 rounded-lg hover:border-yellow-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{catInfo.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        {guide.title}
                      </h3>
                      {!category && (
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full mb-2">
                          {catInfo.name}
                        </span>
                      )}
                      {guide.tags && guide.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {guide.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuideCategoryList;
