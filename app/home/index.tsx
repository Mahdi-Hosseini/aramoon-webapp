import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../utils/supabase'

const { width, height } = Dimensions.get('window');

// Interface for baby health data
interface BabyHealthData {
  timestamp: string;
  respiration_rate: number;
  respiration_condition: string;
  posture: string;
  sleep_condition: string;
}

// Health status component - redesigned without emojis
const HealthStatusBox = ({ title, value }: { title: string; value: string | number }) => (
  <View style={styles.healthBox}>
    <Text style={styles.healthTitle}>{title}</Text>
    <Text style={styles.healthValue}>{value}</Text>
  </View>
);

export default function HomePage() {
  const router = useRouter()
  const { user, signOut, isLoading, session } = useAuth()
  
  // State for baby health data
  const [babyHealthData, setBabyHealthData] = useState<BabyHealthData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [healthDataLoading, setHealthDataLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Function to fetch current baby health data
  const fetchCurrentHealthData = async () => {
    try {
      // Don't set loading to true on subsequent fetches to avoid UI flicker
      if (!babyHealthData) {
        setHealthDataLoading(true)
      }
      setConnectionError(null)


      
      // Check if we have a valid session from AuthContext
      if (!session) {
        console.log('No session available from AuthContext')
        setConnectionError('Please log in again')
        return
      }

      // Get changing sample of data from the table
      const sampleOffset = Math.floor(Date.now() / 6000) % 100 // Changes every 6 seconds, cycles through 100 positions
      
      const { data, error } = await supabase
        .from('neonatal_health_data_6s_1month_no_temp')
        .select('*')
        .range(sampleOffset * 10, sampleOffset * 10 + 9) // Get 10 records from different positions

      if (error) {
        console.error('Database query error:', error)
        setConnectionError(`Database error: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        console.log('No data found at current sample position, trying recent data...')
        
        // Try to get most recent data
        const { data: recentData, error: recentError } = await supabase
          .from('neonatal_health_data_6s_1month_no_temp')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10)

        if (!recentError && recentData && recentData.length > 0) {
          // Pick a rotating record from recent data
          const rotatingIndex = Math.floor(Date.now() / 6000) % recentData.length
          const selectedRecord = recentData[rotatingIndex]
          
          setBabyHealthData(selectedRecord)
          
          // Set timestamp to show exact 6-second intervals
          const now = new Date()
          const seconds = now.getSeconds()
          const roundedSeconds = Math.floor(seconds / 6) * 6
          const exactTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                    now.getHours(), now.getMinutes(), roundedSeconds, 0)
          
          setLastUpdated(exactTime)
          setConnectionError(null)
          return
        }
        
        setConnectionError('No health data available in table')
        return
      }

      // Pick a rotating record from the sample
      const rotatingIndex = Math.floor(Date.now() / 6000) % data.length
      const selectedRecord = data[rotatingIndex]

      setBabyHealthData(selectedRecord)
      
      // Set timestamp to show exact 6-second intervals
      const now = new Date()
      const seconds = now.getSeconds()
      const roundedSeconds = Math.floor(seconds / 6) * 6 // Round down to nearest 6-second mark
      const exactTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                now.getHours(), now.getMinutes(), roundedSeconds, 0)
      
      setLastUpdated(exactTime)
      setConnectionError(null)

    } catch (error) {
      console.error('Error fetching health data:', error)
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setHealthDataLoading(false)
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  // Set up real-time health data fetching when user and session are available
  useEffect(() => {
    if (user && session) {
      console.log('User and session found, setting up health data fetching...')
      
      // Initial fetch
      fetchCurrentHealthData()
      
      // Set up interval to fetch data every 6 seconds
      const interval = setInterval(() => {
        fetchCurrentHealthData()
      }, 6000)
      
      return () => clearInterval(interval)
    } else {
      console.log('No user or session found, skipping health data setup')
    }
  }, [user, session]) // Depend on both user and session

  const handleSignOut = async () => {
    await signOut()
    // Navigation will happen automatically via the useEffect when user state changes
  }

  const handleAddDevice = () => {
    router.push('/add-device')
  }

  const handleChatBot = () => {
    router.push('../chat-bot')
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    )
  }

  if (!user) return null // Will redirect via useEffect

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar Background for Android */}
      <View style={styles.statusBarBackground} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/images/main.png')} 
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Aramoon</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addDeviceButton} onPress={handleAddDevice}>
            <Text style={styles.addDeviceText}>Add Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeSubtitle}>{user.email}</Text>
        </View>

        {/* Baby Health Status Section */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionTitle}>Baby's Current Status</Text>
          
          {/* Always show health boxes, just update their values */}
          <View style={styles.healthGrid}>
            <HealthStatusBox 
              title="Respiration Rate" 
              value={babyHealthData ? `${babyHealthData.respiration_rate} bpm` : (healthDataLoading ? "Loading..." : "No data")}
            />
            <HealthStatusBox 
              title="Breathing" 
              value={babyHealthData ? babyHealthData.respiration_condition : (healthDataLoading ? "Loading..." : "No data")}
            />
            <HealthStatusBox 
              title="Posture" 
              value={babyHealthData ? babyHealthData.posture : (healthDataLoading ? "Loading..." : "No data")}
            />
            <HealthStatusBox 
              title="Sleep Status" 
              value={babyHealthData ? babyHealthData.sleep_condition : (healthDataLoading ? "Loading..." : "No data")}
            />
          </View>

          {/* Status messages below the boxes */}
          {connectionError && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusText}>{connectionError}</Text>
            </View>
          )}
          
          {lastUpdated && !connectionError && (
            <Text style={styles.lastUpdated}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Action Cards */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.chatCard]}
            onPress={handleChatBot}
          >
            <Text style={styles.actionTitle}>AI Assistant</Text>
            <Text style={styles.actionSubtitle}>Get instant help and guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.deviceCard]}
            onPress={() => router.push('/devices')}
          >
            <Text style={styles.actionTitle}>Your Devices</Text>
            <Text style={styles.actionSubtitle}>Manage connected devices</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A183BF' + '10',
  },
  statusBarBackground: {
    height: 30, // Extra space for Android status bar
    backgroundColor: '#A183BF',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A183BF' + '10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 48,
    height: 48,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A183BF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#A183BF',
  },
  signOutText: {
    color: '#A183BF',
    fontWeight: '700',
    fontSize: 16,
  },
  addDeviceButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
    backgroundColor: '#A183BF',
    borderRadius: 25,
    shadowColor: '#A183BF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addDeviceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#A183BF',
    fontWeight: '500',
  },
  healthSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
   healthBox: {
     backgroundColor: '#fff',
     borderRadius: 12,
     padding: 15,
     width: '48%',
     alignItems: 'center',
     shadowColor: '#A183BF',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
     borderLeftWidth: 4,
     borderLeftColor: '#A183BF',
   },
   healthTitle: {
     fontSize: 14,
     fontWeight: 'bold',
     color: '#1f2937',
     marginBottom: 8,
     textAlign: 'center',
   },
   healthValue: {
     fontSize: 16,
     color: '#A183BF',
     textAlign: 'center',
     fontWeight: '600',
   },
   loadingBox: {
     backgroundColor: '#fff',
     borderRadius: 12,
     padding: 20,
     alignItems: 'center',
     shadowColor: '#A183BF',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   loadingText: {
     fontSize: 16,
     color: '#6b7280',
     fontWeight: '500',
   },
   errorBox: {
     backgroundColor: '#fff',
     borderRadius: 12,
     padding: 20,
     alignItems: 'center',
     shadowColor: '#A183BF',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
     borderLeftWidth: 4,
     borderLeftColor: '#f59e0b',
   },
   errorText: {
     fontSize: 16,
     color: '#dc2626',
     fontWeight: '600',
     marginBottom: 4,
   },
   errorSubtext: {
     fontSize: 14,
     color: '#6b7280',
     textAlign: 'center',
   },
   lastUpdated: {
     fontSize: 12,
     color: '#6b7280',
     textAlign: 'center',
     marginTop: 10,
     fontStyle: 'italic',
   },
   statusMessage: {
     backgroundColor: '#fff3cd',
     padding: 8,
     borderRadius: 8,
     marginTop: 10,
     borderLeftWidth: 4,
     borderLeftColor: '#856404',
   },
   statusText: {
     fontSize: 12,
     color: '#856404',
     textAlign: 'center',
   },
   actionSection: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     gap: 15,
   },
   actionCard: {
     flex: 1,
     backgroundColor: '#fff',
     borderRadius: 16,
     padding: 20,
     alignItems: 'center',
     shadowColor: '#A183BF',
     shadowOffset: {
       width: 0,
       height: 4,
     },
     shadowOpacity: 0.15,
     shadowRadius: 8,
     elevation: 4,
   },
   chatCard: {
     borderTopWidth: 4,
     borderTopColor: '#A183BF',
   },
   deviceCard: {
     borderTopWidth: 4,
     borderTopColor: '#A183BF',
   },
   actionTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#1f2937',
     marginBottom: 8,
     textAlign: 'center',
   },
   actionSubtitle: {
     fontSize: 14,
     color: '#6b7280',
     textAlign: 'center',
     lineHeight: 20,
   },
 })  