'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { MessageCircle, Loader2, AlertCircle, Send, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useSearchParams } from 'next/navigation';

interface Conversation {
  userID: number;
  username: string;
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
    isRead: boolean;
  };
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
  } | null;
  hasMore: boolean;
  isConnected: boolean;
  remainingIntroMessages: number | null;
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialUserId ? parseInt(initialUserId) : null
  );
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchChat(selectedUserId);
      
      // Poll for new messages in current chat every 3 seconds
      const interval = setInterval(() => fetchChat(selectedUserId, true), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [chatData?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/community/messages');
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchChat = async (userId: number, silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingChat(true);
      setError(null);
      
      const response = await fetch(`/api/community/messages/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setChatData(data);
    } catch (err) {
      console.error('Error fetching chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (!silent) setIsLoadingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      setIsSending(true);
      const response = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverID: selectedUserId,
          content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      // Refresh chat
      await fetchChat(selectedUserId, true);
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
          <div className={`${selectedUserId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-white/10 bg-slate-900/50`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
                <span>Messages</span>
              </h2>
            </div>

            <div className="overflow-y-auto h-[calc(100%-73px)]">
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
                conversations.map((conv) => (
                  <button
                    key={conv.userID}
                    onClick={() => setSelectedUserId(conv.userID)}
                    className={`w-full p-4 border-b border-white/5 hover:bg-slate-800/50 transition-colors text-left ${
                      selectedUserId === conv.userID ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conv.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white truncate">
                            {conv.username}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${
                          conv.lastMessage.isRead || conv.lastMessage.isFromMe
                            ? 'text-slate-400'
                            : 'text-white font-medium'
                        }`}>
                          {conv.lastMessage.isFromMe && 'You: '}
                          {conv.lastMessage.content}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedUserId ? 'block' : 'hidden md:block'} flex-1 flex flex-col bg-slate-900/30`}>
            {selectedUserId && chatData ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-white/10 bg-slate-900/50">
                  <div className="p-4 flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="md:hidden text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {chatData.otherUser?.username.charAt(0).toUpperCase()}
                    </div>
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
                  className="flex-1 overflow-y-auto p-4 space-y-4"
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
                          className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
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

