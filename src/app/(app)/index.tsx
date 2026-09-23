import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card, ErrorText, PageHeader, Screen, StatusBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { percentage } from '@/lib/format';
import type { Machine, Product, ProductionSession, User } from '@/types/api';

interface DashboardData {
  machines: number;
  products: number;
  sessions: ProductionSession[];
  users?: number;
}

export default function DashboardScreen() {
  const { user, request } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      if (user.role === 'ADMIN') {
        const [machines, products, sessions, users] = await Promise.all([
          request<Machine[]>('/api/admin/machines'),
          request<Product[]>('/api/admin/products'),
          request<ProductionSession[]>('/api/admin/production-sessions'),
          request<User[]>('/api/users'),
        ]);
        setData({
          machines: machines.length,
          products: products.length,
          sessions,
          users: users.length,
        });
      } else {
        const [machines, products, sessions] = await Promise.all([
          request<Machine[]>('/api/operator/machines'),
          request<Product[]>('/api/operator/products'),
          request<ProductionSession[]>('/api/operator/production-sessions'),
        ]);
        setData({ machines: machines.length, products: products.length, sessions });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bilgiler alınamadı.');
    }
  }, [request, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = data?.sessions.find((session) => session.status === 'RUNNING');
  const completed = data?.sessions.filter((session) => session.status === 'COMPLETED').length ?? 0;

  return (
    <Screen>
      <PageHeader
        eyebrow={user?.role === 'ADMIN' ? 'Yönetici paneli' : 'Operatör paneli'}
        title={`Merhaba, ${user?.fullName?.split(' ')[0] ?? ''}`}
        subtitle="Üretim kontrol sisteminin güncel durumunu buradan takip edebilirsin."
      />
      <ErrorText message={error} />

      <View style={styles.stats}>
        <StatCard label="Makine" value={data?.machines ?? '—'} />
        <StatCard label="Ürün" value={data?.products ?? '—'} />
        <StatCard
          label={user?.role === 'ADMIN' ? 'Kullanıcı' : 'Tamamlanan'}
          value={user?.role === 'ADMIN' ? (data?.users ?? '—') : completed}
        />
      </View>

      {user?.role === 'OPERATOR' ? (
        active ? (
          <Pressable onPress={() => router.push(`/session/${active.id}`)}>
            <Card style={styles.activeCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardEyebrow}>AKTİF ÜRETİM</Text>
                <StatusBadge status={active.status} />
              </View>
              <Text style={styles.cardTitle}>{active.productName}</Text>
              <Text style={styles.muted}>{active.machineName}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progress,
                    { width: `${percentage(active.producedCount, active.targetCount)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {active.producedCount} / {active.targetCount} ürün
              </Text>
            </Card>
          </Pressable>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.cardTitle}>Üretime hazır</Text>
            <Text style={styles.muted}>
              Makine ve ürünü seçerek yeni bir kontrol oturumu başlatabilirsin.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/production')}
              style={styles.linkButton}>
              <Text style={styles.linkText}>Üretim başlat →</Text>
            </Pressable>
          </Card>
        )
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Sistem özeti</Text>
          <Text style={styles.muted}>
            Toplam {data?.sessions.length ?? 0} üretim oturumu bulunuyor. Oturumlar
            ekranından tüm operatör hareketlerini görebilirsin.
          </Text>
        </Card>
      )}

      <Text style={styles.sectionTitle}>Son oturumlar</Text>
      {data?.sessions.slice(0, 3).map((session) => (
        <Pressable
          disabled={user?.role === 'ADMIN'}
          key={session.id}
          onPress={() => router.push(`/session/${session.id}`)}>
          <Card style={styles.sessionCard}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.sessionTitle}>{session.productName}</Text>
                <Text style={styles.muted}>
                  {session.machineCode} · {session.operatorName}
                </Text>
              </View>
              <StatusBadge status={session.status} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  activeCard: { borderColor: '#BFDBFE' },
  emptyCard: { gap: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: { flex: 1 },
  cardEyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  cardTitle: { color: colors.navy, fontSize: 20, fontWeight: '800', marginTop: 12 },
  sessionTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  muted: { color: colors.textMuted, lineHeight: 21 },
  progressTrack: {
    height: 10,
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 18,
  },
  progress: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  progressText: { color: colors.text, fontWeight: '700', marginTop: 8 },
  linkButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  linkText: { color: colors.primary, fontWeight: '800' },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: '800', marginTop: 4 },
  sessionCard: { padding: 15 },
});
