import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: 'Infant Breathing Monitoring',
      subtitle: 'Stay Aware, Even While Asleep',
      description: 'Aramoon continuously tracks your baby’s breathing via abdominal motion and alerts you in case of apnea or abnormal pauses — even when offline.',
      icon: 'heart-outline',
      color: '#A183BF',
    },
    {
      id: '2',
      title: 'Position Awareness',
      subtitle: 'Safer Sleeping Postures',
      description: 'Using precision sensors, Aramoon monitors your baby’s sleep position and warns you if they roll into unsafe poses like lying face down.',
      icon: 'person-outline',
      color: '#A183BF',
    },
    {
      id: '3',
      title: 'Sleep Pattern Insights',
      subtitle: 'For Both Mom and Baby',
      description: 'Understand your baby’s sleep cycles and get personalized tips to help sync your rest time, promoting healthier sleep for both mother and child.',
      icon: 'bed-outline',
      color: '#A183BF',
    },
    {
      id: '4',
      title: 'Personalized Infant Care',
      subtitle: 'Your Trusted Parenting Assistant',
      description: 'Aramoon offers intelligent, on-demand guidance for common early-life concerns, providing calm reassurance and helpful answers exactly when parents need them most.',
      icon: 'chatbox-ellipses-outline',
      color: '#A183BF',
    },
  ];
  

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    router.replace('/login');
  };

  const handleGetStarted = async () => {
    await markOnboardingComplete();
    router.replace('/login');
  };

  const markOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Error marking onboarding as complete:', error);
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentIndex(slideIndex);
    }
  };

  const onMomentumScrollEnd = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentIndex(slideIndex);
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={60} color="white" />
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            {
              backgroundColor: index === currentIndex ? slides[currentIndex].color : '#d1d5db',
              width: index === currentIndex ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: slides[currentIndex].color + '10' }]}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.id}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {renderPagination()}

        <View style={styles.footer}>
          {currentIndex === slides.length - 1 ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.getStartedButton, { backgroundColor: slides[currentIndex].color }]}
                onPress={handleGetStarted}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: slides[currentIndex].color }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 350,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nextButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  getStartedButton: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
}); 