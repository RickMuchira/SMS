import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  ScrollView,
  useColorScheme,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const textColor = useThemeColor({}, 'text');
  const inputBorder = useThemeColor({}, 'border');
  const inputBorderFocus = useThemeColor({}, 'secondary');
  const primary = useThemeColor({}, 'primary');
  const errorColor = colorScheme === 'dark' ? '#f87171' : '#b91c1c';

  function validateEmail(email: string): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required');
      return false;
    }
    if (!trimmed.includes('@')) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError(null);
    return true;
  }

  function validatePassword(pwd: string): boolean {
    const trimmed = pwd.trim();
    if (!trimmed) {
      setPasswordError('Password or guardian phone number is required');
      return false;
    }
    setPasswordError(null);
    return true;
  }

  async function handleLogin() {
    const id = identifier.trim();
    const pwd = password.trim();

    const emailValid = validateEmail(id);
    const passwordValid = validatePassword(pwd);

    if (!emailValid || !passwordValid) {
      return;
    }

    setError(null);
    try {
      await login(id, pwd);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <ThemedView style={styles.form}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in as a student, driver, or transport assistant
            </ThemedText>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Account Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: emailError ? errorColor : inputBorder, color: textColor },
                ]}
                placeholder="e.g. john.doe@myschool.com"
                placeholderTextColor="#9BA1A6"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  setError(null);
                  setEmailError(null);
                }}
                onBlur={() => {
                  if (identifier.trim()) {
                    validateEmail(identifier);
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                editable={!isLoading}
                returnKeyType="next"
                accessibilityLabel="Account email input"
                accessibilityHint="Enter the account email address"
              />
              {emailError && (
                <ThemedText style={[styles.fieldError, { color: errorColor }]}>
                  {emailError}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password or Guardian Phone</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: passwordError ? errorColor : inputBorder, color: textColor },
                ]}
                placeholder="e.g. 0712345678"
                placeholderTextColor="#9BA1A6"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                  setPasswordError(null);
                }}
                onBlur={() => {
                  if (password.trim()) {
                    validatePassword(password);
                  }
                }}
                secureTextEntry
                keyboardType="number-pad"
                textContentType="password"
                autoComplete="password"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password or guardian phone input"
                accessibilityHint="Enter the account password or any guardian phone number"
              />
              {passwordError && (
                <ThemedText style={[styles.fieldError, { color: errorColor }]}>
                  {passwordError}
                </ThemedText>
              )}
              <ThemedText style={styles.hint}>
                Students use a guardian phone number. Drivers and assistants use their normal account password.
              </ThemedText>
            </ThemedView>

            {error && (
              <ThemedView style={[styles.errorBox, { backgroundColor: colorScheme === 'dark' ? '#7f1d1d' : '#fee2e2' }]}>
                <ThemedText style={[styles.error, { color: errorColor }]} accessibilityRole="alert">
                  {error}
                </ThemedText>
              </ThemedView>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in button"
              accessibilityHint="Tap to sign in with your credentials"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign in</ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  form: {
    gap: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    opacity: 0.65,
    marginTop: 2,
  },
  fieldError: {
    fontSize: 13,
    marginTop: 2,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 52,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
