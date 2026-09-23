import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ErrorText, PageHeader, StatusBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { ProductionSession } from '@/types/api';

export default function SessionsScreen() {
  const { user, request } = useAuth();
  const [sessions, setSessions] = useState<ProductionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const path =
        user.role === 'ADMIN'
          ? '/api/admin/production-sessions'
          : '/api/operator/production-sessions';
      setSessions(await request<ProductionSession[]>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oturumlar alınamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader
              eyebrow="Geçmiş"
              title="Üretim oturumları"
              subtitle={
                user?.role === 'ADMIN'
                  ? 'Tüm operatörlerin üretim geçmişi.'
                  : 'Yalnızca senin başlattığın üretim oturumları.'
              }
            />
            <ErrorText message={error} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <Card>
              <Text style={styles.emptyTitle}>Henüz oturum yok</Text>
              <Text style={styles.muted}>İlk üretim başladığında burada görünecek.</Text>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            disabled={user?.role === 'ADMIN'}
            onPress={() => router.push(`/session/${item.id}`)}>
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.productName}</Text>
                  <Text style={styles.muted}>
                    {item.machineName} · {item.machineCode}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.miniLabel}>OPERATÖR</Text>
                  <Text style={styles.value}>{item.operatorName}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.miniLabel}>ÜRETİM</Text>
                  <Text style={styles.value}>
                    {item.producedCount} / {item.targetCount}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  header: { gap: 16, marginBottom: 4 },
  card: { padding: 16 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  title: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  muted: { color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  miniLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  value: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 12 },
  emptyTitle: { color: colors.navy, fontSize: 18, fontWeight: '800' },
});
