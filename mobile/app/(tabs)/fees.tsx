import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type FeeStructure = {
  id: number;
  name: string;
  description: string | null;
  amount: string;
  frequency: string;
  type: string;
};

type StudentFee = {
  id: number;
  amount: string;
  amount_paid: string;
  balance: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  term: string | null;
  academic_year: string | null;
  fee_structure: FeeStructure;
};

type FeeSummary = {
  total_fees: number;
  total_paid: number;
  total_balance: number;
};

export default function FeesScreen() {
  const { token } = useAuth();
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const success = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const warning = useThemeColor({}, 'warning');

  const fetchFees = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/fees`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFees(data.fees || []);
        setSummary(data.summary || null);
      } else {
        setError('Failed to load fees. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const getStatusColor = (status: StudentFee['status']) => {
    switch (status) {
      case 'paid':
        return success;
      case 'partial':
        return warning;
      case 'overdue':
        return errorColor;
      default:
        return primary;
    }
  };

  const getStatusLabel = (status: StudentFee['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatCurrency = (amount: string | number) => {
    return `KES ${parseFloat(String(amount)).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderFeeItem = useCallback(
    ({ item }: { item: StudentFee }) => (
      <ThemedView style={[styles.feeCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.feeHeader}>
          <ThemedText style={styles.feeName}>{item.fee_structure.name}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </ThemedText>
          </View>
        </View>

        {item.fee_structure.description && (
          <ThemedText style={styles.feeDescription}>{item.fee_structure.description}</ThemedText>
        )}

        <View style={styles.feeDetails}>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Amount:</ThemedText>
            <ThemedText style={styles.detailValue}>{formatCurrency(item.amount)}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Paid:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: success }]}>
              {formatCurrency(item.amount_paid)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Balance:</ThemedText>
            <ThemedText
              style={[
                styles.detailValue,
                styles.balanceText,
                { color: parseFloat(item.balance) > 0 ? errorColor : success },
              ]}
            >
              {formatCurrency(item.balance)}
            </ThemedText>
          </View>
        </View>

        {item.term && (
          <ThemedText style={styles.termInfo}>
            {item.term} {item.academic_year}
          </ThemedText>
        )}

        {item.due_date && (
          <ThemedText style={styles.dueDate}>
            Due: {new Date(item.due_date).toLocaleDateString()}
          </ThemedText>
        )}
      </ThemedView>
    ),
    [cardBg, border, success, errorColor, primary, warning]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primary} />
          <ThemedText style={styles.loadingText}>Loading fees...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={[styles.errorText, { color: errorColor }]} accessibilityRole="alert">
            {error}
          </ThemedText>
          <ThemedText
            style={[styles.retryText, { color: primary }]}
            onPress={() => fetchFees()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading fees"
          >
            Tap to retry
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {summary && (
          <ThemedView style={[styles.summaryCard, { backgroundColor: primary }]}>
            <ThemedText type="title" style={styles.summaryTitle}>
              Fee Summary
            </ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total Fees:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatCurrency(summary.total_fees)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total Paid:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatCurrency(summary.total_paid)}
              </ThemedText>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <ThemedText style={[styles.summaryLabel, styles.summaryBalanceLabel]}>
                Balance:
              </ThemedText>
              <ThemedText style={[styles.summaryValue, styles.summaryBalanceValue]}>
                {formatCurrency(summary.total_balance)}
              </ThemedText>
            </View>
          </ThemedView>
        )}

        <FlatList
          data={fees}
          renderItem={renderFeeItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.feesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFees(true)}
              tintColor={primary}
            />
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No fees found</ThemedText>
              <ThemedText style={styles.emptyHint}>
                Your fee records will appear here once they are added by the school administration.
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
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryCard: {
    padding: 24,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  summaryTitle: {
    color: '#fff',
    marginBottom: 16,
    fontSize: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryRowLast: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBalanceLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryBalanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  feesList: {
    padding: 16,
    gap: 12,
  },
  feeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 28,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feeDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 20,
  },
  feeDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 24,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  termInfo: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 12,
    fontStyle: 'italic',
  },
  dueDate: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
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
});
