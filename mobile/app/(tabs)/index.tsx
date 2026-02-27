import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const primary = useThemeColor({}, 'primary');
  const secondary = useThemeColor({}, 'secondary');
  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <ThemedView style={[styles.header, { backgroundColor: primary }]}>
          <Image
            source={require('@/assets/images/school-logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessible
            accessibilityLabel="Circle Spring School logo"
          />
          <ThemedText type="title" style={styles.schoolName}>
            Circle Spring School
          </ThemedText>
          <ThemedText style={styles.motto}>My Character, My Destiny</ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedView style={styles.welcomeCard}>
            <ThemedText style={[styles.welcomeLabel, { color: primary }]}>Welcome back,</ThemedText>
            <ThemedText type="title" style={styles.userName}>
              {user?.name}
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.quickActions, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: primary },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => router.push('/fees')}
              accessibilityRole="button"
              accessibilityLabel="View Fees"
              accessibilityHint="View your fee statement and payment history"
            >
              <ThemedText style={styles.actionButtonText}>View Fees</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: secondary },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="View Timetable"
              accessibilityHint="View your class schedule"
              disabled
            >
              <ThemedText style={styles.actionButtonText}>Timetable</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: accent },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="View Grades"
              accessibilityHint="View your academic grades"
              disabled
            >
              <ThemedText style={styles.actionButtonText}>Grades</ThemedText>
            </Pressable>
          </ThemedView>

          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityHint="Log out of your account"
          >
            <ThemedText style={[styles.logoutText, { color: primary }]}>Sign out</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
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
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  schoolName: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  motto: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    fontStyle: 'italic',
  },
  content: {
    padding: 24,
  },
  welcomeCard: {
    marginBottom: 24,
  },
  welcomeLabel: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  actionButton: {
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'center',
    borderRadius: 8,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
