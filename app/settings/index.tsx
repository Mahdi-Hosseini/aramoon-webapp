import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsPage() {
  const router = useRouter();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  ];

  const handleLanguageSelect = (languageCode: string) => {
    changeLanguage(languageCode);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(l => l.code === currentLanguage);
    return lang ? lang.nativeName : 'English';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Language Setting - Functional */}
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowLanguageModal(true)}
        >
          <Text style={styles.settingLabel}>{t.language}</Text>
          <Text style={styles.settingValue}>{getCurrentLanguageName()}</Text>
        </TouchableOpacity>

        {/* Dummy Settings - Inactive */}
        <TouchableOpacity style={[styles.settingItem, styles.inactiveItem]}>
          <Text style={[styles.settingLabel, styles.inactiveText]}>{t.notifications}</Text>
          <Text style={[styles.settingValue, styles.inactiveText]}>{t.enabled}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.inactiveItem]}>
          <Text style={[styles.settingLabel, styles.inactiveText]}>{t.darkMode}</Text>
          <Text style={[styles.settingValue, styles.inactiveText]}>{t.disabled}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.inactiveItem]}>
          <Text style={[styles.settingLabel, styles.inactiveText]}>{t.dataSync}</Text>
          <Text style={[styles.settingValue, styles.inactiveText]}>{t.automatic}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.inactiveItem]}>
          <Text style={[styles.settingLabel, styles.inactiveText]}>{t.privacy}</Text>
          <Text style={[styles.settingValue, styles.inactiveText]}>{t.manage}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.inactiveItem]}>
          <Text style={[styles.settingLabel, styles.inactiveText]}>{t.about}</Text>
          <Text style={[styles.settingValue, styles.inactiveText]}>v1.0.0</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  currentLanguage === language.code && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <Text style={[
                  styles.languageText,
                  currentLanguage === language.code && styles.selectedLanguageText
                ]}>
                  {language.nativeName}
                </Text>
                {currentLanguage === language.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A183BF10',
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
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#A183BF',
    fontWeight: '600',
    fontSize: 16,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveItem: {
    opacity: 0.6,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingValue: {
    fontSize: 14,
    color: '#A183BF',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedLanguage: {
    backgroundColor: '#A183BF20',
  },
  languageText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedLanguageText: {
    color: '#A183BF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#A183BF',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
}); 