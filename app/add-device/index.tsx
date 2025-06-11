import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

export default function AddDevicePage() {
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validated, setValidated] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('../login');
    }
  }, [user, router]);

  const validateDeviceId = async () => {
    if (!deviceId.trim()) {
      Alert.alert('Please enter a device ID');
      return;
    }

    setLoading(true);
    setValidated(false);
    
    try {
      console.log('Validating device ID:', deviceId);
      console.log('User ID:', user?.id);
      
      // First check if this device is already connected to the user
      const { data: existingConnection, error: connectionError } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user?.id)
        .eq('device_id', deviceId)
        .single();

      if (connectionError && connectionError.code !== 'PGRST116') {
        console.error('Error checking existing connection:', connectionError);
      }

      if (existingConnection) {
        Alert.alert('Already Connected', 'This device is already connected to your account.');
        setIsValid(false);
        setValidated(true);
        setLoading(false);
        return;
      }

      // Use the RPC function to validate the device ID
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_device_id', {
          device_id_text: deviceId
        });

      if (validationError) {
        console.error('Error validating device:', validationError);
        throw validationError;
      }

      console.log('Validation result:', validationResult);

      if (validationResult && validationResult.valid) {
        setDeviceName(validationResult.name || `Device (ID: ${deviceId.substring(0, 8)}...)`);
        setIsValid(true);
        setValidated(true);
      } else {
        Alert.alert('Error', validationResult?.message || 'Device not found. Please enter a valid device ID.');
        setIsValid(false);
        setValidated(true);
      }
    } catch (error: any) {
      console.error('Error validating device:', error);
      Alert.alert('Error', error.message || 'An error occurred while validating the device');
      setIsValid(false);
      setValidated(true);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async () => {
    if (!isValid || !deviceId.trim() || !user) {
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting to add device with ID:', deviceId);
      console.log('Current user ID:', user.id);
      
      // Try getting the user's auth session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session valid:', !!sessionData?.session);
      
      // Use the RPC function to connect the device
      const { data: connectionResult, error: connectionError } = await supabase
        .rpc('connect_device_to_user', {
          p_user_id: user.id,
          p_device_id: deviceId
        });

      if (connectionError) {
        console.error('Detailed connection error:', connectionError);
        throw connectionError;
      }

      console.log('Connection result:', connectionResult);

      if (connectionResult && connectionResult.success) {
        Alert.alert('Success', connectionResult.message || 'Device connected successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error(connectionResult?.message || 'Failed to connect device');
      }
    } catch (error: any) {
      console.error('Error adding device:', error);
      Alert.alert('Error', 'Failed to add device: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Device</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Connect Your Device</Text>
          <Text style={styles.subtitle}>
            Enter the device ID that came with your purchase
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Device ID (UUID format)"
            value={deviceId}
            onChangeText={setDeviceId}
            autoCapitalize="none"
            editable={!loading}
          />

          {validated && isValid && (
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceInfoText}>
                Device ID verified
              </Text>
            </View>
          )}

          {!validated && (
            <TouchableOpacity
              style={styles.button}
              onPress={validateDeviceId}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Device ID</Text>
              )}
            </TouchableOpacity>
          )}

          {validated && isValid && (
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={addDevice}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Connect Device</Text>
              )}
            </TouchableOpacity>
          )}

          {validated && !isValid && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setDeviceId('');
                setValidated(false);
              }}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
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
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 20,
  },
  deviceInfo: {
    backgroundColor: '#ecfdf5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  deviceInfoText: {
    fontSize: 16,
    color: '#065f46',
  },
  button: {
    backgroundColor: '#4f46e5',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#10b981',
  },
}); 