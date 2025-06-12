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
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const slides = [
    {
      id: '1',
      title: t.infantBreathing,
      subtitle: t.stayAware,
      description: t.breathingDescription,
      icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
      color: '#A183BF',
    },
    {
      id: '2',
      title: t.positionAwareness,
      subtitle: t.saferSleeping,
      description: t.positionDescription,
      icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
      color: '#A183BF',
    },
    {
      id: '3',
      title: t.sleepPatternInsights,
      subtitle: t.forBothMomBaby,
      description: t.sleepDescription,
      icon: 'bed-outline' as keyof typeof Ionicons.glyphMap,
      color: '#A183BF',
    },
    {
      id: '4',
      title: t.personalizedCare,
      subtitle: t.trustedParenting,
      description: t.careDescription,
      icon: 'chatbox-ellipses-outline' as keyof typeof Ionicons.glyphMap,
      color: '#A183BF',
    },
  ];

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



  const renderSlide = ({ item }: { item: any }) => (
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
                <Text style={styles.getStartedText}>{t.getStarted}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: slides[currentIndex].color }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>{t.next}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>{t.skip}</Text>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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