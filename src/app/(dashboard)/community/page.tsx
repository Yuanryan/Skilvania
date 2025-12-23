'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Loader2, AlertCircle, UserCheck, Search, Globe, Trash2, User as UserIcon, Edit2, Save, X as XIcon, Plus, MessageSquare, UserPlus, Lock, Bell, Check, X, Upload, Camera } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InterestSelector from '@/components/community/InterestSelector';

interface UserProfile {
  userID: number;
  username: string;
  email: string;
  level: number;
  xp: number;
  avatarUrl: string | null;
  bio: string | null;
  interests: string[];
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

interface StudyGroup {
  groupId: number;
  name: string;
  description: string | null;
  type: 'public' | 'private';
  tagId: number | null;
  tagName: string | null;
  creatorId: number;
  memberCount: number;
  isMember: boolean;
  userRole: 'admin' | 'member' | null;
  createdAt: string;
  updatedAt: string;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'buddies' | 'groups' | 'requests'>('buddies');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connectionsData, setConnectionsData] = useState<ConnectionsData | null>(null);
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [connectLoading, setConnectLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedInterests, setEditedInterests] = useState<string[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Study Groups states
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [privateGroups, setPrivateGroups] = useState<StudyGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchConnections();
    fetchMatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setError(null);
      const response = await fetch('/api/community/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      setUserProfile(result.profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

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

  const handleAcceptRequest = async (connectionId: number) => {
    try {
      setProcessingRequest(connectionId);
      const response = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to accept request');
        return;
      }

      await fetchConnections();
      await fetchMatches();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (connectionId: number) => {
    try {
      setProcessingRequest(connectionId);
      const response = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to reject request');
        return;
      }

      await fetchConnections();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const renderIncomingRequest = (connection: Connection, isLast: boolean) => {
    const isLoading = processingRequest === connection.connectionId;

    return (
      <div
        key={connection.connectionId}
        className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-white/10' : ''}`}
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
            {connection.user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link
              href={`/profile/${connection.user.username}`}
              className="font-semibold text-white hover:text-emerald-400 transition-colors"
            >
              {connection.user.username}
            </Link>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <span>Level {connection.user.level}</span>
              <span className="text-slate-600">•</span>
              <span>{connection.user.xp.toLocaleString()} XP</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sent {new Date(connection.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAcceptRequest(connection.connectionId)}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
            onClick={() => handleRejectRequest(connection.connectionId)}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
      </div>
    );
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

  const renderConnectedBuddy = (connection: Connection, isLast: boolean) => {
    const isLoading = actionLoading === connection.connectionId;

    return (
      <div
        key={connection.connectionId}
        className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-white/10' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
            {connection.user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link
              href={`/profile/${connection.user.username}`}
              className="font-semibold text-white hover:text-emerald-400 transition-colors"
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

        <div className="flex flex-col space-y-2">
          <Link
            href={`/community/messages?userId=${connection.user.userID}`}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm text-center"
          >
            Message
          </Link>
          <button
            onClick={() => handleRemove(connection.connectionId)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center space-x-1"
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
    );
  };

  const fetchGroups = async () => {
    try {
      setIsLoadingGroups(true);
      setError(null);
      const response = await fetch('/api/community/groups');
      
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setPublicGroups(data.publicGroups || []);
      setPrivateGroups(data.privateGroups || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load study groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      setIsCreatingGroup(true);
      const response = await fetch('/api/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create group');
        return;
      }

      const data = await response.json();
      
      // Close modal and reset form
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      
      // Navigate to the new group in messages
      router.push(`/community/messages?groupId=${data.group.groupId}`);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      setJoiningGroupId(groupId);
      const response = await fetch(`/api/community/groups/${groupId}/join`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to join group');
        return;
      }

      // Refresh groups to update membership status
      await fetchGroups();
      
      // Navigate to the group in messages
      router.push(`/community/messages?groupId=${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const startEditingProfile = () => {
    if (userProfile) {
      setEditedBio(userProfile.bio || '');
      setEditedInterests(userProfile.interests || []);
      setIsEditingProfile(true);
      setAvatarError(null);
    }
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditedBio('');
    setEditedInterests([]);
    setAvatarError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File too large. Maximum size is 2MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to upload avatar';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload avatar');
      }
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
      
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setAvatarError(errorMessage);
      console.error('Avatar upload error:', err);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove avatar');
      }

      // Update local state
      setUserProfile(prev => prev ? { ...prev, avatarUrl: null } : null);
      
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!userProfile) return;

    try {
      setIsSavingProfile(true);
      setError(null);

      const response = await fetch('/api/community/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: editedBio,
          interests: editedInterests
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      
      // Update local state with new profile data
      setUserProfile({
        ...userProfile,
        bio: result.profile.bio,
        interests: result.profile.interests
      });

      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnect = async (userId: number) => {
    try {
      setConnectLoading(userId);
      
      const response = await fetch('/api/community/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverID: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to send connection request');
        setConnectLoading(null);
        return;
      }

      const data = await response.json();

      // Update local state immediately without triggering full refresh
      setConnectionStatuses(prev => ({
        ...prev,
        [userId]: {
          status: 'pending_sent',
          connectionId: data.connection?.ConnectionID || 0
        }
      }));

      // Silently update connections count without full refresh
      if (connectionsData) {
        setConnectionsData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            counts: {
              ...prev.counts,
              pendingSent: prev.counts.pendingSent + 1
            }
          };
        });
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request');
    } finally {
      setConnectLoading(null);
    }
  };

  const renderRecommendedBuddy = (match: MatchedUser, isLast: boolean) => {
    const connectionStatus = connectionStatuses[match.userID];
    const status = connectionStatus?.status || 'none';
    
    return (
      <div
        key={match.userID}
        className={`py-4 ${!isLast ? 'border-b border-white/10' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
              {match.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Link
                  href={`/profile/${match.username}`}
                  className="font-semibold text-white hover:text-emerald-400 transition-colors"
                >
                  {match.username}
                </Link>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  match.compatibilityScore >= 80 ? 'bg-emerald-900/30 text-emerald-400' :
                  match.compatibilityScore >= 60 ? 'bg-blue-900/30 text-blue-400' :
                  match.compatibilityScore >= 40 ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {match.compatibilityScore}%
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
                <span>Level {match.level}</span>
                <span className="text-slate-600">•</span>
                <span>{match.xp.toLocaleString()} XP</span>
              </div>
              {match.bio && (
                <p className="text-sm text-slate-400 mb-2 line-clamp-1">{match.bio}</p>
              )}
              {match.sharedCourses.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {match.sharedCourses.slice(0, 2).map((course) => (
                    <span
                      key={course.courseId}
                      className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded"
                    >
                      {course.courseTitle}
                    </span>
                  ))}
                  {match.sharedCourses.length > 2 && (
                    <span className="text-xs text-slate-500">+{match.sharedCourses.length - 2} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="ml-4 flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/community/messages?userId=${match.userID}`}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm text-center"
              onClick={(e) => e.stopPropagation()}
            >
              Message
            </Link>
            {status === 'none' && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (connectLoading === match.userID) return;
                  await handleConnect(match.userID);
                }}
                disabled={connectLoading === match.userID}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center space-x-1 z-10 relative"
              >
                {connectLoading === match.userID ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect</span>
                )}
              </button>
            )}
            {status === 'pending_sent' && (
              <span className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm text-center">
                Pending
              </span>
            )}
            {status === 'connected' && (
              <span className="px-3 py-1.5 bg-emerald-900/30 text-emerald-400 rounded-lg text-sm text-center">
                Connected
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingProfile || isLoadingConnections || isLoadingMatches;

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
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* User Profile Card */}
        {userProfile && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-6 flex-1">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                    {userProfile.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : session?.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      userProfile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isEditingProfile && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload-community"
                        disabled={isUploadingAvatar}
                      />
                      <label
                        htmlFor="avatar-upload-community"
                        className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer border-2 border-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Upload avatar"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                      </label>
                      {userProfile.avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="absolute top-0 right-0 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center cursor-pointer border-2 border-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove avatar"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </>
                  )}
                  {avatarError && (
                    <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-400 text-center whitespace-nowrap">
                      {avatarError}
                    </p>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-bold text-white">{userProfile.username}</h2>
                    {!isEditingProfile && (
                      <button
                        onClick={startEditingProfile}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-emerald-400 font-semibold">Level {userProfile.level}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-blue-400 font-semibold">{userProfile.xp.toLocaleString()} XP</span>
                  </div>

                  {/* Bio Section */}
                  <div className="mb-4">
                    {isEditingProfile ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Bio</label>
                        <textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          placeholder="Tell the community about yourself..."
                          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                          rows={3}
                          maxLength={500}
                        />
                        <p className="text-xs text-slate-500">{editedBio.length}/500 characters</p>
                      </div>
                    ) : (
                      userProfile.bio ? (
                        <p className="text-slate-300">{userProfile.bio}</p>
                      ) : (
                        <p className="text-slate-500 italic">No bio yet. Click Edit Profile to add one!</p>
                      )
                    )}
                  </div>

                  {/* Interests Section */}
                  <div>
                    {isEditingProfile ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Interests</label>
                        <InterestSelector
                          interests={editedInterests}
                          onChange={setEditedInterests}
                          placeholder="Add an interest (e.g., Python, Web Dev)..."
                          maxInterests={10}
                        />
                      </div>
                    ) : (
                      userProfile.interests && userProfile.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {userProfile.interests.map((interest, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-sm"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-sm">No interests added yet.</p>
                      )
                    )}
                  </div>

                  {/* Edit Mode Actions */}
                  {isEditingProfile && (
                    <div className="flex items-center space-x-3 mt-4">
                      <button
                        onClick={saveProfile}
                        disabled={isSavingProfile}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelEditingProfile}
                        disabled={isSavingProfile}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              {!isEditingProfile && (
                <div className="flex gap-6 ml-6 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{connectionsData?.counts.accepted || 0}</p>
                    <p className="text-sm text-slate-400 mt-1">Buddies</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{recommendedBuddies.length}</p>
                    <p className="text-sm text-slate-400 mt-1">Matches</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 relative ${
              activeTab === 'requests'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Requests</span>
              {connectionsData?.counts.pendingReceived > 0 && (
                <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5">
                  {connectionsData.counts.pendingReceived}
                </span>
              )}
            </span>
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
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-emerald-400" />
                <span>Incoming Connection Requests</span>
              </h2>
              
              {connectionsData?.categorized.pendingReceived.length === 0 ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                  <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No pending requests
                  </h3>
                  <p className="text-slate-400">
                    You don't have any incoming connection requests at the moment.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/10 rounded-xl p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {connectionsData?.categorized.pendingReceived.map((conn, index) => 
                    renderIncomingRequest(conn, index === connectionsData.categorized.pendingReceived.length - 1)
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'buddies' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Left Column: Connected Buddies (2/3 width) */}
              <div className="lg:col-span-2 lg:pr-8 lg:border-r lg:border-white/10">
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
                      Connect with recommended users to start your study network!
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-white/10 rounded-xl p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {connectionsData?.categorized.accepted.map((conn, index) => 
                      renderConnectedBuddy(conn, index === connectionsData.categorized.accepted.length - 1)
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Recommended Study Buddies (1/3 width) */}
              <div className="lg:col-span-1 lg:pl-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <Search className="w-5 h-5 text-blue-400" />
                    <span>Recommended Buddies</span>
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
                  <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                    {recommendedBuddies.map((match, index) => 
                      renderRecommendedBuddy(match, index === recommendedBuddies.length - 1)
                    )}
              </div>
            )}
          </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <>
              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Public Groups */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        <span>Public Study Groups</span>
                      </h2>
                    </div>

                    {publicGroups.length === 0 ? (
                      <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                        <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          No Public Groups Yet
                        </h3>
                        <p className="text-slate-400">
                          Public groups will be created automatically for each course tag.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                        {publicGroups.map((group) => (
                          <div
                            key={group.groupId}
                            className="bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-lg font-semibold text-white">
                                    {group.name}
                                  </h3>
                                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded-full">
                                    Public
                                  </span>
                                </div>
                                {group.description && (
                                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                                    {group.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 text-xs text-slate-500">
                                  <span className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{group.memberCount} members</span>
                                  </span>
                                  {group.tagName && (
                                    <span className="text-emerald-400">
                                      #{group.tagName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                {group.isMember ? (
                                  <button
                                    onClick={() => router.push(`/community/messages?groupId=${group.groupId}`)}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm flex items-center space-x-1"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Open</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJoinGroup(group.groupId)}
                                    disabled={joiningGroupId === group.groupId}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-1"
                                  >
                                    {joiningGroupId === group.groupId ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Joining...</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="w-4 h-4" />
                                        <span>Join</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Private Groups */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                        <Lock className="w-5 h-5 text-emerald-400" />
                        <span>My Private Groups</span>
                      </h2>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create</span>
                      </button>
                    </div>

                    {privateGroups.length === 0 ? (
                      <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
                        <Lock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          No Private Groups
                        </h3>
                        <p className="text-slate-400 mb-4">
                          Create a private group to study with your friends!
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm inline-flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Your First Group</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                        {privateGroups.map((group) => (
                          <div
                            key={group.groupId}
                            className="bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-lg font-semibold text-white">
                                    {group.name}
                                  </h3>
                                  <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs rounded-full">
                                    Private
                                  </span>
                                  {group.userRole === 'admin' && (
                                    <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                {group.description && (
                                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                                    {group.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 text-xs text-slate-500">
                                  <span className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{group.memberCount} members</span>
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <button
                                  onClick={() => router.push(`/community/messages?groupId=${group.groupId}`)}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm flex items-center space-x-1"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Open</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Create Group Modal */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold text-white mb-4">Create Private Group</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Group Name *
                        </label>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="e.g., My Study Squad"
                          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
                          maxLength={100}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={newGroupDescription}
                          onChange={(e) => setNewGroupDescription(e.target.value)}
                          placeholder="What's this group about?"
                          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleCreateGroup}
                        disabled={isCreatingGroup || !newGroupName.trim()}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                      >
                        {isCreatingGroup ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Group</span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          setNewGroupName('');
                          setNewGroupDescription('');
                        }}
                        disabled={isCreatingGroup}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
