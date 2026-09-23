import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, ErrorText, Screen, StatusBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { formatDate, percentage } from '@/lib/format';
import type { ProductionRecord, ProductionSession } from '@/types/api';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useAuth();
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [sessionData, recordData] = await Promise.all([
        request<ProductionSession>(`/api/operator/production-sessions/${id}`),
        request<ProductionRecord[]>(`/api/operator/production-sessions/${id}/records`),
      ]);
      setSession(sessionData);
      setRecords(recordData);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oturum detayı alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [id, request]);

  useEffect(() => {
    load();
    if (session?.status !== 'RUNNING') return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load, session?.status]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ErrorText message={error} />
      {session ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.product}>{session.productName}</Text>
                <Text style={styles.muted}>
                  {session.machineName} · {session.machineCode}
                </Text>
              </View>
              <StatusBadge status={session.status} />
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progress,
                  { width: `${percentage(session.producedCount, session.targetCount)}%` },
                ]}
              />
            </View>
            <Text style={styles.count}>
              {session.producedCount} / {session.targetCount} ürün
            </Text>
            <Text style={styles.date}>Başlangıç: {formatDate(session.startedAt)}</Text>
            <Text style={styles.date}>Bitiş: {formatDate(session.endedAt)}</Text>
          </Card>

          <Text style={styles.sectionTitle}>Ürün kayıtları ({records.length})</Text>
          {[...records].reverse().map((record) => (
            <Card key={record.id} style={styles.recordCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.recordTitle}>Ürün #{record.sequenceNumber}</Text>
                <Text style={styles.recordDate}>{formatDate(record.recordedAt)}</Text>
              </View>
              {record.values.map((value) => (
                <View key={value.propertyId} style={styles.valueRow}>
                  <Text style={styles.valueName}>{value.propertyName}</Text>
                  <Text style={styles.valueText}>{value.optionValue}</Text>
                </View>
              ))}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: { flex: 1 },
  product: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  muted: { color: colors.textMuted, marginTop: 5 },
  progressTrack: {
    height: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 20,
  },
  progress: { height: '100%', backgroundColor: colors.primary },
  count: { color: colors.navy, fontSize: 17, fontWeight: '800', marginTop: 9 },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: '900', marginTop: 4 },
  recordCard: { padding: 15 },
  recordTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  recordDate: { color: colors.textMuted, fontSize: 11 },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  valueName: { color: colors.textMuted },
  valueText: { color: colors.text, fontWeight: '800' },
});
