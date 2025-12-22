'use client';

import { useState, useEffect } from 'react';
import { Users, Loader2, AlertCircle, UserCheck, Clock, UserPlus, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

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
    rejected: Connection[];
  };
  counts: {
    total: number;
    accepted: number;
    pendingSent: number;
    pendingReceived: number;
    rejected: number;
  };
}

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'buddies' | 'pending' | 'sent'>('buddies');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/community/connections');
      
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (connectionId: number) => {
    try {
      setActionLoading(connectionId);
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

      await fetchConnections();
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection');
    } finally {
      setActionLoading(null);
    }
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
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection');
    } finally {
      setActionLoading(null);
    }
  };

  const renderConnectionCard = (connection: Connection, showActions: boolean = false) => {
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

          {showActions && (
            <div className="flex space-x-2">
              {connection.status === 'pending' && connection.direction === 'received' && (
                <button
                  onClick={() => handleAccept(connection.connectionId)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                </button>
              )}
              <button
                onClick={() => handleRemove(connection.connectionId)}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 size={48} className="animate-spin text-emerald-500" />
            <p className="text-lg">Loading connections...</p>
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
            <span>My Connections</span>
          </h1>
          <p className="mt-2 text-slate-400">
            Manage your study buddy connections
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">{data?.counts.accepted || 0}</p>
                <p className="text-sm text-slate-400">Connected Buddies</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{data?.counts.pendingReceived || 0}</p>
                <p className="text-sm text-slate-400">Pending Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <UserPlus className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{data?.counts.pendingSent || 0}</p>
                <p className="text-sm text-slate-400">Sent Requests</p>
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
            My Buddies ({data?.counts.accepted || 0})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Requests ({data?.counts.pendingReceived || 0})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sent'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Sent ({data?.counts.pendingSent || 0})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'buddies' && (
            <>
              {data?.categorized.accepted.length === 0 ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No connected buddies yet
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Start connecting with other learners!
                  </p>
                  <Link
                    href="/community"
                    className="inline-block bg-emerald-600 text-white py-2 px-6 rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Find Study Buddies
                  </Link>
                </div>
              ) : (
                data?.categorized.accepted.map(conn => renderConnectionCard(conn, true))
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {data?.categorized.pendingReceived.length === 0 ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No pending requests
                  </h3>
                  <p className="text-slate-400">
                    When someone sends you a connection request, it will appear here.
                  </p>
                </div>
              ) : (
                data?.categorized.pendingReceived.map(conn => renderConnectionCard(conn, true))
              )}
            </>
          )}

          {activeTab === 'sent' && (
            <>
              {data?.categorized.pendingSent.length === 0 ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                  <UserPlus className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No sent requests
                  </h3>
                  <p className="text-slate-400">
                    Connection requests you send will appear here.
                  </p>
                </div>
              ) : (
                data?.categorized.pendingSent.map(conn => renderConnectionCard(conn, true))
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

