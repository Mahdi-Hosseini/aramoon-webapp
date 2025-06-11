import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext'; // Import useAuth

// Replace with your actual API endpoint
//const API_ENDPOINT = 'http://localhost:8000/api/v1/chat'; // Corrected endpoint

// API endpoint - use computer IP for mobile devices, localhost for web
const getApiEndpoint = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1/chat';
  } else {
    // For mobile, try the computer's IP first, then fallback to localhost if needed
    return 'http://172.20.10.9:8000/api/v1/chat';
  }
};

const API_ENDPOINT = getApiEndpoint();
const API_BASE = API_ENDPOINT.replace('/chat', '');

// Add timeout configuration for mobile devices
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

// Helper function to create fetch with timeout
const fetchWithTimeout = (url: string, options: any, timeout = FETCH_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeout)
    )
  ]);
};

// Test backend connectivity and authentication
const testBackendConnection = async (session: any) => {
  // First check if backend server is even running
  if (Platform.OS !== 'web') {
    console.log('⚠️  Make sure your backend server is running on your computer:');
    console.log('   cd app/chat-bot/backend && python start.py');
    console.log('   Then test at: http://localhost:8000/docs');
  }
  
  try {
    console.log(`Testing backend connectivity to: ${API_BASE}`);
    console.log(`Platform: ${Platform.OS}`);
    
    // Test basic connectivity with shorter timeout
    const connectivityTest = await fetchWithTimeout(`${API_BASE}/test`, {
      method: 'GET',
    }, 5000);
    
    if (connectivityTest.ok) {
      console.log('✅ Backend connectivity test passed');
    } else {
      console.error('❌ Backend connectivity test failed:', connectivityTest.status);
      return false;
    }
    
    // Test authentication
    if (session?.access_token) {
      console.log('Testing authentication...');
      
      const authTest = await fetchWithTimeout(`${API_BASE}/test-auth`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }, 5000);
      
      if (authTest.ok) {
        const authData = await authTest.json();
        console.log('✅ Authentication test passed:', authData);
        return true;
      } else {
        const errorText = await authTest.text();
        console.error('❌ Authentication test failed:', authTest.status, errorText);
        return false;
      }
    } else {
      console.error('❌ No access token available');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    if (Platform.OS !== 'web') {
      console.error('💡 Troubleshooting steps:');
      console.error('   1. Make sure backend server is running: python start.py');
      console.error('   2. Check Windows Firewall allows port 8000');
      console.error('   3. Verify your computer IP is 172.20.10.9');
      console.error('   4. Try connecting your phone to the same WiFi network');
    }
    return false;
  }
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Define an interface for Conversation
interface Conversation {
  id: string; // Assuming UUID string from backend
  title: string;
  // Add any other relevant fields you want to display or use, e.g., created_at, updated_at
  // For simplicity, starting with id and title
}

export default function ChatBotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false); // For loading conv list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const { session } = useAuth(); // Get session from AuthContext

  // Function to scroll to the bottom of the message list
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to fetch conversations
  const fetchConversations = async () => {
    if (!session) return;
    setIsLoadingConversations(true);
    
    console.log(`🔍 [${Platform.OS.toUpperCase()}] FETCHING CONVERSATIONS`);
    console.log(`👤 User: ${session?.user?.email} (${session?.user?.id})`);
    console.log(`🔑 Token: ${session?.access_token ? 'Present (' + session.access_token.length + ' chars)' : 'Missing'}`);
    console.log(`🌐 API Endpoint: ${API_BASE}/conversations`);
    
    try {
      const response = await fetchWithTimeout(`${API_BASE}/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📊 [${Platform.OS.toUpperCase()}] RESPONSE STATUS: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${Platform.OS.toUpperCase()}] BACKEND ERROR:`);
        console.error(`   Status: ${response.status}`);
        console.error(`   Response: ${errorText}`);
        console.error(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        
        if (response.status === 401) {
          console.error(`🚫 [${Platform.OS.toUpperCase()}] AUTHENTICATION FAILED - This is likely a JWT token issue`);
          console.error(`🔍 Token preview: ${session.access_token?.substring(0, 50)}...`);
        } else if (response.status === 403) {
          console.error(`🚫 [${Platform.OS.toUpperCase()}] ACCESS DENIED - This could be an RLS policy issue`);
        } else if (response.status === 500) {
          console.error(`💥 [${Platform.OS.toUpperCase()}] SERVER ERROR - Backend database/connection issue`);
        }
        
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const data: Conversation[] = await response.json();
      
      // KEY DIAGNOSIS LOG
      if (data.length === 0) {
        console.warn(`⚠️  [${Platform.OS.toUpperCase()}] SUCCESS BUT NO CONVERSATIONS FOUND`);
        console.warn(`   This suggests an RLS (Row Level Security) issue in Supabase`);
        console.warn(`   Backend authentication works, but database access is blocked`);
        console.warn(`   Compare this with web results - if web shows conversations, it's RLS`);
      } else {
        console.log(`✅ [${Platform.OS.toUpperCase()}] SUCCESS: Found ${data.length} conversations`);
        console.log(`   First conversation: "${data[0]?.title || 'No title'}"`);
      }
      
      setConversations(data.map(conv => ({ id: conv.id, title: conv.title })));
      
    } catch (error) {
      console.error(`💥 [${Platform.OS.toUpperCase()}] FETCH FAILED:`, error instanceof Error ? error.message : String(error));
      
      // Add diagnostic message to chat
      setMessages(prevMessages => [...prevMessages, {
        id: 'diagnostic-' + Date.now(),
        text: `🔧 Diagnostic: Failed to load conversations on ${Platform.OS}. Check console for details.`,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Test backend connection and fetch conversations when session becomes available
  useEffect(() => {
    if (session) {
      // Test backend connection first
      testBackendConnection(session).then(connectionOk => {
        if (connectionOk) {
          console.log('Backend connection verified, fetching conversations...');
          fetchConversations();
        } else {
          console.error('Backend connection failed, not fetching conversations');
          setMessages([{
            id: 'connection-error-' + Date.now(),
            text: 'Unable to connect to chat backend. Please check your connection.',
            sender: 'bot',
            timestamp: new Date(),
          }]);
        }
      });
    }
  }, [session]);

  // Function to load a specific conversation's messages
  const loadConversation = async (conversationId: string) => {
    if (!session) return;
    console.log("=== LOAD CONVERSATION DEBUG ===");
    console.log(`Loading conversation: ${conversationId}`);
    console.log("Platform:", Platform.OS);
    console.log("User ID:", session?.user?.id);
    
    setIsLoading(true);
    setMessages([]);
    setCurrentConversationId(conversationId);

    try {
      const url = `${API_BASE}/conversations/${conversationId}/messages`;
      console.log("Making request to:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error loading conversation messages - Status:", response.status);
        console.error("❌ Error response body:", errorText);
        
        setMessages([{
          id: 'error-' + Date.now(),
          text: `Error loading conversation: ${response.status}. Platform: ${Platform.OS}`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ Conversation messages loaded successfully!");
      console.log("Number of messages:", data?.messages?.length || 0);
      console.log("Full conversation data:", data);
      
      if (data && data.messages) {
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'bot',
          timestamp: new Date(msg.created_at),
        }));
        console.log("Processed messages:", loadedMessages);
        setMessages(loadedMessages);
      } else {
        console.error("❌ Conversation data not in expected format:", data);
        setMessages([{
          id: 'error-format-' + Date.now(),
          text: "Failed to parse conversation messages.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error("❌ Failed to load conversation messages:", error);
      if (messages.length === 0) {
          setMessages([{
            id: 'error-fetch-' + Date.now(),
            text: `An error occurred while fetching conversation. Platform: ${Platform.OS}`,
            sender: 'bot',
            timestamp: new Date(),
          }]);
      }
    } finally {
      setIsLoading(false);
      console.log("=== LOAD CONVERSATION END ===");
    }
  };

  // Function to start a new chat
  const handleNewChat = () => {
    console.log("Starting new chat...");
    setCurrentConversationId(null);
    setMessages([]);
    setInputText(""); // Clear input text as well
    // The next message sent via handleSendMessage will create a new conversation
  };

  // Function to delete a conversation
  const handleDeleteConversation = async (conversationId: string) => {
    if (!session) return;
    console.log(`Deleting conversation: ${conversationId}`);
    // Optionally, add a confirmation dialog here before deleting

    setIsLoading(true); // Indicate activity
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error deleting conversation:", response.status, errorText);
        // Display an error message in the chat area or as a notification
        setMessages(prevMessages => [...prevMessages, {
          id: 'error-delete-' + Date.now(),
          text: `Error deleting conversation: ${response.status}. Please try again.`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      console.log("Conversation deleted successfully");
      await fetchConversations(); // Refresh the conversation list

      // If the deleted conversation was the current one, clear the view or load another
      if (currentConversationId === conversationId) {
        handleNewChat(); // Or load the first available conversation from the updated list
      }

    } catch (error) {
      console.error("Failed to delete conversation:", error);
      // Error message for deletion failure can be shown
      if (!messages.find(m => m.id.startsWith('error-delete'))) {
        setMessages(prevMessages => [...prevMessages, {
          id: 'error-delete-fetch-' + Date.now(),
          text: "An error occurred while deleting the conversation.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    if (!session) { 
      console.error("No active session. Please log in.");
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now().toString(),
        text: "Authentication error. Please log in again.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(), // Frontend generated ID for user message
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const messageToSend = inputText; 
    setInputText('');
    setIsLoading(true);

    // Prepare request body
    const requestBody: any = { message: messageToSend };
    if (currentConversationId) {
      requestBody.conversation_id = currentConversationId;
    }
    // If currentConversationId is null, the backend chat_service will create a new one

    console.log(`📤 [${Platform.OS.toUpperCase()}] SENDING MESSAGE`);
    console.log(`👤 User: ${session?.user?.email}`);
    console.log(`💬 Message: "${messageToSend}"`);
    console.log(`🔗 Conversation ID: ${currentConversationId || 'NEW'}`);
    console.log(`🔑 Token: ${session?.access_token ? 'Present' : 'Missing'}`);

    try {
      const token = session.access_token;
      fetchWithTimeout(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            console.error(`❌ [${Platform.OS.toUpperCase()}] MESSAGE SEND FAILED:`);
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${text}`);
            
            if (response.status === 401) {
              console.error(`🚫 [${Platform.OS.toUpperCase()}] AUTHENTICATION FAILED - JWT token issue`);
            } else if (response.status === 403) {
              console.error(`🚫 [${Platform.OS.toUpperCase()}] ACCESS DENIED - RLS policy issue`);
            }
            
            throw new Error(`Server error: ${response.status} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {

        // data is ChatResponse: { conversation_id, message (user), response (assistant) }
        console.log(`✅ [${Platform.OS.toUpperCase()}] MESSAGE SENT SUCCESSFULLY`);
        console.log(`🤖 Bot response: "${data?.response?.content?.substring(0, 50) || 'No content'}..."`);
        console.log(`🔗 Conversation ID: ${data?.conversation_id || 'Missing'}`);
        
        if (data && data.response && data.response.content && data.conversation_id) {
          const botMessage: Message = {
            id: data.response.id, // Use ID from backend assistant message
            text: data.response.content,
            sender: 'bot',
            timestamp: data.response.created_at ? new Date(data.response.created_at) : new Date(),
          };
          setMessages(prevMessages => [...prevMessages, botMessage]);

          // Update currentConversationId if it's new or wasn't set
          if (!currentConversationId || currentConversationId !== data.conversation_id) {
            setCurrentConversationId(data.conversation_id);
            // If it was a new conversation, refresh the conversation list
            if (!currentConversationId) {
              fetchConversations(); // Refresh list to show the new one
            }
          }
        } else {
          console.error(`❌ [${Platform.OS.toUpperCase()}] INVALID RESPONSE FORMAT:`, data);
          const errorBotMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: "Error: Bot response format is unexpected.",
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prevMessages => [...prevMessages, errorBotMessage]);
        }
      })
      .catch(error => {
        console.error(`💥 [${Platform.OS.toUpperCase()}] MESSAGE SEND ERROR:`, error instanceof Error ? error.message : String(error));
        setMessages(prevMessages => [...prevMessages, {
          id: (Date.now() + 1).toString(),
          text: `Error sending message on ${Platform.OS}. Check console for details.`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    } catch (error) {
      console.error(`💥 [${Platform.OS.toUpperCase()}] CRITICAL ERROR:`, error instanceof Error ? error.message : String(error));
      setMessages(prevMessages => [...prevMessages, {
        id: (Date.now() + 1).toString(),
        text: `Critical error on ${Platform.OS}. Please try again.`,
        sender: 'bot',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userMessage : styles.botMessage
    ]}>
      <Text style={item.sender === 'user' ? styles.userMessageText : styles.botMessageText}>
        {item.text}
      </Text>
      <Text style={styles.timestampText}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Conversation List Section */}
      {session && (
        <View style={styles.conversationListContainer}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationHeaderText}>Conversations</Text>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Text style={styles.newChatButtonText}>+ New Chat</Text>
            </TouchableOpacity>
          </View>
          {isLoadingConversations ? (
            <ActivityIndicator size="small" color="#4f46e5" style={{marginVertical: 10}}/>
          ) : conversations.length > 0 ? (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.conversationItem,
                    item.id === currentConversationId && styles.currentConversationItem
                  ]}
                  onPress={() => loadConversation(item.id)}
                >
                  <Text style={styles.conversationTitle} numberOfLines={1}>{item.title || "Untitled Chat"}</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={(e) => { 
                      e.stopPropagation(); // Prevent triggering loadConversation
                      handleDeleteConversation(item.id); 
                    }}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              horizontal={false} // Make it a vertical list
              showsVerticalScrollIndicator={true}
            />
          ) : (
            <Text style={styles.noConversationsText}>No conversations yet. Start a new chat!</Text>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Adjust as needed
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={scrollToBottom} // Ensure scroll on new messages
          onLayout={scrollToBottom} // Ensure scroll on initial layout
        />
        {isLoading && (
          <View style={styles.loadingIndicatorContainer}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Bot is thinking...</Text>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendMessage} 
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  // Styles for Conversation List
  conversationListContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    maxHeight: '30%', // Limit height of conversation list
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  conversationHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  newChatButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  conversationItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  currentConversationItem: {
    backgroundColor: '#e0e7ff', // Light indigo to highlight current
    borderColor: '#4f46e5',
  },
  conversationTitle: {
    fontSize: 15,
    color: '#333',
    flex: 1, // Allow title to take space but be shrinkable
    marginRight: 10, // Space before delete button
  },
  deleteButton: {
    padding: 5,
    // backgroundColor: '#ef4444', // Optional: for a red background
    // borderRadius: 10,
  },
  deleteButtonText: {
    color: '#ef4444', // Red color for delete icon
    fontSize: 16,
    fontWeight: 'bold',
  },
  noConversationsText: {
    textAlign: 'center',
    color: '#777',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageListContent: {
    paddingTop: 10,
    paddingBottom: 10, // Add padding to bottom to not be overlapped by input
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
    marginRight: 5,
  },
  botMessage: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
    marginLeft: 5,
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  botMessageText: {
    fontSize: 16,
    color: '#000',
  },
  timestampText: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120, // Allow for multiple lines but not excessive height
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    height: 40, // Match minHeight of input for alignment
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#a9a5f5', // Lighter shade when disabled
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4f46e5',
  },
}); 