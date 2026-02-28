import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/context/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

type AcademicResult = {
  id: number;
  score: string | null;
  max_score: string | null;
  subject: { id: number; name: string };
};

type AcademicTerm = {
  id: number;
  name: string;
  term_number: string;
  academic_year: string;
  is_active: boolean;
};

type ApiResponse = {
  results: AcademicResult[];
  terms: AcademicTerm[];
  analytics: {
    position: number | null;
    total_students: number | null;
    total_score: number;
    average: number;
    class_average: number | null;
  };
};

export default function ResultsScreen() {
  const { token } = useAuth();
  const [results, setResults] = useState<AcademicResult[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [analytics, setAnalytics] = useState<ApiResponse['analytics'] | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  const fetchResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/api/auth/results`);
      if (selectedTermId && selectedTermId > 0) {
        url.searchParams.set('academic_term_id', String(selectedTermId));
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        setResults(data.results || []);
        setTerms(data.terms || []);
        setAnalytics(data.analytics || null);
      } else {
        setError('Failed to load results. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedTermId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const renderResultItem = useCallback(
    ({ item }: { item: AcademicResult }) => (
      <ThemedView style={[styles.resultCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.resultRow}>
          <ThemedText style={styles.subjectName}>{item.subject.name}</ThemedText>
          <ThemedText style={[styles.scoreText, { color: primary }]}>
            {item.score ?? '—'} / {item.max_score ?? '100'}
          </ThemedText>
        </View>
      </ThemedView>
    ),
    [cardBg, border, primary]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primary} />
          <ThemedText style={styles.loadingText}>Loading results...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
        <ThemedText style={[styles.errorText]} accessibilityRole="alert">
          {error}
        </ThemedText>
        <Pressable
          onPress={() => fetchResults()}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry loading results"
        >
          <ThemedText style={{ color: primary }}>Tap to retry</ThemedText>
        </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
      {terms.length > 1 && (
        <ThemedView style={[styles.termSelector, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={styles.termLabel}>Term:</ThemedText>
          <FlatList
            horizontal
            data={terms}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedTermId(item.id)}
                style={[
                  styles.termChip,
                  selectedTermId === item.id && { backgroundColor: primary },
                ]}
              >
                <ThemedText
                  style={[
                    styles.termChipText,
                    selectedTermId === item.id && { color: '#fff' },
                  ]}
                >
                  {item.name} {item.academic_year}
                </ThemedText>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.termChips}
          />
        </ThemedView>
      )}

      {analytics && analytics.position && (
        <ThemedView style={[styles.analyticsCard, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedView style={styles.statsRow}>
            <ThemedView style={styles.statBox}>
              <ThemedText style={[styles.statValue, { color: primary }]}>
                {analytics.position}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Position</ThemedText>
              <ThemedText style={styles.statSubtext}>
                out of {analytics.total_students}
              </ThemedText>
            </ThemedView>
            <ThemedView style={[styles.divider, { backgroundColor: border }]} />
            <ThemedView style={styles.statBox}>
              <ThemedText style={[styles.statValue, { color: primary }]}>
                {analytics.average}%
              </ThemedText>
              <ThemedText style={styles.statLabel}>Your Average</ThemedText>
              <ThemedText style={styles.statSubtext}>
                Class: {analytics.class_average}%
              </ThemedText>
            </ThemedView>
            <ThemedView style={[styles.divider, { backgroundColor: border }]} />
            <ThemedView style={styles.statBox}>
              <ThemedText style={[styles.statValue, { color: primary }]}>
                {analytics.total_score}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Score</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.resultsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchResults(true)}
            tintColor={primary}
          />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No results found</ThemedText>
            <ThemedText style={styles.emptyHint}>
              Results will appear here once your teacher has entered them for this term.
            </ThemedText>
          </ThemedView>
        }
      />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  termSelector: {
    padding: 16,
    borderBottomWidth: 1,
  },
  termLabel: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  termChips: {
    gap: 8,
  },
  termChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  termChipText: {
    fontSize: 14,
  },
  resultsList: {
    padding: 16,
    gap: 12,
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  analyticsCard: {
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    opacity: 0.5,
  },
  divider: {
    width: 1,
    height: 50,
    marginHorizontal: 8,
  },
});
