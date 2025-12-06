"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  content: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  fromUser: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Conversation {
  userId: string;
  userName?: string;
  userEmail: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

function MessagesPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [otherUserId, setOtherUserId] = useState(searchParams.get("userId") || "");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }

    // Don't initialize socket if session is not ready
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    // Initialize socket - use current window location for mobile compatibility
    const socketUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000");
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: session.user.id,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      if (otherUserId) {
        newSocket.emit("joinRoom", { otherUserId });
        console.log(`Joined room for conversation with ${otherUserId}`);
      }
    });

    // Join room when otherUserId changes
    if (otherUserId) {
      newSocket.emit("joinRoom", { otherUserId });
      console.log(`Joining room for conversation with ${otherUserId}`);
    }

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      if (otherUserId) {
        newSocket.emit("joinRoom", { otherUserId });
      }
    });

    newSocket.on("newMessage", (message: Message) => {
      console.log("Received new message:", message);
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        // Replace temp message with real one if it exists
        const filtered = prev.filter((m) => !m.id.startsWith("temp-"));
        return [...filtered, message];
      });
      
      // Update conversations list
      if (session?.user?.id) {
        setConversations((prev) => {
          const otherId = message.fromUserId === session.user.id ? message.toUserId : message.fromUserId;
          const existing = prev.find((c) => c.userId === otherId);
          if (existing) {
            return prev.map((c) =>
              c.userId === otherId
                ? {
                    ...c,
                    lastMessage: message.content,
                    lastMessageTime: message.createdAt,
                    unreadCount: message.fromUserId === session.user.id ? c.unreadCount : c.unreadCount + 1,
                  }
                : c
            );
          } else {
            // Add new conversation if it doesn't exist
            // Note: toUser and fromUser are added by the socket server
            const otherUser = message.fromUserId === session.user.id 
              ? (message as any).toUser 
              : (message as any).fromUser;
            
            return [...prev, {
              userId: otherId,
              userName: otherUser?.name,
              userEmail: otherUser?.email || "",
              lastMessage: message.content,
              lastMessageTime: message.createdAt,
              unreadCount: message.fromUserId === session.user.id ? 0 : 1,
            }];
          }
        });
      }
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [session, status, router, otherUserId]);

  // Fetch all conversations
  useEffect(() => {
    if (status === "authenticated" && session) {
      fetch("/api/messages/conversations")
        .then((res) => res.json())
        .then((data) => {
          if (data.conversations) {
            setConversations(data.conversations);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching conversations:", error);
          setLoading(false);
        });
    }
  }, [session, status]);

  // Join room when conversation changes
  useEffect(() => {
    if (socket && socket.connected && otherUserId) {
      socket.emit("joinRoom", { otherUserId });
      console.log(`Joined room for conversation with ${otherUserId}`);
    }
  }, [socket, otherUserId]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (otherUserId && status === "authenticated" && session) {
      // Reset unread count when opening conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === otherUserId ? { ...c, unreadCount: 0 } : c
        )
      );

      fetch(`/api/messages?otherUserId=${otherUserId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            setMessages(data.messages);
          }
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
        });
    } else {
      setMessages([]);
    }
  }, [otherUserId, session, status]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || !otherUserId || !session?.user?.id) return;

    const productId = searchParams.get("productId") || undefined;
    const messageContent = newMessage.trim();

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      fromUserId: session.user.id,
      toUserId: otherUserId,
      createdAt: new Date().toISOString(),
      fromUser: {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      console.log("Sending message:", { toUserId: otherUserId, productId, content: messageContent });
      socket.emit("sendMessage", {
        toUserId: otherUserId,
        productId,
        content: messageContent,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageContent);
    }
  };

  // On mobile, show conversations list or messages, not both
  useEffect(() => {
    if (otherUserId && isMobile) {
      setShowConversations(false);
    } else if (!otherUserId) {
      setShowConversations(true);
    }
  }, [otherUserId, isMobile]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading...</div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) return null;

  const handleSelectConversation = (userId: string) => {
    setOtherUserId(userId);
    router.push(`/dashboard/messages?userId=${userId}`);
    if (isMobile) {
      setShowConversations(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
          {/* Mobile back button */}
          {otherUserId && isMobile && (
            <button
              onClick={() => {
                setOtherUserId("");
                setShowConversations(true);
                router.push("/dashboard/messages");
              }}
              className="lg:hidden flex items-center text-blue-600 hover:text-blue-700"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Conversations List */}
          <div className={`lg:col-span-1 ${otherUserId && isMobile ? "hidden" : ""}`}>
            <div className="bg-white rounded-lg shadow-md h-[calc(100vh-12rem)] sm:h-[600px] flex flex-col">
              <div className="p-3 sm:p-4 border-b">
                <h2 className="text-base sm:text-lg font-semibold">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No conversations yet</div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => handleSelectConversation(conv.userId)}
                      className={`w-full text-left p-3 sm:p-4 border-b hover:bg-gray-50 transition-colors ${
                        otherUserId === conv.userId ? "bg-blue-50 border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                            {conv.userName || conv.userEmail}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          )}
                          {conv.lastMessageTime && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(conv.lastMessageTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={`lg:col-span-2 ${!otherUserId && isMobile ? "hidden" : ""}`}>
            {otherUserId ? (
              <div className="bg-white rounded-lg shadow-md h-[calc(100vh-12rem)] sm:h-[600px] flex flex-col">
                <div className="p-3 sm:p-4 border-b">
                  <h2 className="text-base sm:text-lg font-semibold">
                    {conversations.find(c => c.userId === otherUserId)?.userName || 
                     conversations.find(c => c.userId === otherUserId)?.userEmail || 
                     "Chat"}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm sm:text-base">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          session?.user?.id && msg.fromUserId === session.user.id ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                            session?.user?.id && msg.fromUserId === session.user.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-900"
                          }`}
                        >
                          <p className="break-words text-sm sm:text-base">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-3 sm:p-4 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md h-[calc(100vh-12rem)] sm:h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500 px-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-base sm:text-lg">Select a conversation to start messaging</p>
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}

