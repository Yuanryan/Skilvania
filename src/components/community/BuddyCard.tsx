'use client';

import { useState } from 'react';
import { Users, BookOpen, Award, TrendingUp, Loader2, Check, X, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SharedCourse {
  courseId: number;
  courseTitle: string;
}

interface BuddyCardProps {
  userID: number;
  username: string;
  level: number;
  xp: number;
  bio: string | null;
  interests: string[];
  sharedCourses: SharedCourse[];
  compatibilityScore: number;
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  connectionId?: number;
  onConnectionChange?: () => void;
}

export default function BuddyCard({
  userID,
  username,
  level,
  xp,
  bio,
  interests,
  sharedCourses,
  compatibilityScore,
  connectionStatus = 'none',
  connectionId,
  onConnectionChange
}: BuddyCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localConnectionStatus, setLocalConnectionStatus] = useState(connectionStatus);
  const router = useRouter();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-900/30';
    if (score >= 60) return 'text-blue-400 bg-blue-900/30';
    if (score >= 40) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-slate-400 bg-slate-800';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Great Match';
    if (score >= 40) return 'Good Match';
    return 'Fair Match';
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/community/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverID: userID })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to send connection request');
        return;
      }

      setLocalConnectionStatus('pending_sent');
      onConnectionChange?.();
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connectionId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to accept connection');
        return;
      }

      setLocalConnectionStatus('connected');
      onConnectionChange?.();
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connectionId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to reject connection');
        return;
      }

      setLocalConnectionStatus('none');
      onConnectionChange?.();
    } catch (error) {
      console.error('Error rejecting connection:', error);
      alert('Failed to reject connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = () => {
    router.push(`/community/messages?userId=${userID}`);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/10 transition-all">
      {/* Header with Avatar and Basic Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">{username}</h3>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Award className="w-4 h-4" />
              <span>Level {level}</span>
              <span className="text-slate-600">•</span>
              <span>{xp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getScoreColor(compatibilityScore)}`}>
          {compatibilityScore}%
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {bio}
        </p>
      )}

      {/* Shared Courses */}
      {sharedCourses.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">
              {sharedCourses.length} Shared {sharedCourses.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sharedCourses.slice(0, 3).map((course) => (
              <span
                key={course.courseId}
                className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded"
              >
                {course.courseTitle}
              </span>
            ))}
            {sharedCourses.length > 3 && (
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                +{sharedCourses.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Interests</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.slice(0, 4).map((interest, index) => (
              <span
                key={index}
                className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded"
              >
                {interest}
              </span>
            ))}
            {interests.length > 4 && (
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                +{interests.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {localConnectionStatus === 'none' && (
        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleMessage}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
          </button>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
      )}

      {localConnectionStatus === 'pending_sent' && (
        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleMessage}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
          </button>
          <div className="flex-1 bg-slate-700 text-slate-300 py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4" />
            <span>Pending</span>
          </div>
        </div>
      )}

      {localConnectionStatus === 'pending_received' && (
        <div className="space-y-2 mt-4">
          <div className="flex space-x-2">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Accept</span>
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={handleMessage}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
          </button>
        </div>
      )}

      {localConnectionStatus === 'connected' && (
        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleMessage}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
          </button>
          <div className="flex-1 bg-emerald-900/30 text-emerald-400 py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Connected</span>
          </div>
        </div>
      )}
    </div>
  );
}

