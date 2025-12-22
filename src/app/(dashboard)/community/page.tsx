'use client';

import { useState, useEffect } from 'react';
import { Users, Settings, Loader2, AlertCircle, Search } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import BuddyCard from '@/components/community/BuddyCard';
import InterestSelector from '@/components/community/InterestSelector';

interface CommunityProfile {
  userID: number;
  bio: string | null;
  interests: string[];
  lookingForBuddy: boolean;
  lastActiveCourseID: number | null;
}

interface MatchedUser {
  userID: number;
  username: string;
  level: number;
  xp: number;
  bio: string | null;
  interests: string[];
  sharedCourses: Array<{
    courseId: number;
    courseTitle: string;
  }>;
  compatibilityScore: number;
}

interface ConnectionStatus {
  [userId: number]: {
    status: 'pending_sent' | 'pending_received' | 'connected';
    connectionId: number;
  };
}

export default function CommunityPage() {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingForBuddy, setLookingForBuddy] = useState(true);

  // Fetch user profile
  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch matches when profile is loaded
  useEffect(() => {
    if (profile) {
      fetchMatches();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setError(null);
      const response = await fetch('/api/community/profile');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data.profile);
      
      // Initialize form state
      setBio(data.profile.bio || '');
      setInterests(data.profile.interests || []);
      setLookingForBuddy(data.profile.lookingForBuddy);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load your community profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setIsLoadingMatches(true);
      const response = await fetch('/api/community/match');
      
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
      
      // Fetch connections to determine status
      await fetchConnections();
    } catch (err) {
      console.error('Error fetching matches:', err);
      // Don't set error here as it's not critical
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/community/connections');
      
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const statusMap: ConnectionStatus = {};
      
      data.connections.forEach((conn: any) => {
        let status: 'pending_sent' | 'pending_received' | 'connected' = 'connected';
        
        if (conn.status === 'pending') {
          status = conn.direction === 'sent' ? 'pending_sent' : 'pending_received';
        } else if (conn.status === 'accepted') {
          status = 'connected';
        }
        
        statusMap[conn.user.userID] = {
          status,
          connectionId: conn.connectionId
        };
      });
      
      setConnectionStatuses(statusMap);
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/community/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio,
          interests,
          lookingForBuddy,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setIsEditingProfile(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Refresh matches after profile update
      fetchMatches();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectionChange = () => {
    // Refresh connections after any connection change
    fetchConnections();
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 size={48} className="animate-spin text-emerald-500" />
            <p className="text-lg">Loading community...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Users className="w-8 h-8 text-emerald-500" />
            <span>Community</span>
          </h1>
          <p className="mt-2 text-slate-400">
            Connect with fellow learners and find your study buddies
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-300">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - My Profile */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">My Profile</h2>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  {/* Bio Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell others about yourself..."
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
                      rows={4}
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {bio.length}/200 characters
                    </p>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Interests
                    </label>
                    <InterestSelector
                      interests={interests}
                      onChange={setInterests}
                      placeholder="e.g., Web Development"
                    />
                  </div>

                  {/* Looking for Buddy Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      Looking for study buddies
                    </label>
                    <button
                      onClick={() => setLookingForBuddy(!lookingForBuddy)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        lookingForBuddy ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          lookingForBuddy ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        // Reset form state
                        setBio(profile?.bio || '');
                        setInterests(profile?.interests || []);
                        setLookingForBuddy(profile?.lookingForBuddy ?? true);
                      }}
                      className="flex-1 bg-slate-700 text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bio Display */}
                  {bio ? (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-1">Bio</h3>
                      <p className="text-sm text-slate-400">{bio}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      No bio yet. Click the settings icon to add one!
                    </p>
                  )}

                  {/* Interests Display */}
                  {interests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-2">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {interests.map((interest, index) => (
                          <span
                            key={index}
                            className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          lookingForBuddy ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-sm text-slate-400">
                        {lookingForBuddy ? 'Looking for buddies' : 'Not looking for buddies'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recommended Buddies */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Recommended Study Buddies
              </h2>
              <button
                onClick={fetchMatches}
                disabled={isLoadingMatches}
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-2 transition-colors"
              >
                <Search className={`w-5 h-5 ${isLoadingMatches ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingMatches ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No study buddies found
                </h3>
                <p className="text-slate-400">
                  Start a course to find other learners with similar interests!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match) => {
                  const connectionStatus = connectionStatuses[match.userID];
                  return (
                    <BuddyCard
                      key={match.userID}
                      {...match}
                      connectionStatus={connectionStatus?.status || 'none'}
                      connectionId={connectionStatus?.connectionId}
                      onConnectionChange={handleConnectionChange}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

