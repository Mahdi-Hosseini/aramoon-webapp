import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
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
  const { t } = useLanguage()
  
  // State for baby health data
  const [babyHealthData, setBabyHealthData] = useState<BabyHealthData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [healthDataLoading, setHealthDataLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // State for menu dropdown
  const [showMenu, setShowMenu] = useState(false)

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
        <Text>{t.loading}</Text>
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
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setShowMenu(true)}
          >
            <Text style={styles.menuText}>{t.menu}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Dropdown Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuDropdown}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setShowMenu(false)
                handleAddDevice()
              }}
            >
              <Text style={styles.menuItemText}>{t.addDevice}</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setShowMenu(false)
                                  router.push('../settings')
              }}
            >
              <Text style={styles.menuItemText}>{t.settings}</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setShowMenu(false)
                handleSignOut()
              }}
            >
              <Text style={styles.menuItemText}>{t.signOut}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>{t.welcomeBack}</Text>
        </View>

        {/* Baby Health Status Section */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionTitle}>{t.babyCurrentStatus}</Text>
          
          {/* Always show health boxes, just update their values */}
          <View style={styles.healthGrid}>
            <HealthStatusBox 
              title={t.respirationRate} 
              value={babyHealthData ? `${babyHealthData.respiration_rate} bpm` : (healthDataLoading ? t.loading : t.noData)}
            />
            <HealthStatusBox 
              title={t.breathing} 
              value={babyHealthData ? babyHealthData.respiration_condition : (healthDataLoading ? t.loading : t.noData)}
            />
            <HealthStatusBox 
              title={t.posture} 
              value={babyHealthData ? babyHealthData.posture : (healthDataLoading ? t.loading : t.noData)}
            />
            <HealthStatusBox 
              title={t.sleepStatus} 
              value={babyHealthData ? babyHealthData.sleep_condition : (healthDataLoading ? t.loading : t.noData)}
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
              {t.lastUpdated}: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Action Cards */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.chatCard]}
            onPress={handleChatBot}
          >
            <Text style={styles.actionTitle}>{t.aiAssistant}</Text>
            <Text style={styles.actionSubtitle}>{t.getInstantHelp}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.deviceCard]}
            onPress={() => router.push('/devices')}
          >
            <Text style={styles.actionTitle}>{t.yourDevices}</Text>
            <Text style={styles.actionSubtitle}>{t.manageConnectedDevices}</Text>
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
    width: 104,
    height: 104,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#A183BF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#A183BF20',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#A183BF',
    shadowColor: '#A183BF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuText: {
    fontSize: 16,
    color: '#A183BF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 15,
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
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'flex-start',
     alignItems: 'flex-end',
   },
   menuDropdown: {
     backgroundColor: '#fff',
     borderRadius: 12,
     padding: 8,
     marginTop: 80,
     marginRight: 20,
     minWidth: 150,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.15,
     shadowRadius: 12,
     elevation: 8,
   },
   menuItem: {
     padding: 16,
     width: '100%',
     alignItems: 'center',
   },
   menuItemText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#1f2937',
   },
   menuSeparator: {
     height: 1,
     backgroundColor: '#e5e7eb',
     width: '100%',
     marginVertical: 4,
   },
 })  