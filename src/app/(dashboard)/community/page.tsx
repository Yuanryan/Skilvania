'use client';

import { useState, useEffect } from 'react';
import { Users, Loader2, AlertCircle, UserCheck, Search, Globe, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import BuddyCard from '@/components/community/BuddyCard';
import Link from 'next/link';

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

interface Connection {
  connectionId: number;
  status: 'accepted' | 'pending' | 'rejected';
  direction: 'sent' | 'received';
  createdAt: string;
  updatedAt: string;
  user: {
    userID: number;
    username: string;
    level: number;
    xp: number;
  };
}

interface ConnectionsData {
  connections: Connection[];
  categorized: {
    accepted: Connection[];
    pendingSent: Connection[];
    pendingReceived: Connection[];
  };
  counts: {
    accepted: number;
    pendingSent: number;
    pendingReceived: number;
  };
}

interface ConnectionStatus {
  [userId: number]: {
    status: 'pending_sent' | 'pending_received' | 'connected';
    connectionId: number;
  };
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'buddies' | 'groups'>('buddies');
  const [connectionsData, setConnectionsData] = useState<ConnectionsData | null>(null);
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus>({});
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
    fetchMatches();
  }, []);

  const fetchConnections = async () => {
    try {
      setIsLoadingConnections(true);
      setError(null);
      const response = await fetch('/api/community/connections');
      
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const result = await response.json();
      setConnectionsData(result);
      
      // Build connection status map
      const statusMap: ConnectionStatus = {};
      result.connections.forEach((conn: Connection) => {
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
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoadingConnections(false);
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
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleConnectionChange = () => {
    fetchConnections();
    fetchMatches();
  };

  const handleRemove = async (connectionId: number) => {
    if (!confirm('Are you sure you want to remove this connection?')) {
      return;
    }

    try {
      setActionLoading(connectionId);
      const response = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to remove connection');
        return;
      }

      await fetchConnections();
      await fetchMatches();
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection');
    } finally {
      setActionLoading(null);
    }
  };

  const renderConnectedBuddy = (connection: Connection) => {
    const isLoading = actionLoading === connection.connectionId;

    return (
      <div
        key={connection.connectionId}
        className="bg-slate-900 rounded-xl border border-white/10 p-4 hover:border-emerald-500/30 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
              {connection.user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <Link
                href={`/profile/${connection.user.username}`}
                className="font-semibold text-lg text-white hover:text-emerald-400 transition-colors"
              >
                {connection.user.username}
              </Link>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span>Level {connection.user.level}</span>
                <span className="text-slate-600">•</span>
                <span>{connection.user.xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Link
              href={`/community/messages?userId=${connection.user.userID}`}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
            >
              Message
            </Link>
            <button
              onClick={() => handleRemove(connection.connectionId)}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingConnections || isLoadingMatches;

  if (isLoading) {
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

  // Filter out connected buddies from recommendations
  const connectedUserIds = new Set(connectionsData?.categorized.accepted.map(c => c.user.userID) || []);
  const recommendedBuddies = matches.filter(m => !connectedUserIds.has(m.userID));

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
            Connect with fellow learners and join study groups
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">{connectionsData?.counts.accepted || 0}</p>
                <p className="text-sm text-slate-400">Connected Buddies</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{recommendedBuddies.length}</p>
                <p className="text-sm text-slate-400">Recommended Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('buddies')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'buddies'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            My Buddies ({connectionsData?.counts.accepted || 0})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'groups'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Study Groups
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'buddies' && (
            <div className="space-y-8">
              {/* Connected Buddies */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Connected Buddies</span>
                </h2>
                
                {connectionsData?.categorized.accepted.length === 0 ? (
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      No connected buddies yet
                    </h3>
                    <p className="text-slate-400">
                      Connect with recommended users below to start your study network!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {connectionsData?.categorized.accepted.map(conn => renderConnectedBuddy(conn))}
                  </div>
                )}
              </div>

              {/* Recommended Study Buddies */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <Search className="w-5 h-5 text-blue-400" />
                    <span>Recommended Study Buddies</span>
                  </h2>
                  <button
                    onClick={() => {
                      fetchMatches();
                      fetchConnections();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-2 transition-colors text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                {recommendedBuddies.length === 0 ? (
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      No new recommendations
                    </h3>
                    <p className="text-slate-400">
                      {connectionsData?.counts.accepted === 0 
                        ? "Start a course to find study buddies!"
                        : "You've connected with all recommended users! Check back later for more."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendedBuddies.map((match) => {
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
          )}

          {activeTab === 'groups' && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
              <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Study Groups Coming Soon
              </h3>
              <p className="text-slate-400 mb-4">
                Join study groups to collaborate with multiple learners on the same course!
              </p>
              <div className="inline-block bg-blue-900/30 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-300">
                Feature in development
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
