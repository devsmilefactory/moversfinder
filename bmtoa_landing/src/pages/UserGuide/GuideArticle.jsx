import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGuideBySlug } from '../../services/guideService';
import ReactMarkdown from 'react-markdown';

/**
 * Guide Article Component
 * Displays a single guide article with markdown rendering
 */
const GuideArticle = () => {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { slug } = useParams();

  useEffect(() => {
    loadGuide();
  }, [slug]);

  const loadGuide = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGuideBySlug(slug);
      setGuide(data);
    } catch (err) {
      console.error('Error loading guide:', err);
      setError('Guide not found');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => {
    const categories = {
      'getting-started': { name: 'Getting Started', icon: '🚀' },
      'booking': { name: 'Booking & Rides', icon: '🚕' },
      'payments': { name: 'Payments & Billing', icon: '💳' },
      'account': { name: 'Account Management', icon: '👤' },
      'troubleshooting': { name: 'Troubleshooting', icon: '🔧' }
    };
    return categories[categoryId] || { name: categoryId, icon: '📄' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <p className="text-xl text-slate-600 mb-4">😕 {error || 'Article not found'}</p>
          <Link
            to="/user-guide"
            className="text-yellow-600 hover:text-yellow-700 font-medium"
          >
            ← Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(guide.category);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link to="/user-guide" className="hover:text-slate-900">
          Help Center
        </Link>
        <span>›</span>
        <Link to={`/user-guide/${guide.category}`} className="hover:text-slate-900">
          {categoryInfo.name}
        </Link>
        <span>›</span>
        <span className="text-slate-900">{guide.title}</span>
      </div>

      {/* Article Content */}
      <article className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8 pb-8 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{categoryInfo.icon}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
              {categoryInfo.name}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">{guide.title}</h1>
          
          {/* Tags */}
          {guide.tags && guide.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guide.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Markdown Content */}
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-slate-800 mt-8 mb-4" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-slate-700 mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="text-slate-600 leading-relaxed mb-4" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 text-slate-600" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-600" {...props} />,
              li: ({ node, ...props }) => <li className="ml-4" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-slate-700" {...props} />,
              code: ({ node, inline, ...props }) =>
                inline ? (
                  <code className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-sm" {...props} />
                ) : (
                  <code className="block p-4 bg-slate-100 text-slate-800 rounded-lg text-sm overflow-x-auto" {...props} />
                ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-yellow-400 pl-4 italic text-slate-600 my-4" {...props} />
              ),
            }}
          >
            {guide.content}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Last updated: {new Date(guide.updated_at).toLocaleDateString()}
            </div>
            <div className="flex gap-4">
              <button className="text-sm text-slate-600 hover:text-slate-900">
                👍 Helpful
              </button>
              <button className="text-sm text-slate-600 hover:text-slate-900">
                👎 Not helpful
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Back to Category */}
      <div className="text-center">
        <Link
          to={`/user-guide/${guide.category}`}
          className="inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-700 font-medium"
        >
          ← Back to {categoryInfo.name}
        </Link>
      </div>
    </div>
  );
};

export default GuideArticle;
