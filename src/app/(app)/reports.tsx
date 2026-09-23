import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Card, ErrorText, PageHeader, PrimaryButton, Screen, StatusBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { formatDate, percentage } from '@/lib/format';
import { buildProductionReportHtml } from '@/lib/reportPdf';
import { downloadPdfOnWeb } from '@/lib/webPdf';
import type { Machine, Product, ProductionReport, ProductionSession, User } from '@/types/api';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL';

export default function ReportsScreen() {
  const { user, request } = useAuth();
  const [report, setReport] = useState<ProductionReport | null>(null);
  const [allSessions, setAllSessions] = useState<ProductionSession[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>('WEEK');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const prefix = user?.role === 'ADMIN' ? '/api/admin' : '/api/operator';
  const availableSessions = useMemo(() => allSessions.filter(session =>
    (!operatorId || session.operatorId === operatorId) &&
    (!machineId || session.machineId === machineId) &&
    (!productId || session.productId === productId)
  ), [allSessions, operatorId, machineId, productId]);
  const selectedFilterLabels = useMemo(() => [
    periodLabel(period),
    user?.role === 'ADMIN' && operatorId ? operators.find(item => item.id === operatorId)?.fullName : null,
    machineId ? machines.find(item => item.id === machineId)?.name : null,
    productId ? products.find(item => item.id === productId)?.name : null,
    sessionId ? `Oturum #${sessionId}` : null,
  ].filter((item): item is string => Boolean(item)), [machineId, machines, operatorId, operators, period, productId, products, sessionId, user?.role]);

  const periodRange = useCallback(() => {
    if (period === 'ALL') return {};
    if (period === 'CUSTOM') return { from: customFrom || undefined, to: customTo || undefined };
    const now = new Date();
    const end = isoDate(now);
    const start = new Date(now);
    if (period === 'WEEK') start.setDate(now.getDate() - 6);
    if (period === 'MONTH') start.setDate(now.getDate() - 29);
    return { from: isoDate(start), to: end };
  }, [customFrom, customTo, period]);

  const buildQuery = useCallback((includeFilters = true) => {
    const query = new URLSearchParams();
    if (includeFilters) {
      if (user?.role === 'ADMIN' && operatorId) query.set('operatorId', String(operatorId));
      if (machineId) query.set('machineId', String(machineId));
      if (productId) query.set('productId', String(productId));
      if (sessionId) query.set('sessionId', String(sessionId));
      const range = periodRange();
      if (range.from) query.set('from', range.from);
      if (range.to) query.set('to', range.to);
    }
    return query.toString();
  }, [machineId, operatorId, periodRange, productId, sessionId, user?.role]);

  const loadReferences = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const requests: Promise<unknown>[] = [
        request<Machine[]>(`${prefix}/machines`), request<Product[]>(`${prefix}/products`),
        request<ProductionReport>(`${prefix}/production-sessions/report`),
      ];
      if (user.role === 'ADMIN') requests.push(request<User[]>('/api/users'));
      const [machineData, productData, fullReport, userData] = await Promise.all(requests) as [Machine[], Product[], ProductionReport, User[]?];
      setMachines(machineData); setProducts(productData); setAllSessions(fullReport.sessions);
      setOperators((userData ?? []).filter(item => item.role === 'OPERATOR'));
      const filtered = await request<ProductionReport>(`${prefix}/production-sessions/report?${buildQuery(true)}`);
      setReport(filtered); setError(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Rapor bilgileri alınamadı.'); }
    finally { setLoading(false); }
  }, [buildQuery, prefix, request, user]);

  useFocusEffect(useCallback(() => { void loadReferences(); }, [loadReferences]));

  const apply = async () => {
    if (period === 'CUSTOM' && (!/^\d{4}-\d{2}-\d{2}$/.test(customFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(customTo))) {
      setError('Özel tarih aralığını YYYY-AA-GG biçiminde girin.'); return;
    }
    setLoading(true);
    try { setReport(await request<ProductionReport>(`${prefix}/production-sessions/report?${buildQuery(true)}`)); setError(null); setFiltersOpen(false); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Rapor hazırlanamadı.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setOperatorId(null); setMachineId(null); setProductId(null); setSessionId(null); setPeriod('WEEK'); setCustomFrom(''); setCustomTo(''); };

  const mutateSession = async (session: ProductionSession, action: 'archive' | 'delete') => {
    try {
      await request(`/api/admin/production-sessions/${session.id}${action === 'archive' ? '/archive' : ''}`, { method: action === 'archive' ? 'PATCH' : 'DELETE' });
      if (sessionId === session.id) setSessionId(null);
      await loadReferences();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Oturum işlemi tamamlanamadı.'); }
  };
  const confirmMutation = (session: ProductionSession, action: 'archive' | 'delete') => {
    const message = action === 'archive' ? `#${session.id} numaralı oturum raporlardan arşivlensin mi?` : `#${session.id} numaralı oturum ve tüm üretim kayıtları kalıcı silinsin mi? Bu işlem geri alınamaz.`;
    if (Platform.OS === 'web') { if (window.confirm(message)) void mutateSession(session, action); return; }
    Alert.alert(action === 'archive' ? 'Oturumu arşivle' : 'Kalıcı silme', message, [{ text: 'Vazgeç', style: 'cancel' }, { text: action === 'archive' ? 'Arşivle' : 'Kalıcı sil', style: 'destructive', onPress: () => void mutateSession(session, action) }]);
  };

  const sharePdf = async () => {
    if (!report) return;
    const criteria = [operators.find(x => x.id === operatorId)?.fullName, machines.find(x => x.id === machineId)?.name, products.find(x => x.id === productId)?.name, sessionId ? `Oturum #${sessionId}` : null, periodLabel(period)].filter(Boolean).join(' · ');
    try {
      const html = buildProductionReportHtml({ report, criteria });
      if (Platform.OS === 'web') {
        await downloadPdfOnWeb(html, reportFileName());
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Raporu paylaş' });
    } catch { setError(Platform.OS === 'web' ? 'PDF oluşturulamadı veya indirilemedi.' : 'PDF oluşturulamadı veya paylaşım açılamadı.'); }
  };

  return <Screen>
    <PageHeader eyebrow="Rapor merkezi" title="Üretim analizleri" subtitle="Operatör, makine, ürün, tekil oturum ve dönem kırılımlarını birlikte kullanın." />
    <ErrorText message={error} />
    <Card style={styles.filterCard}>
      <Pressable onPress={() => setFiltersOpen(value => !value)} style={styles.filterHeader}>
        <View style={styles.flex}><Text style={styles.filterEyebrow}>RAPOR FİLTRELERİ</Text><Text style={styles.filterHeaderTitle}>{filtersOpen ? 'Kriterleri belirleyin' : 'Uygulanan kriterler'}</Text></View>
        <View style={styles.filterToggle}><Text style={styles.filterToggleText}>{filtersOpen ? 'Daralt' : 'Düzenle'}</Text><Text style={styles.chevron}>{filtersOpen ? '⌃' : '⌄'}</Text></View>
      </Pressable>
      <View style={styles.selectedSummary}>{selectedFilterLabels.map((label, index) => <View key={`${label}-${index}`} style={styles.summaryChip}><Text style={styles.summaryChipText}>{label}</Text></View>)}</View>
      {filtersOpen && <View style={styles.filterBody}>
        <FilterTitle number="1" title="Tarih aralığı" hint="Raporun kapsayacağı dönemi seçin" />
        <View style={styles.chips}>{(['TODAY', 'WEEK', 'MONTH', 'ALL', 'CUSTOM'] as Period[]).map(value => <Chip key={value} label={periodLabel(value)} selected={period === value} onPress={() => setPeriod(value)} />)}</View>
        {period === 'CUSTOM' && <View style={styles.dateRow}><TextInput value={customFrom} onChangeText={setCustomFrom} placeholder="Başlangıç · 2026-08-01" style={styles.dateInput} /><TextInput value={customTo} onChangeText={setCustomTo} placeholder="Bitiş · 2026-08-31" style={styles.dateInput} /></View>}
        <View style={styles.divider} />
        {user?.role === 'ADMIN' && <><FilterTitle number="2" title="Operatör" hint="Belirli bir çalışanı inceleyin" /><HorizontalOptions><Chip label="Tüm operatörler" selected={!operatorId} onPress={() => { setOperatorId(null); setSessionId(null); }} />{operators.map(item => <Chip key={item.id} label={item.fullName} selected={operatorId === item.id} onPress={() => { setOperatorId(item.id); setSessionId(null); }} />)}</HorizontalOptions></>}
        <FilterTitle number={user?.role === 'ADMIN' ? '3' : '2'} title="Makine" hint="Üretim hattını daraltın" />
        <HorizontalOptions><Chip label="Tüm makineler" selected={!machineId} onPress={() => { setMachineId(null); setSessionId(null); }} />{machines.map(item => <Chip key={item.id} label={item.name} selected={machineId === item.id} onPress={() => { setMachineId(item.id); setSessionId(null); }} />)}</HorizontalOptions>
        <FilterTitle number={user?.role === 'ADMIN' ? '4' : '3'} title="Ürün" hint="Ürün bazında sonuç alın" />
        <HorizontalOptions><Chip label="Tüm ürünler" selected={!productId} onPress={() => { setProductId(null); setSessionId(null); }} />{products.map(item => <Chip key={item.id} label={item.name} selected={productId === item.id} onPress={() => { setProductId(item.id); setSessionId(null); }} />)}</HorizontalOptions>
        <FilterTitle number={user?.role === 'ADMIN' ? '5' : '4'} title="Üretim oturumu" hint={`${availableSessions.length} uygun oturum`} />
        <HorizontalOptions><Chip label="Tüm oturumlar" selected={!sessionId} onPress={() => setSessionId(null)} />{availableSessions.map(session => <Chip key={session.id} label={`#${session.id} · ${new Date(session.startedAt).toLocaleDateString('tr-TR')} · ${session.productName}`} selected={sessionId === session.id} onPress={() => setSessionId(session.id)} />)}</HorizontalOptions>
        <View style={styles.actionRow}><View style={styles.flex}><PrimaryButton title="Filtreleri Temizle" tone="neutral" onPress={reset} /></View><View style={styles.flex}><PrimaryButton title="Sonuçları Göster" onPress={apply} loading={loading} /></View></View>
      </View>}
    </Card>
    <View style={styles.stats}><Metric label="Oturum" value={report?.sessionCount ?? 0} /><Metric label="Üretilen" value={report?.totalProduced ?? 0} /><Metric label="Tamamlanma" value={`%${report?.completionRate ?? 0}`} /></View>
    <Card><Text style={styles.cardTitle}>Ürün dağılımı</Text>{Object.entries(report?.byProduct ?? {}).map(([name, count]) => <Bar key={name} label={name} count={count} max={report?.totalProduced || 1} />)}</Card>
    <Card><Text style={styles.cardTitle}>Makine dağılımı</Text>{Object.entries(report?.byMachine ?? {}).map(([name, count]) => <Bar key={name} label={name} count={count} max={report?.totalProduced || 1} />)}</Card>
    <View style={styles.headingRow}><Text style={styles.cardTitle}>Oturum detayları</Text><Text style={styles.resultCount}>{report?.sessions.length ?? 0} sonuç</Text></View>
    {report?.sessions.map(session => <SessionCard key={session.id} session={session} selected={sessionId === session.id} onSelect={() => { setSessionId(session.id); }} admin={user?.role === 'ADMIN'} onArchive={() => confirmMutation(session, 'archive')} onDelete={() => confirmMutation(session, 'delete')} />)}
    {!report?.sessions.length && <Card><Text style={styles.empty}>Seçilen kriterlerde üretim oturumu bulunamadı.</Text></Card>}
    <PrimaryButton title={Platform.OS === 'web' ? 'Bu Raporu PDF Olarak İndir' : 'Bu Raporu PDF Olarak Paylaş'} tone="neutral" onPress={sharePdf} disabled={!report?.sessionCount} />
  </Screen>;
}

function HorizontalOptions({ children }: { children: React.ReactNode }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.horizontal}>{children}</View></ScrollView>; }
function FilterTitle({ number, title, hint }: { number: string; title: string; hint?: string }) { return <View style={styles.filterTitle}><Text style={styles.filterNumber}>{number}</Text><View><Text style={styles.label}>{title}</Text>{hint && <Text style={styles.filterHint}>{hint}</Text>}</View></View>; }
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipActive]}><Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text></Pressable>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Bar({ label, count, max }: { label: string; count: number; max: number }) { return <View style={styles.barRow}><View style={styles.headingRow}><Text style={styles.barLabel}>{label}</Text><Text style={styles.barCount}>{count}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, count / max * 100)}%` }]} /></View></View>; }
function SessionCard({ session, selected, onSelect, admin, onArchive, onDelete }: { session: ProductionSession; selected: boolean; onSelect: () => void; admin?: boolean; onArchive: () => void; onDelete: () => void }) { return <Pressable onPress={onSelect}><Card style={[styles.sessionCard, selected && styles.selectedSession]}><View style={styles.headingRow}><View style={styles.flex}><Text style={styles.sessionTitle}>Oturum #{session.id} · {session.productName}</Text><Text style={styles.sessionMeta}>{session.operatorName} · {session.machineName}</Text></View><StatusBadge status={session.status} /></View><View style={styles.timeline}><TimePoint label="Başlangıç" value={session.startedAt} /><TimePoint label="Son ürün" value={session.lastRecordAt} /><TimePoint label="Bitiş" value={session.endedAt} /></View><View style={styles.sessionStats}><Text style={styles.sessionValue}>{session.producedCount}/{session.targetCount} ürün</Text><Text style={styles.sessionValue}>%{percentage(session.producedCount, session.targetCount)}</Text></View>{admin && session.status !== 'RUNNING' && <View style={styles.adminActions}><Pressable onPress={e => { e.stopPropagation(); onArchive(); }} style={styles.archiveButton}><Text style={styles.archiveText}>Arşivle</Text></Pressable><Pressable onPress={e => { e.stopPropagation(); onDelete(); }} style={styles.deleteButton}><Text style={styles.deleteText}>Kalıcı sil</Text></Pressable></View>}</Card></Pressable>; }
function TimePoint({ label, value }: { label: string; value?: string | null }) { return <View style={styles.timePoint}><Text style={styles.timeLabel}>{label}</Text><Text style={styles.timeValue}>{value ? formatDate(value) : '—'}</Text></View>; }
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const periodLabel = (period: Period) => ({ TODAY: 'Bugün', WEEK: 'Son 7 gün', MONTH: 'Son 30 gün', ALL: 'Tüm zamanlar', CUSTOM: 'Özel aralık' })[period];
const reportFileName = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `uretim-kontrol-raporu-${stamp}.pdf`;
};

const styles = StyleSheet.create({
  flex: { flex: 1 }, filterCard: { gap: 0, padding: 0, overflow: 'hidden', backgroundColor: '#FAFAFF', borderColor: '#C7D2FE' }, filterHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }, filterEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 9, letterSpacing: 1.1 }, filterHeaderTitle: { color: colors.navy, fontWeight: '900', fontSize: 17, marginTop: 3 }, filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, filterToggleText: { color: colors.primaryDark, fontWeight: '900', fontSize: 11 }, chevron: { color: colors.primary, fontSize: 15, fontWeight: '900' }, selectedSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 14 }, summaryChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C7D2FE', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, summaryChipText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800' }, filterBody: { gap: 13, padding: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E0E7FF' }, filterTitle: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 }, filterNumber: { color: '#fff', backgroundColor: colors.primary, width: 26, height: 26, textAlign: 'center', textAlignVertical: 'center', borderRadius: 9, fontWeight: '900', fontSize: 11 }, label: { color: colors.navy, fontWeight: '900', fontSize: 13 }, filterHint: { color: colors.textMuted, fontSize: 9, marginTop: 1 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, horizontal: { flexDirection: 'row', gap: 7, paddingRight: 16 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff' }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 }, chipTextActive: { color: '#fff' }, dateRow: { flexDirection: 'row', gap: 8 }, dateInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 11, backgroundColor: '#fff', color: colors.text }, actionRow: { flexDirection: 'row', gap: 9, marginTop: 7, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  stats: { flexDirection: 'row', gap: 9 }, metric: { flex: 1, backgroundColor: colors.primarySoft, padding: 13, borderRadius: 15 }, metricValue: { color: colors.primaryDark, fontWeight: '900', fontSize: 21 }, metricLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, cardTitle: { color: colors.navy, fontWeight: '900', fontSize: 17 }, barRow: { marginTop: 13 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, barLabel: { color: colors.text, fontWeight: '700', fontSize: 12 }, barCount: { color: colors.primary, fontWeight: '900' }, track: { height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 99, marginTop: 6, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.accent }, resultCount: { color: colors.textMuted, fontSize: 11 }, sessionCard: { padding: 14 }, selectedSession: { borderColor: colors.primary, backgroundColor: '#F5F3FF' }, sessionTitle: { color: colors.navy, fontWeight: '900', fontSize: 14 }, sessionMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, sessionStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 10 }, sessionValue: { color: colors.text, fontWeight: '800', fontSize: 11 }, sessionDate: { color: colors.textMuted, fontSize: 10, marginLeft: 'auto' }, timeline: { flexDirection: 'row', gap: 7, marginTop: 12 }, timePoint: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 8 }, timeLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }, timeValue: { color: colors.navy, fontSize: 9, fontWeight: '700', marginTop: 4 }, adminActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 12 }, archiveButton: { backgroundColor: colors.warningSoft, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }, archiveText: { color: colors.warning, fontSize: 11, fontWeight: '900' }, deleteButton: { backgroundColor: colors.dangerSoft, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }, deleteText: { color: colors.danger, fontSize: 11, fontWeight: '900' }, empty: { color: colors.textMuted, textAlign: 'center' },
});
