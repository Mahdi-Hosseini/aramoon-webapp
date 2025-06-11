import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(onboardingStatus === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  useEffect(() => {
    // Wait for both auth and onboarding status to be loaded
    if (isLoading || hasSeenOnboarding === null) return;

    // If user is authenticated, go to home
    if (user) {
      router.replace('./home');
      return;
    }

    // If user hasn't seen onboarding, show onboarding
    if (!hasSeenOnboarding) {
      router.replace('./onboarding');
      return;
    }

    // Otherwise, go to login
    router.replace('./login');
  }, [user, isLoading, hasSeenOnboarding, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manna</Text>
      <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
