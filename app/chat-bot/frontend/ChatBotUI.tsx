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
import { useLanguage } from '../../../context/LanguageContext'; // Import useLanguage

// API endpoint - read from environment variables
const getApiEndpoint = () => {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_BASE_URL_WEB + '/chat' || 'http://localhost:8000/api/v1/chat';
  } else {
    // For mobile, use the mobile API URL from environment variables
    return process.env.EXPO_PUBLIC_API_BASE_URL_MOBILE + '/chat' || 'http://172.20.10.9:8000/api/v1/chat';
  }
};

const API_ENDPOINT = getApiEndpoint();
const API_BASE = API_ENDPOINT.replace('/chat', '');

// Debug logging for API configuration
console.log(`🔧 [${Platform.OS.toUpperCase()}] API CONFIGURATION:`);
console.log(`   Web API Base: ${process.env.EXPO_PUBLIC_API_BASE_URL_WEB || 'NOT CONFIGURED'}`);
console.log(`   Mobile API Base: ${process.env.EXPO_PUBLIC_API_BASE_URL_MOBILE || 'NOT CONFIGURED'}`);
console.log(`   Current API Endpoint: ${API_ENDPOINT}`);
console.log(`   Current API Base: ${API_BASE}`);

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
  const { t } = useLanguage();

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
      styles.messageBubble as any,
      item.sender === 'user' ? styles.userMessage as any : styles.botMessage as any
    ]}>
      <Text style={(item.sender === 'user' ? styles.userMessageText : styles.botMessageText) as any}>
        {item.text}
      </Text>
      <Text style={styles.timestampText as any}>
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
            <Text style={styles.conversationHeaderText}>{t.conversations}</Text>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Text style={styles.newChatButtonText}>{t.newChat}</Text>
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
                  <Text style={styles.conversationTitle} numberOfLines={1}>{item.title || t.untitledChat}</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={(e) => { 
                      e.stopPropagation();
                      handleDeleteConversation(item.id); 
                    }}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              horizontal={false}
              showsVerticalScrollIndicator={true}
            />
          ) : (
            <Text style={styles.noConversationsText}>{t.noConversationsYet}</Text>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />
        {isLoading && (
          <View style={styles.loadingIndicatorContainer}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>{t.botThinking}</Text>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.typeYourMessage}
            placeholderTextColor="#999"
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendMessage} 
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>{t.send}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A183BF10',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    height: Platform.OS === 'web' ? '100vh' : undefined,
  },
  // Styles for Conversation List
  conversationListContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderBottomColor: '#e5e7eb',
    borderRightColor: '#e5e7eb',
    maxHeight: Platform.OS === 'web' ? '100%' : '25%',
    minHeight: Platform.OS === 'web' ? '100%' : undefined,
    width: Platform.OS === 'web' ? 300 : '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  conversationHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  newChatButton: {
    backgroundColor: '#A183BF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  conversationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentConversationItem: {
    backgroundColor: '#A183BF20',
    borderColor: '#A183BF',
    shadowColor: '#A183BF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationTitle: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noConversationsText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 20,
    fontStyle: 'italic',
    fontSize: 15,
  },
  keyboardAvoidingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: Platform.OS === 'web' ? '100%' : undefined,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  messageListContent: {
    paddingTop: 16,
    paddingBottom: 16,
    ...(Platform.OS === 'web' && { minHeight: 'calc(100vh - 200px)' as any }),
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#A183BF',
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  botMessage: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  botMessageText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  timestampText: {
    fontSize: 11,
    color: '#9ca3af',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    backgroundColor: '#A183BF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#A183BF80',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#A183BF10',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#A183BF',
    fontWeight: '500',
  },
}); 