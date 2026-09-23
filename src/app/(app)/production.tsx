import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Card, ErrorText, PageHeader, PrimaryButton, Screen, StatusBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { formatDate, percentage } from '@/lib/format';
import type { Machine, Product, ProductionRecord, ProductionSession } from '@/types/api';

export default function ProductionScreen() {
  const { request } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [target, setTarget] = useState('100');
  const [active, setActive] = useState<ProductionSession | null>(null);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compatibleProducts = useMemo(() => products.filter(product =>
    !machineId || !product.machineIds?.length || product.machineIds.includes(machineId)
  ), [products, machineId]);
  const product = products.find(item => item.id === productId);

  useEffect(() => {
    if (!compatibleProducts.some(item => item.id === productId)) setProductId(compatibleProducts[0]?.id ?? null);
  }, [compatibleProducts, productId]);

  const load = useCallback(async () => {
    try {
      const [machineData, productData, sessions] = await Promise.all([
        request<Machine[]>('/api/operator/machines'),
        request<Product[]>('/api/operator/products'),
        request<ProductionSession[]>('/api/operator/production-sessions'),
      ]);
      const running = sessions.find(session => session.status === 'RUNNING') ?? null;
      setMachines(machineData); setProducts(productData); setActive(running);
      setMachineId(current => current ?? machineData[0]?.id ?? null);
      setProductId(current => current ?? productData[0]?.id ?? null);
      setRecords(running ? await request<ProductionRecord[]>(`/api/operator/production-sessions/${running.id}/records`) : []);
      setLastSync(new Date()); setError(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Üretim bilgileri alınamadı.'); }
  }, [request]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sync = useCallback(async (sessionId: number, manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [session, recordData] = await Promise.all([
        request<ProductionSession>(`/api/operator/production-sessions/${sessionId}`),
        request<ProductionRecord[]>(`/api/operator/production-sessions/${sessionId}/records`),
      ]);
      setRecords(recordData); setLastSync(new Date()); setError(null);
      if (session.status === 'RUNNING') setActive(session);
      else {
        setActive(null);
        await Notifications.scheduleNotificationAsync({ content: { title: 'Parti kontrolü tamamlandı', body: `${session.productName}: ${session.producedCount} ürün kontrol edildi.` }, trigger: null });
      }
    } catch (e) { if (manual) setError(e instanceof ApiError ? e.message : 'Canlı veriler yenilenemedi.'); }
    finally { setRefreshing(false); }
  }, [request]);

  useEffect(() => {
    if (!active?.id) return;
    const timer = setInterval(() => void sync(active.id), 2000);
    return () => clearInterval(timer);
  }, [active?.id, sync]);

  const start = async () => {
    const count = Number(target);
    if (!machineId || !productId || !Number.isInteger(count) || count < 1 || count > 100) {
      setError('Makine, ürün ve 1–100 arasında geçerli hedef seçmelisin.'); return;
    }
    setLoading(true); setError(null);
    try {
      const session = await request<ProductionSession>('/api/operator/production-sessions', { method: 'POST', body: JSON.stringify({ machineId, productId, targetCount: count }) });
      setActive(session); setRecords([]); setLastSync(new Date());
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Üretim başlatılamadı.'); }
    finally { setLoading(false); }
  };

  const performStop = async () => {
    if (!active) return;
    setLoading(true);
    try { await request(`/api/operator/production-sessions/${active.id}/stop`, { method: 'POST' }); setActive(null); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Üretim durdurulamadı.'); }
    finally { setLoading(false); }
  };
  const stop = () => {
    if (Platform.OS === 'web') { if (window.confirm('Üretim oturumu durdurulsun mu?')) void performStop(); return; }
    Alert.alert('Üretimi durdur', 'Üretim oturumu durdurulsun mu?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Durdur', style: 'destructive', onPress: () => void performStop() }]);
  };

  if (active) {
    const remaining = Math.max(0, active.targetCount - active.producedCount);
    return <Screen>
      <PageHeader eyebrow="Canlı üretim" title={active.productName} subtitle={`${active.machineName} · Oturum #${active.id}`} />
      <ErrorText message={error} />
      <Card style={styles.liveCard}>
        <View style={styles.between}><StatusBadge status={active.status} /><View style={styles.liveRow}><View style={styles.dot} /><Text style={styles.live}>CANLI</Text></View></View>
        <View style={styles.countRow}><Text style={styles.bigCount}>{active.producedCount}</Text><Text style={styles.target}> / {active.targetCount} ürün</Text><Text style={styles.percent}>%{percentage(active.producedCount, active.targetCount)}</Text></View>
        <View style={styles.track}><View style={[styles.progress, { width: `${percentage(active.producedCount, active.targetCount)}%` }]} /></View>
        <View style={styles.metrics}><Metric label="Kalan" value={remaining} /><Metric label="Tahmini süre" value={`${remaining * 10} sn`} /><Metric label="Son senkron" value={lastSync?.toLocaleTimeString('tr-TR') ?? '—'} /></View>
        <View style={styles.actions}><View style={styles.flex}><PrimaryButton title="Yenile" tone="neutral" onPress={() => void sync(active.id, true)} loading={refreshing} /></View><View style={styles.flex}><PrimaryButton title="Durdur" tone="danger" onPress={stop} loading={loading} /></View></View>
      </Card>
      <View style={styles.between}><View><Text style={styles.sectionTitle}>Üretilen ürünler</Text><Text style={styles.subtle}>Yeni ürünler otomatik olarak listenin başına gelir.</Text></View><Text style={styles.total}>{records.length}</Text></View>
      {records.length === 0 ? <Card style={styles.empty}><Text style={styles.emptyIcon}>◌</Text><Text style={styles.emptyTitle}>İlk ürün bekleniyor</Text><Text style={styles.centerMuted}>Simülatör yaklaşık 10 saniye içinde ilk kaydı gönderecek.</Text></Card> : records.slice().reverse().map((record, index) => <RecordCard key={record.id} record={record} newest={index === 0} />)}
    </Screen>;
  }

  return <Screen>
    <PageHeader eyebrow="Yeni kontrol" title="Üretim başlat" subtitle="Üretim hattını üç kısa adımda hazırlayın." />
    <ErrorText message={error} />
    <Step number="1" title="Makine seç" detail="Üretimin yapılacağı aktif hat" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.choices}>{machines.map(item => <Choice key={item.id} title={item.name} subtitle={item.code} selected={machineId === item.id} onPress={() => setMachineId(item.id)} />)}</View></ScrollView>
    <Step number="2" title="Ürün seç" detail={`${compatibleProducts.length} uygun ürün`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.choices}>{compatibleProducts.map(item => <Choice key={item.id} title={item.name} subtitle={item.code} selected={productId === item.id} onPress={() => setProductId(item.id)} />)}</View></ScrollView>
    {product && <Card><Text style={styles.cardTitle}>Kontrol planı</Text>{product.properties.map(property => <View key={property.id} style={styles.property}><Text style={styles.propertyName}>{property.name}</Text><Text style={styles.subtle}>{property.options.map(option => option.value).join(' · ')}</Text></View>)}</Card>}
    <Step number="3" title="Hedef adet" detail="Bir oturumda en fazla 100 ürün" />
    <View style={styles.quickRow}>{[10, 25, 50, 100].map(value => <Pressable key={value} onPress={() => setTarget(String(value))} style={[styles.quick, target === String(value) && styles.quickActive]}><Text style={[styles.quickText, target === String(value) && styles.quickTextActive]}>{value}</Text></Pressable>)}</View>
    <TextInput keyboardType="number-pad" maxLength={3} value={target} onChangeText={setTarget} style={styles.input} />
    <PrimaryButton title="Üretimi Başlat" onPress={start} loading={loading} disabled={!machineId || !productId} />
  </Screen>;
}

function RecordCard({ record, newest }: { record: ProductionRecord; newest: boolean }) { return <Card style={[styles.record, newest && styles.newRecord]}><View style={styles.between}><Text style={styles.sequence}>#{record.sequenceNumber}</Text><Text style={styles.recordTime}>{formatDate(record.recordedAt)}</Text>{newest && <Text style={styles.newText}>YENİ</Text>}</View><View style={styles.values}>{record.values.map(value => <View key={`${record.id}-${value.propertyId}`} style={styles.value}><Text style={styles.valueLabel}>{value.propertyName}</Text><Text style={styles.valueText}>{value.optionValue}</Text></View>)}</View></Card>; }
function Step({ number, title, detail }: { number: string; title: string; detail: string }) { return <View style={styles.step}><Text style={styles.stepNo}>{number}</Text><View><Text style={styles.label}>{title}</Text><Text style={styles.subtle}>{detail}</Text></View></View>; }
function Choice({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceTitle, selected && styles.white]}>{title}</Text><Text style={[styles.subtle, selected && styles.light]}>{subtitle}</Text>{selected && <Text style={styles.check}>✓</Text>}</Pressable>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, subtle: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, centerMuted: { color: colors.textMuted, textAlign: 'center' },
  liveCard: { gap: 15, borderColor: '#A5B4FC', backgroundColor: '#FAFAFF' }, liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }, live: { color: colors.success, fontWeight: '900', fontSize: 11 }, countRow: { flexDirection: 'row', alignItems: 'baseline' }, bigCount: { color: colors.navy, fontSize: 40, fontWeight: '900' }, target: { color: colors.textMuted, fontWeight: '700' }, percent: { color: colors.primary, fontSize: 18, fontWeight: '900', marginLeft: 'auto' }, track: { height: 12, backgroundColor: '#E0E7FF', borderRadius: 99, overflow: 'hidden' }, progress: { height: '100%', backgroundColor: colors.primary }, metrics: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, metricValue: { color: colors.navy, fontWeight: '900', fontSize: 12 }, metricLabel: { color: colors.textMuted, fontSize: 9, marginTop: 3 }, actions: { flexDirection: 'row', gap: 10 },
  sectionTitle: { color: colors.navy, fontSize: 19, fontWeight: '900' }, total: { color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, fontWeight: '900' }, empty: { alignItems: 'center', gap: 7, paddingVertical: 28 }, emptyIcon: { fontSize: 38, color: colors.primary }, emptyTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' }, record: { padding: 14, gap: 12 }, newRecord: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }, sequence: { color: '#fff', backgroundColor: colors.navy, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, fontWeight: '900' }, recordTime: { color: colors.textMuted, fontSize: 11, flex: 1 }, newText: { color: colors.success, fontSize: 10, fontWeight: '900' }, values: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, value: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 }, valueLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' }, valueText: { color: colors.navy, fontSize: 13, fontWeight: '800', marginTop: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 }, stepNo: { color: '#fff', backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900' }, label: { color: colors.navy, fontSize: 16, fontWeight: '900' }, choices: { flexDirection: 'row', gap: 10, paddingRight: 20 }, choice: { minWidth: 150, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', padding: 16, borderRadius: 18 }, choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, choiceTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, white: { color: '#fff' }, light: { color: '#E0E7FF' }, check: { position: 'absolute', right: 12, top: 10, color: '#fff', fontWeight: '900' }, cardTitle: { color: colors.navy, fontSize: 16, fontWeight: '900' }, property: { marginTop: 12 }, propertyName: { color: colors.primary, fontWeight: '800' }, quickRow: { flexDirection: 'row', gap: 8 }, quick: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center' }, quickActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, quickText: { color: colors.textMuted, fontWeight: '800' }, quickTextActive: { color: colors.primary }, input: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#fff', color: colors.navy, fontSize: 20, fontWeight: '800' },
});
