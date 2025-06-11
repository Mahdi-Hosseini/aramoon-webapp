import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

// Define proper TypeScript interfaces for our data structures
interface Device {
  id: number;
  device_id: string;
  name: string;
  connected_at: string;
}

// This represents a simplified version of what Supabase returns
interface DeviceResult {
  id: number;
  device_id: string;
  connected_at: string;
  devices: any; // This will handle whatever structure comes back
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deviceToDisconnect, setDeviceToDisconnect] = useState<{deviceId: string, id: number} | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    fetchDevices();
  }, [user]);

  const fetchDevices = async () => {
    console.log('=== FETCH DEVICES CALLED ===');
    
    if (!user) {
      console.log('No user, skipping fetch');
      return;
    }
    
    if (isDisconnecting) {
      console.log('Currently disconnecting, skipping fetch');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching devices for user:', user.id);
      
      // Check auth session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session valid:', !!sessionData?.session);
      
      // Use the RPC function to get the user's devices
      const { data, error } = await supabase
        .rpc('get_user_devices', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error fetching devices:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      console.log('Devices fetched:', data);
      
      if (!data || !data.devices || data.devices.length === 0) {
        setDevices([]);
        setLoading(false);
        return;
      }

      // Format the data coming from the RPC function
      const formattedDevices: Device[] = data.devices.map((item: any) => {
        console.log('Device item:', item);
        return {
          id: item.id,
          device_id: item.device_id,
          name: item.name || `Device (ID: ${item.device_id.substring(0, 8)}...)`,
          connected_at: new Date(item.connected_at).toLocaleString(),
        };
      });

      setDevices(formattedDevices);
    } catch (error: any) {
      console.error('Error fetching devices:', error);
      Alert.alert('Error', 'Failed to fetch devices: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const disconnectDevice = async (deviceId: string, id: number) => {
    console.log('=== DISCONNECT FUNCTION CALLED ===');
    console.log('Device ID:', deviceId);
    console.log('Connection ID:', id);
    console.log('User exists:', !!user);
    console.log('User ID:', user?.id);
    
    if (!user) {
      console.log('No user found, returning early');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('Setting up custom confirmation dialog...');
    setDeviceToDisconnect({ deviceId, id });
    setShowConfirmDialog(true);
  };

  const performDisconnect = async (deviceId: string, id: number) => {
    console.log('=== PERFORMING ACTUAL DISCONNECT ===');
    if (!user) return;
    
    setIsDisconnecting(true);
    
    try {
      setLoading(true);
      console.log('=== DISCONNECT DEBUG START ===');
      console.log('Attempting to disconnect device:', deviceId);
      console.log('User ID:', user.id);
      console.log('Connection ID:', id);
      console.log('Device ID type:', typeof deviceId);
      console.log('User ID type:', typeof user.id);
      
      // Check auth session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session valid:', !!sessionData?.session);
      console.log('Session user ID:', sessionData?.session?.user?.id);
      
      // Ensure deviceId is properly formatted as UUID
      const deviceIdToUse = deviceId.trim();
      console.log('Cleaned device ID:', deviceIdToUse);
      
      // Use the RPC function to disconnect the device
      const { data: disconnectResult, error: disconnectError } = await supabase
        .rpc('disconnect_device_from_user', {
          p_user_id: user.id,
          p_device_id: deviceIdToUse
        });

      console.log('Raw disconnection result:', disconnectResult);
      console.log('Raw disconnection error:', disconnectError);

      if (disconnectError) {
        console.error('Disconnect error details:', {
          code: disconnectError.code,
          message: disconnectError.message,
          details: disconnectError.details,
          hint: disconnectError.hint
        });
        throw disconnectError;
      }

      console.log('Disconnection result:', disconnectResult);

      if (disconnectResult && disconnectResult.success) {
        // Use functional update to ensure we're working with the latest state
        setDevices(prevDevices => {
          console.log('Removing device with ID:', id);
          const updatedDevices = prevDevices.filter(device => device.id !== id);
          console.log('Updated devices count:', updatedDevices.length);
          return updatedDevices;
        });
        Alert.alert('Success', disconnectResult.message || 'Device disconnected successfully!');
      } else {
        console.error('Disconnect failed with result:', disconnectResult);
        throw new Error(disconnectResult?.message || 'Failed to disconnect device');
      }
      console.log('=== DISCONNECT DEBUG END ===');
    } catch (error: any) {
      console.error('Error disconnecting device:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Error', 'Failed to disconnect device: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setIsDisconnecting(false);
    }
  };

  const handleConfirmDisconnect = () => {
    console.log('User confirmed disconnect via custom dialog');
    if (deviceToDisconnect) {
      setShowConfirmDialog(false);
      performDisconnect(deviceToDisconnect.deviceId, deviceToDisconnect.id);
      setDeviceToDisconnect(null);
    }
  };

  const handleCancelDisconnect = () => {
    console.log('User cancelled disconnect via custom dialog');
    setShowConfirmDialog(false);
    setDeviceToDisconnect(null);
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.device_id}</Text>
        <Text style={styles.deviceDate}>Connected: {item.connected_at}</Text>
      </View>
      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={() => {
          console.log('Disconnect button pressed for device:', item.device_id);
          console.log('Item data:', item);
          disconnectDevice(item.device_id, item.id);
        }}
      >
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Devices</Text>
        <TouchableOpacity onPress={() => router.push('/add-device')} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
        ) : devices.length > 0 ? (
          <FlatList
            data={devices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshing={loading && !isDisconnecting}
            onRefresh={() => {
              console.log('FlatList onRefresh called');
              if (!isDisconnecting) {
                fetchDevices();
              } else {
                console.log('Skipping refresh due to disconnect operation');
              }
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices connected yet</Text>
            <TouchableOpacity
              style={styles.addDeviceButton}
              onPress={() => router.push('/add-device')}
            >
              <Text style={styles.addDeviceText}>Add a Device</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Custom Confirmation Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDisconnect}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Disconnect Device</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to disconnect this device?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelDisconnect}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmDisconnect}
              >
                <Text style={styles.confirmButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceDate: {
    fontSize: 12,
    color: '#999',
  },
  disconnectButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addDeviceButton: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
  },
  addDeviceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#4f46e5',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
}); 