import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchGuides } from '../../services/guideService';

/**
 * Guide Search Component
 * Provides search functionality for user guides
 */
const GuideSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const data = await searchGuides(searchQuery);
      setResults(data);
      setSearched(true);
    } catch (error) {
      console.error('Error searching guides:', error);
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

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-4">🔍 Search Help Center</h1>
        <p className="text-slate-600 mb-6">
          Find answers to your questions by searching our help articles
        </p>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help articles..."
            className="w-full px-6 py-4 pr-12 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-lg"
            autoFocus
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
          <p className="text-sm text-slate-500 mt-2">
            Type at least 2 characters to search
          </p>
        )}
      </div>

      {/* Search Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-slate-600">Searching...</p>
          </div>
        </div>
      )}

      {!loading && searched && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-6">
            {results.length > 0
              ? `Found ${results.length} result${results.length !== 1 ? 's' : ''}`
              : 'No results found'}
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">
                No articles match your search query "{searchQuery}"
              </p>
              <p className="text-sm text-slate-500">
                Try different keywords or browse by category
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map(guide => {
                const categoryInfo = getCategoryInfo(guide.category);
                return (
                  <Link
                    key={guide.id}
                    to={`/user-guide/article/${guide.slug}`}
                    className="block p-6 border border-slate-200 rounded-lg hover:border-yellow-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{categoryInfo.icon}</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                          {highlightText(guide.title, searchQuery)}
                        </h3>
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full mb-2">
                          {categoryInfo.name}
                        </span>
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
      )}

      {/* Popular Searches */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Popular Topics</h2>
          <div className="flex flex-wrap gap-2">
            {['booking', 'payment', 'account', 'verification', 'driver', 'corporate', 'subscription'].map(topic => (
              <button
                key={topic}
                onClick={() => setSearchQuery(topic)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideSearch;
