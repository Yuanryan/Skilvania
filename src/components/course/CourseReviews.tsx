"use client";

import { useState, useEffect } from 'react';
import { Star, MessageSquare, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Rating {
  id: number;
  userId: number;
  username: string;
  rating: number;
  comment: string | null;
  reviewedAt: string;
}

interface RatingsData {
  ratings: Rating[];
  averageRating: number;
  totalRatings: number;
}

interface CourseReviewsProps {
  courseId: string;
}

export function CourseReviews({ courseId }: CourseReviewsProps) {
  const { data: session } = useSession();
  const [ratingsData, setRatingsData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRatings();
  }, [courseId]);

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/ratings`);
      if (response.ok) {
        const data = await response.json();
        setRatingsData(data);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setError('Please login to post a review');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ratingScore: rating,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      // 重新獲取評分數據
      await fetchRatings();
      
      // 重置表單
      setComment('');
      setRating(5);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onChange && onChange(star)}
            disabled={!interactive}
            className={`
              ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
              ${star <= rating ? 'text-amber-400' : 'text-slate-600'}
            `}
          >
            <Star size={16} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mt-10 p-6 bg-slate-950/50 rounded-xl border border-white/5">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      {/* 評分摘要 */}
      <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star size={20} className="text-amber-400" fill="currentColor" />
            Course Rating
          </h2>
          {ratingsData && (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">
                {ratingsData.averageRating.toFixed(1)}
              </span>
              <div className="flex flex-col">
                {renderStars(Math.round(ratingsData.averageRating))}
                <span className="text-xs text-slate-400 mt-1">
                  {ratingsData.totalRatings} reviews
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 發表評論按鈕 */}
        {session && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            {showForm ? 'Cancel' : 'Post Review'}
          </button>
        )}

        {/* 評論表單 */}
        {showForm && session && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rating
              </label>
              {renderStars(rating, true, setRating)}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Review Content (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Share your thoughts about this course..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Review
                </>
              )}
            </button>
          </form>
        )}

        {!session && (
          <p className="mt-4 text-sm text-slate-400">
            Please login to post a review
          </p>
        )}
      </div>

      {/* 評論列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">All Reviews</h3>
        
        {ratingsData && ratingsData.ratings.length > 0 ? (
          <div className="space-y-4">
            {ratingsData.ratings.map((rating) => (
              <div
                key={rating.id}
                className="bg-slate-950/50 rounded-xl p-5 border border-white/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-bold">
                      {rating.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{rating.username}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(rating.reviewedAt)}
                      </p>
                    </div>
                  </div>
                  {renderStars(rating.rating)}
                </div>
                
                {rating.comment && (
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {rating.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-950/50 rounded-xl p-8 border border-white/5 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-slate-400">No reviews yet</p>
            <p className="text-sm text-slate-500 mt-1">Be the first to review this course!</p>
          </div>
        )}
      </div>
    </div>
  );
}

