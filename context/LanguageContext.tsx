import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Translation interfaces
interface Translations {
  // Common
  back: string;
  cancel: string;
  loading: string;
  error: string;
  success: string;
  
  // Settings
  settings: string;
  language: string;
  notifications: string;
  darkMode: string;
  dataSync: string;
  privacy: string;
  about: string;
  enabled: string;
  disabled: string;
  automatic: string;
  manage: string;
  selectLanguage: string;
  
  // Home
  welcomeBack: string;
  babyCurrentStatus: string;
  respirationRate: string;
  breathing: string;
  posture: string;
  sleepStatus: string;
  lastUpdated: string;
  aiAssistant: string;
  getInstantHelp: string;
  yourDevices: string;
  manageConnectedDevices: string;
  noData: string;
  menu: string;
  addDevice: string;
  signOut: string;
  
  // Login
  login: string;
  welcomeBackLogin: string;
  emailAddress: string;
  password: string;
  loginWithGoogle: string;
  dontHaveAccount: string;
  signUp: string;
  pleaseEnterBoth: string;
  
  // Signup
  createAccount: string;
  signupToGetStarted: string;
  confirmPassword: string;
  passwordsDontMatch: string;
  passwordTooShort: string;
  registrationSuccessful: string;
  alreadyHaveAccount: string;
  signIn: string;
  
  // Onboarding
  infantBreathing: string;
  stayAware: string;
  breathingDescription: string;
  positionAwareness: string;
  saferSleeping: string;
  positionDescription: string;
  sleepPatternInsights: string;
  forBothMomBaby: string;
  sleepDescription: string;
  personalizedCare: string;
  trustedParenting: string;
  careDescription: string;
  next: string;
  skip: string;
  getStarted: string;
  
  // Devices
  myDevices: string;
  noDevicesConnected: string;
  addADevice: string;
  disconnect: string;
  disconnectDevice: string;
  disconnectConfirm: string;
  
  // Add Device
  connectYourDevice: string;
  enterDeviceId: string;
  enterDeviceIdPlaceholder: string;
  verifyDeviceId: string;
  connectDevice: string;
  deviceIdVerified: string;
  tryAgain: string;
  
  // Chat Bot
  conversations: string;
  newChat: string;
  noConversationsYet: string;
  typeYourMessage: string;
  send: string;
  botThinking: string;
  untitledChat: string;
}

// Translation data
const translations: Record<string, Translations> = {
  en: {
    // Common
    back: 'Back',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    dataSync: 'Data Sync',
    privacy: 'Privacy',
    about: 'About',
    enabled: 'Enabled',
    disabled: 'Disabled',
    automatic: 'Automatic',
    manage: 'Manage',
    selectLanguage: 'Select Language',
    
    // Home
    welcomeBack: 'Welcome Back!',
    babyCurrentStatus: "Baby's Current Status",
    respirationRate: 'Respiration Rate',
    breathing: 'Breathing',
    posture: 'Posture',
    sleepStatus: 'Sleep Status',
    lastUpdated: 'Last updated',
    aiAssistant: 'AI Assistant',
    getInstantHelp: 'Get instant help and guidance',
    yourDevices: 'Your Devices',
    manageConnectedDevices: 'Manage connected devices',
    noData: 'No data',
    menu: 'Menu',
    addDevice: 'Add Device',
    signOut: 'Sign Out',
    
    // Login
    login: 'Login',
    welcomeBackLogin: 'Welcome back, please login to continue',
    emailAddress: 'Email address',
    password: 'Password',
    loginWithGoogle: 'Login with Google',
    dontHaveAccount: "Don't have an account?",
    signUp: 'Sign up',
    pleaseEnterBoth: 'Please enter both email and password',
    
    // Signup
    createAccount: 'Create Account',
    signupToGetStarted: 'Sign up to get started with Aramoon',
    confirmPassword: 'Confirm Password',
    passwordsDontMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    registrationSuccessful: 'Registration successful! Please check your email to confirm your account.',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    
    // Onboarding
    infantBreathing: 'Infant Breathing Monitoring',
    stayAware: 'Stay Aware, Even While Asleep',
    breathingDescription: "Aramoon continuously tracks your baby's breathing via abdominal motion and alerts you in case of apnea or abnormal pauses - even when offline.",
    positionAwareness: 'Position Awareness',
    saferSleeping: 'Safer Sleeping Postures',
    positionDescription: "Using precision sensors, Aramoon monitors your baby's sleep position and warns you if they roll into unsafe poses like lying face down.",
    sleepPatternInsights: 'Sleep Pattern Insights',
    forBothMomBaby: 'For Both Mom and Baby',
    sleepDescription: "Understand your baby's sleep cycles and get personalized tips to help sync your rest time, promoting healthier sleep for both mother and child.",
    personalizedCare: 'Personalized Infant Care',
    trustedParenting: 'Your Trusted Parenting Assistant',
    careDescription: 'Aramoon offers intelligent, on-demand guidance for common early-life concerns, providing calm reassurance and helpful answers exactly when parents need them most.',
    next: 'Next',
    skip: 'Skip',
    getStarted: 'Get Started',
    
    // Devices
    myDevices: 'My Devices',
    noDevicesConnected: 'No devices connected yet',
    addADevice: 'Add a Device',
    disconnect: 'Disconnect',
    disconnectDevice: 'Disconnect Device',
    disconnectConfirm: 'Are you sure you want to disconnect this device?',
    
    // Add Device
    connectYourDevice: 'Connect Your Device',
    enterDeviceId: 'Enter the device ID that came with your purchase',
    enterDeviceIdPlaceholder: 'Enter Device ID (UUID format)',
    verifyDeviceId: 'Verify Device ID',
    connectDevice: 'Connect Device',
    deviceIdVerified: 'Device ID verified',
    tryAgain: 'Try Again',
    
    // Chat Bot
    conversations: 'Conversations',
    newChat: '+ New Chat',
    noConversationsYet: 'No conversations yet. Start a new chat!',
    typeYourMessage: 'Type your message...',
    send: 'Send',
    botThinking: 'Bot is thinking...',
    untitledChat: 'Untitled Chat',
  },
  
  ar: {
    // Common
    back: 'رجوع',
    cancel: 'إلغاء',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    
    // Settings
    settings: 'الإعدادات',
    language: 'اللغة',
    notifications: 'الإشعارات',
    darkMode: 'الوضع المظلم',
    dataSync: 'مزامنة البيانات',
    privacy: 'الخصوصية',
    about: 'حول',
    enabled: 'مفعل',
    disabled: 'معطل',
    automatic: 'تلقائي',
    manage: 'إدارة',
    selectLanguage: 'اختر اللغة',
    
    // Home
    welcomeBack: 'أهلاً بعودتك!',
    babyCurrentStatus: 'حالة الطفل الحالية',
    respirationRate: 'معدل التنفس',
    breathing: 'التنفس',
    posture: 'الوضعية',
    sleepStatus: 'حالة النوم',
    lastUpdated: 'آخر تحديث',
    aiAssistant: 'المساعد الذكي',
    getInstantHelp: 'احصل على مساعدة وتوجيه فوري',
    yourDevices: 'أجهزتك',
    manageConnectedDevices: 'إدارة الأجهزة المتصلة',
    noData: 'لا توجد بيانات',
    menu: 'القائمة',
    addDevice: 'إضافة جهاز',
    signOut: 'تسجيل خروج',
    
    // Login
    login: 'تسجيل دخول',
    welcomeBackLogin: 'أهلاً بعودتك، يرجى تسجيل الدخول للمتابعة',
    emailAddress: 'عنوان البريد الإلكتروني',
    password: 'كلمة المرور',
    loginWithGoogle: 'تسجيل الدخول بجوجل',
    dontHaveAccount: 'ليس لديك حساب؟',
    signUp: 'إنشاء حساب',
    pleaseEnterBoth: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    
    // Signup
    createAccount: 'إنشاء حساب',
    signupToGetStarted: 'سجل للبدء مع Aramoon',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordsDontMatch: 'كلمات المرور غير متطابقة',
    passwordTooShort: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    registrationSuccessful: 'تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك.',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل دخول',
    
    // Onboarding
    infantBreathing: 'مراقبة تنفس الرضيع',
    stayAware: 'ابق متيقظاً، حتى أثناء النوم',
    breathingDescription: 'يراقب Aramoon باستمرار تنفس طفلك عبر حركة البطن وينبهك في حالة انقطاع النفس أو التوقفات غير الطبيعية - حتى عند عدم الاتصال.',
    positionAwareness: 'الوعي بالوضعية',
    saferSleeping: 'وضعيات نوم أكثر أماناً',
    positionDescription: 'باستخدام أجهزة استشعار دقيقة، يراقب Aramoon وضعية نوم طفلك وينبهك إذا تدحرج إلى وضعيات غير آمنة مثل الاستلقاء على الوجه.',
    sleepPatternInsights: 'رؤى أنماط النوم',
    forBothMomBaby: 'للأم والطفل معاً',
    sleepDescription: 'فهم دورات نوم طفلك واحصل على نصائح مخصصة لمساعدتك على مزامنة وقت راحتك، مما يعزز النوم الصحي لكل من الأم والطفل.',
    personalizedCare: 'رعاية شخصية للرضيع',
    trustedParenting: 'مساعدك الموثوق في التربية',
    careDescription: 'يقدم Aramoon إرشادات ذكية عند الطلب للمخاوف الشائعة في الحياة المبكرة، مما يوفر طمأنينة هادئة وإجابات مفيدة تماماً عندما يحتاجها الآباء أكثر.',
    next: 'التالي',
    skip: 'تخطي',
    getStarted: 'ابدأ',
    
    // Devices
    myDevices: 'أجهزتي',
    noDevicesConnected: 'لا توجد أجهزة متصلة بعد',
    addADevice: 'إضافة جهاز',
    disconnect: 'قطع الاتصال',
    disconnectDevice: 'قطع اتصال الجهاز',
    disconnectConfirm: 'هل أنت متأكد من رغبتك في قطع اتصال هذا الجهاز؟',
    
    // Add Device
    connectYourDevice: 'اربط جهازك',
    enterDeviceId: 'أدخل معرف الجهاز الذي جاء مع عملية الشراء',
    enterDeviceIdPlaceholder: 'أدخل معرف الجهاز (تنسيق UUID)',
    verifyDeviceId: 'تحقق من معرف الجهاز',
    connectDevice: 'ربط الجهاز',
    deviceIdVerified: 'تم التحقق من معرف الجهاز',
    tryAgain: 'حاول مرة أخرى',
    
    // Chat Bot
    conversations: 'المحادثات',
    newChat: '+ محادثة جديدة',
    noConversationsYet: 'لا توجد محادثات بعد. ابدأ محادثة جديدة!',
    typeYourMessage: 'اكتب رسالتك...',
    send: 'إرسال',
    botThinking: 'الروبوت يفكر...',
    untitledChat: 'محادثة بلا عنوان',
  },
  
  fa: {
    // Common
    back: 'بازگشت',
    cancel: 'لغو',
    loading: 'در حال بارگذاری...',
    error: 'خطا',
    success: 'موفقیت',
    
    // Settings
    settings: 'تنظیمات',
    language: 'زبان',
    notifications: 'اعلان‌ها',
    darkMode: 'حالت تاریک',
    dataSync: 'همگام‌سازی داده',
    privacy: 'حریم خصوصی',
    about: 'درباره',
    enabled: 'فعال',
    disabled: 'غیرفعال',
    automatic: 'خودکار',
    manage: 'مدیریت',
    selectLanguage: 'انتخاب زبان',
    
    // Home
    welcomeBack: 'خوش آمدید!',
    babyCurrentStatus: 'وضعیت فعلی نوزاد',
    respirationRate: 'سرعت تنفس',
    breathing: 'تنفس',
    posture: 'حالت بدن',
    sleepStatus: 'وضعیت خواب',
    lastUpdated: 'آخرین به‌روزرسانی',
    aiAssistant: 'دستیار هوشمند',
    getInstantHelp: 'کمک و راهنمایی فوری دریافت کنید',
    yourDevices: 'دستگاه‌های شما',
    manageConnectedDevices: 'مدیریت دستگاه‌های متصل',
    noData: 'داده‌ای موجود نیست',
    menu: 'منو',
    addDevice: 'افزودن دستگاه',
    signOut: 'خروج',
    
    // Login
    login: 'ورود',
    welcomeBackLogin: 'خوش آمدید، لطفاً برای ادامه وارد شوید',
    emailAddress: 'آدرس ایمیل',
    password: 'رمز عبور',
    loginWithGoogle: 'ورود با گوگل',
    dontHaveAccount: 'حساب کاربری ندارید؟',
    signUp: 'ثبت نام',
    pleaseEnterBoth: 'لطفاً ایمیل و رمز عبور را وارد کنید',
    
    // Signup
    createAccount: 'ایجاد حساب',
    signupToGetStarted: 'برای شروع با Aramoon ثبت نام کنید',
    confirmPassword: 'تأیید رمز عبور',
    passwordsDontMatch: 'رمزهای عبور مطابقت ندارند',
    passwordTooShort: 'رمز عبور باید حداقل ۶ کاراکتر باشد',
    registrationSuccessful: 'ثبت نام موفقیت‌آمیز بود! لطفاً ایمیل خود را برای تأیید حساب بررسی کنید.',
    alreadyHaveAccount: 'قبلاً حساب دارید؟',
    signIn: 'ورود',
    
    // Onboarding
    infantBreathing: 'نظارت بر تنفس نوزاد',
    stayAware: 'آگاه باشید، حتی در خواب',
    breathingDescription: 'Aramoon به طور مداوم تنفس فرزند شما را از طریق حرکت شکم رصد می‌کند و در صورت آپنه یا توقف‌های غیرطبیعی شما را هشدار می‌دهد - حتی در حالت آفلاین.',
    positionAwareness: 'آگاهی از موقعیت',
    saferSleeping: 'حالت‌های خواب ایمن‌تر',
    positionDescription: 'با استفاده از حسگرهای دقیق، Aramoon موقعیت خواب فرزند شما را نظارت می‌کند و اگر به حالت‌های غیرایمن مثل خوابیدن به صورت رو به پایین برود، شما را هشدار می‌دهد.',
    sleepPatternInsights: 'بینش‌های الگوی خواب',
    forBothMomBaby: 'برای مادر و فرزند',
    sleepDescription: 'چرخه‌های خواب فرزند خود را درک کنید و نکات شخصی‌سازی شده برای همگام‌سازی زمان استراحت خود دریافت کنید که خواب سالم‌تری را برای مادر و فرزند ترویج می‌دهد.',
    personalizedCare: 'مراقبت شخصی‌سازی شده نوزاد',
    trustedParenting: 'دستیار قابل اعتماد والدین شما',
    careDescription: 'Aramoon راهنمایی هوشمند و بر اساس تقاضا برای نگرانی‌های رایج دوران اولیه زندگی ارائه می‌دهد و آرامش و پاسخ‌های مفید را دقیقاً زمانی که والدین بیشترین نیاز دارند فراهم می‌کند.',
    next: 'بعدی',
    skip: 'رد کردن',
    getStarted: 'شروع کنید',
    
    // Devices
    myDevices: 'دستگاه‌های من',
    noDevicesConnected: 'هنوز هیچ دستگاهی متصل نشده',
    addADevice: 'افزودن دستگاه',
    disconnect: 'قطع اتصال',
    disconnectDevice: 'قطع اتصال دستگاه',
    disconnectConfirm: 'آیا مطمئن هستید که می‌خواهید این دستگاه را قطع کنید؟',
    
    // Add Device
    connectYourDevice: 'دستگاه خود را متصل کنید',
    enterDeviceId: 'شناسه دستگاهی که با خرید شما آمده را وارد کنید',
    enterDeviceIdPlaceholder: 'شناسه دستگاه را وارد کنید (فرمت UUID)',
    verifyDeviceId: 'تأیید شناسه دستگاه',
    connectDevice: 'اتصال دستگاه',
    deviceIdVerified: 'شناسه دستگاه تأیید شد',
    tryAgain: 'دوباره تلاش کنید',
    
    // Chat Bot
    conversations: 'مکالمات',
    newChat: '+ گفتگوی جدید',
    noConversationsYet: 'هنوز گفتگویی وجود ندارد. گفتگوی جدیدی شروع کنید!',
    typeYourMessage: 'پیام خود را تایپ کنید...',
    send: 'ارسال',
    botThinking: 'ربات در حال فکر کردن...',
    untitledChat: 'گفتگوی بدون عنوان',
  },
};

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && translations[savedLanguage]) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = translations[currentLanguage] || translations.en;

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 