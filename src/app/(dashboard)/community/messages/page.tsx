'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { MessageCircle, Loader2, AlertCircle, Send, ArrowLeft, UserPlus, X, Users, LogOut } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useSearchParams } from 'next/navigation';

interface Conversation {
  type: 'dm' | 'group';
  id: number;
  name: string;
  avatarUrl?: string | null;
  groupType?: 'public' | 'private';
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
    isRead?: boolean;
    senderName?: string;
  } | null;
  unreadCount: number;
}

interface Message {
  messageId: number;
  content: string;
  isFromMe: boolean;
  isRead: boolean;
  createdAt: string;
}

interface ChatData {
  messages: Message[];
  otherUser: {
    userID: number;
    username: string;
    level: number;
    xp: number;
    avatarUrl?: string | null;
  } | null;
  hasMore: boolean;
  isConnected: boolean;
  remainingIntroMessages: number | null;
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');
  const initialGroupId = searchParams.get('groupId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<{ type: 'dm' | 'group'; id: number } | null>(
    initialUserId ? { type: 'dm', id: parseInt(initialUserId) } : 
    initialGroupId ? { type: 'group', id: parseInt(initialGroupId) } : null
  );
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [studyBuddies, setStudyBuddies] = useState<any[]>([]);
  const [isLoadingBuddies, setIsLoadingBuddies] = useState(false);
  const [addingMembers, setAddingMembers] = useState<number[]>([]);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabVisible(isVisible);
      
      // Refresh data when tab becomes visible
      if (isVisible) {
        fetchConversations();
        if (selectedConversation) {
          if (selectedConversation.type === 'dm') {
            fetchDMChat(selectedConversation.id, true);
          } else {
            fetchGroupChat(selectedConversation.id, true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new conversations only when tab is visible
    const interval = setInterval(() => {
      if (isTabVisible) {
        fetchConversations();
      }
    }, 10000); // Increased to 10 seconds
    
    return () => clearInterval(interval);
  }, [isTabVisible]);

  useEffect(() => {
    if (selectedConversation) {
      if (selectedConversation.type === 'dm') {
        fetchDMChat(selectedConversation.id);
        const interval = setInterval(() => {
          if (isTabVisible) {
            fetchDMChat(selectedConversation.id, true);
          }
        }, 5000); // Increased to 5 seconds
        return () => clearInterval(interval);
      } else {
        fetchGroupChat(selectedConversation.id);
        const interval = setInterval(() => {
          if (isTabVisible) {
            fetchGroupChat(selectedConversation.id, true);
          }
        }, 5000); // Increased to 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [selectedConversation, isTabVisible]);

  useEffect(() => {
    scrollToBottom();
  }, [chatData?.messages, groupMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/community/conversations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const newConversations = data.conversations || [];
      
      // Only update if conversations have changed
      setConversations(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newConversations)) {
          return prev; // Avoid re-render if nothing changed
        }
        return newConversations;
      });
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchDMChat = async (userId: number, silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingChat(true);
      setError(null);
      
      const response = await fetch(`/api/community/messages/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      // Only update if chat data has changed
      setChatData(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) {
          return prev; // Avoid re-render if nothing changed
        }
        return data;
      });
      
      setGroupMessages([]);
      setGroupInfo(null);
    } catch (err) {
      console.error('Error fetching chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (!silent) setIsLoadingChat(false);
    }
  };

  const fetchGroupChat = async (groupId: number, silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingChat(true);
      setError(null);
      
      // Fetch group messages
      const messagesRes = await fetch(`/api/community/groups/${groupId}/messages`);
      if (!messagesRes.ok) {
        throw new Error('Failed to fetch group messages');
      }
      const messagesData = await messagesRes.json();
      
      // Only fetch group info and members on initial load (not during silent polling)
      if (!silent) {
        // Fetch group info
        const groupRes = await fetch(`/api/community/groups/${groupId}`);
        if (!groupRes.ok) {
          throw new Error('Failed to fetch group info');
        }
        const groupData = await groupRes.json();
        setGroupInfo(groupData.group);
        
        // Fetch group members
        const membersRes = await fetch(`/api/community/groups/${groupId}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setGroupMembers(membersData.members || []);
        }
      }
      
      // Only update messages if they've changed
      const newMessages = messagesData.messages || [];
      setGroupMessages(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newMessages)) {
          return prev; // Avoid re-render if messages haven't changed
        }
        return newMessages;
      });
      
      setChatData(null);
      
      // Mark messages as read if there are any messages
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        // Always mark as read when viewing the chat
        try {
          await fetch(`/api/community/groups/${groupId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastReadMessageId: lastMessage.messageId })
          });
        } catch (error) {
          // Silently fail - don't block the chat loading
          console.error('Failed to mark messages as read:', error);
        }
      }
    } catch (err) {
      console.error('Error fetching group chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (!silent) setIsLoadingChat(false);
    }
  };

  const fetchStudyBuddies = async () => {
    try {
      setIsLoadingBuddies(true);
      const response = await fetch('/api/community/connections?status=accepted');
      
      if (!response.ok) {
        throw new Error('Failed to fetch study buddies');
      }

      const data = await response.json();
      // Get only accepted connections (study buddies)
      const buddies = data.categorized?.accepted || [];
      setStudyBuddies(buddies);
    } catch (err) {
      console.error('Error fetching study buddies:', err);
      alert('Failed to load study buddies');
    } finally {
      setIsLoadingBuddies(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;

    try {
      setAddingMembers(prev => [...prev, userId]);
      const response = await fetch(`/api/community/groups/${selectedConversation.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteUserId: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add member');
      }

      // Refresh group members and info
      await fetchGroupChat(selectedConversation.id, true);
      // Remove from study buddies list (they're now in the group)
      setStudyBuddies(prev => prev.filter(buddy => buddy.user.userID !== userId));
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setAddingMembers(prev => prev.filter(id => id !== userId));
    }
  };

  const openAddMembersModal = () => {
    setShowAddMembersModal(true);
    fetchStudyBuddies();
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;

    const confirmed = confirm(
      `Are you sure you want to leave "${groupInfo?.name}"? You will no longer receive messages from this group.`
    );

    if (!confirmed) return;

    try {
      setIsLeavingGroup(true);
      const response = await fetch(`/api/community/groups/${selectedConversation.id}/leave`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave group');
      }

      // Navigate back to messages list
      setSelectedConversation(null);
      await fetchConversations();
    } catch (error) {
      console.error('Error leaving group:', error);
      alert(error instanceof Error ? error.message : 'Failed to leave group');
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      setIsSending(true);
      
      if (selectedConversation.type === 'dm') {
        const response = await fetch('/api/community/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverID: selectedConversation.id,
            content
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }

        await fetchDMChat(selectedConversation.id, true);
      } else {
        const response = await fetch(`/api/community/groups/${selectedConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }

        await fetchGroupChat(selectedConversation.id, true);
      }
      
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
      setMessageInput(content); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full">
        <div className="h-[calc(100vh-80px)] flex">
          {/* Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-white/10 bg-slate-900/50`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
                <span>Messages</span>
              </h2>
            </div>

            <div className="overflow-y-auto h-[calc(100%-73px)] custom-scrollbar">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No messages yet</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Connect with buddies to start messaging
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConversation?.type === conv.type && selectedConversation?.id === conv.id;
                  return (
                    <button
                      key={`${conv.type}-${conv.id}`}
                      onClick={() => setSelectedConversation({ type: conv.type, id: conv.id })}
                      className={`w-full p-4 border-b border-white/5 hover:bg-slate-800/50 transition-colors text-left ${
                        isSelected ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {conv.avatarUrl ? (
                          <img
                            src={conv.avatarUrl}
                            alt={conv.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {conv.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="font-semibold text-white truncate">
                                {conv.name}
                              </span>
                              {conv.type === 'group' && (
                                <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs rounded ${
                                  conv.groupType === 'public' 
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-emerald-900/30 text-emerald-400'
                                }`}>
                                  {conv.groupType === 'public' ? 'Public' : 'Private'}
                                </span>
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <>
                              <p className={`text-sm truncate ${
                                conv.lastMessage.isRead || conv.lastMessage.isFromMe
                                  ? 'text-slate-400'
                                  : 'text-white font-medium'
                              }`}>
                                {conv.lastMessage.isFromMe && 'You: '}
                                {conv.type === 'group' && !conv.lastMessage.isFromMe && conv.lastMessage.senderName && `${conv.lastMessage.senderName}: `}
                                {conv.lastMessage.content}
                              </p>
                              <span className="text-xs text-slate-500">
                                {formatTime(conv.lastMessage.createdAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedConversation ? 'block' : 'hidden md:block'} flex-1 flex flex-col bg-slate-900/30`}>
            {selectedConversation && selectedConversation.type === 'dm' && chatData ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-white/10 bg-slate-900/50">
                  <div className="p-4 flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    {chatData.otherUser?.avatarUrl ? (
                      <img
                        src={chatData.otherUser.avatarUrl}
                        alt={chatData.otherUser.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {chatData.otherUser?.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">
                        {chatData.otherUser?.username}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Level {chatData.otherUser?.level} • {chatData.otherUser?.xp} XP
                      </p>
                    </div>
                  </div>
                  
                  {/* Intro Messages Banner */}
                  {!chatData.isConnected && chatData.remainingIntroMessages !== null && (
                    <div className="px-4 pb-3">
                      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-300">
                          {chatData.remainingIntroMessages > 0 ? (
                            <>
                              <strong>{chatData.remainingIntroMessages} intro message{chatData.remainingIntroMessages !== 1 ? 's' : ''} remaining.</strong>
                              {' '}Connect with this user to continue messaging!
                            </>
                          ) : (
                            <>
                              <strong>You've used all 3 intro messages.</strong>
                              {' '}Send a connection request to continue messaging!
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                >
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-300">{error}</p>
                    </div>
                  ) : (
                    <>
                      {chatData.messages.map((msg) => (
                        <div
                          key={msg.messageId}
                          className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                        >
                          {!msg.isFromMe && (
                            chatData.otherUser?.avatarUrl ? (
                              <img
                                src={chatData.otherUser.avatarUrl}
                                alt={chatData.otherUser.username}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {chatData.otherUser?.username.charAt(0).toUpperCase()}
                              </div>
                            )
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              msg.isFromMe
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-slate-900/50">
                  {!chatData.isConnected && chatData.remainingIntroMessages === 0 ? (
                    <div className="bg-slate-800 border border-white/10 rounded-lg p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">
                        You've reached the intro message limit. Send a connection request to continue!
                      </p>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={
                          !chatData.isConnected && chatData.remainingIntroMessages !== null
                            ? `Intro message (${chatData.remainingIntroMessages} left)...`
                            : "Type a message..."
                        }
                        className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
                        maxLength={2000}
                        disabled={isSending}
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isSending}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {isSending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span className="hidden sm:inline">Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </>
            ) : selectedConversation && selectedConversation.type === 'group' && groupInfo ? (
              <>
                {/* Group Chat Header */}
                <div className="border-b border-white/10 bg-slate-900/50">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {groupInfo.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {groupInfo.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {groupInfo.memberCount} members • {groupInfo.type === 'public' ? 'Public' : 'Private'} Group
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {groupInfo.userRole === 'admin' && (
                        <button
                          onClick={openAddMembersModal}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-2 text-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">Add Members</span>
                        </button>
                      )}
                      <button
                        onClick={handleLeaveGroup}
                        disabled={isLeavingGroup}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 text-sm"
                      >
                        {isLeavingGroup ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Leaving...</span>
                          </>
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Leave Group</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                >
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-300">{error}</p>
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-slate-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {groupMessages.map((msg: any) => (
                        <div
                          key={msg.messageId}
                          className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                        >
                          {!msg.isFromMe && (
                            msg.senderAvatarUrl ? (
                              <img
                                src={msg.senderAvatarUrl}
                                alt={msg.senderUsername}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {msg.senderUsername?.charAt(0).toUpperCase()}
                              </div>
                            )
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              msg.isFromMe
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {!msg.isFromMe && (
                              <p className="text-xs opacity-70 mb-1">
                                {msg.senderUsername} • Level {msg.senderLevel}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Group Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-slate-900/50">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
                      maxLength={2000}
                      disabled={isSending}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Add Members Modal */}
                {showAddMembersModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                          <UserPlus className="w-5 h-5" />
                          <span>Add Study Buddies</span>
                        </h3>
                        <button
                          onClick={() => setShowAddMembersModal(false)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
                        {isLoadingBuddies ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                          </div>
                        ) : studyBuddies.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No study buddies available</p>
                            <p className="text-sm text-slate-500 mt-2">
                              Connect with users to add them to this group
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {studyBuddies
                              .filter(buddy => {
                                // Filter out buddies who are already members
                                return !groupMembers.some(member => member.userId === buddy.user.userID);
                              })
                              .map((buddy) => {
                                const isAdding = addingMembers.includes(buddy.user.userID);
                                return (
                                  <div
                                    key={buddy.connectionId}
                                    className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {buddy.user.username.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-white">
                                          {buddy.user.username}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          Level {buddy.user.level} • {buddy.user.xp.toLocaleString()} XP
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAddMember(buddy.user.userID)}
                                      disabled={isAdding}
                                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 text-sm"
                                    >
                                      {isAdding ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          <span>Adding...</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="w-4 h-4" />
                                          <span>Add</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            {studyBuddies.filter(buddy => 
                              !groupMembers.some(member => member.userId === buddy.user.userID)
                            ).length === 0 && (
                              <div className="text-center py-8">
                                <p className="text-slate-400">All your study buddies are already in this group</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setShowAddMembersModal(false)}
                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-slate-400">
                    Choose a buddy from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </main>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}

