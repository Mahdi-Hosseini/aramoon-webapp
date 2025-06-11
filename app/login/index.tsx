import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn, signInWithGoogle, isLoading, user } = useAuth()

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      router.replace('../home')
    }
  }, [user, router])

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    
    setError(null)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      // Navigation will happen automatically via the useEffect when user state updates
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
      // Navigation will happen via the useEffect when user state updates
    } catch (error: any) {
      setError(error.message)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.appName}>Aramoon</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Welcome back, please sign in to continue</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={styles.button}
              onPress={handleEmailSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#4f46e5',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#4f46e5',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    marginRight: 5,
  },
  signupLink: {
    color: '#4f46e5',
    fontWeight: '600',
  },
}) 