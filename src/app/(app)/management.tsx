import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, ErrorText, PageHeader, PrimaryButton, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import type { Machine, Product, Role, User } from '@/types/api';

type Section = 'machines' | 'products' | 'users';
type ModalType = Section | 'property';

export default function ManagementScreen() {
  const { request } = useAuth();
  const [section, setSection] = useState<Section>('machines');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [machineIds, setMachineIds] = useState<number[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [options, setOptions] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [machineData, productData, userData] = await Promise.all([
        request<Machine[]>('/api/admin/machines'),
        request<Product[]>('/api/admin/products'),
        request<User[]>('/api/users'),
      ]);
      setMachines(machineData); setProducts(productData); setUsers(userData); setError(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Yönetim bilgileri alınamadı.'); }
  }, [request]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const reset = () => {
    setCode(''); setName(''); setDescription(''); setUsername(''); setPassword('');
    setRole('OPERATOR'); setMachineIds([]); setSelectedProductId(null); setOptions(''); setModal(null);
  };

  const create = async () => {
    setLoading(true); setError(null);
    try {
      if (modal === 'property' && selectedProductId) {
        await request(`/api/admin/products/${selectedProductId}/properties`, { method: 'POST', body: JSON.stringify({ name, options: options.split(',').map(value => value.trim()).filter(Boolean) }) });
      } else if (modal === 'machines') {
        await request('/api/admin/machines', { method: 'POST', body: JSON.stringify({ code, name, description }) });
      } else if (modal === 'products') {
        await request('/api/admin/products', { method: 'POST', body: JSON.stringify({ code, name, description, machineIds }) });
      } else {
        await request('/api/users', { method: 'POST', body: JSON.stringify({ username, password, fullName: name, role }) });
      }
      reset(); await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Kayıt oluşturulamadı.'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (kind: Section, id: number, active: boolean) => {
    try {
      const path = kind === 'users' ? `/api/users/${id}/status` : `/api/admin/${kind}/${id}/status?active=${active}`;
      await request(path, kind === 'users'
        ? { method: 'PATCH', body: JSON.stringify({ enabled: active }) }
        : { method: 'PATCH' });
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'İşlem tamamlanamadı.'); }
  };

  const confirmStatus = (kind: Section, id: number, label: string, active: boolean) => {
    const message = `${label} ${active ? 'yeniden aktifleştirilsin' : 'pasife alınsın'} mı?`;
    if (Platform.OS === 'web') { if (window.confirm(message)) void updateStatus(kind, id, active); return; }
    Alert.alert(active ? 'Kaydı aktifleştir' : 'Kaydı pasife al', message,
      [{ text: 'Vazgeç', style: 'cancel' }, { text: active ? 'Aktifleştir' : 'Pasife al', style: active ? 'default' : 'destructive', onPress: () => void updateStatus(kind, id, active) }]);
  };

  const allItems = section === 'machines' ? machines : section === 'products' ? products : users;
  const items = allItems.filter(item => {
    const haystack = 'name' in item ? `${item.name} ${item.code}` : `${item.fullName} ${item.username}`;
    return haystack.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR').trim());
  });
  const activeCount = allItems.filter(item => 'active' in item ? item.active : item.enabled).length;
  return <Screen>
    <PageHeader eyebrow="Operasyon merkezi" title="Yönetim Paneli" subtitle="Tüm üretim tanımlarının sağlık ve durum kontrolü." />
    <View style={styles.stats}><MiniStat value={allItems.length} label="Toplam kayıt" tone="primary" /><MiniStat value={activeCount} label="Aktif" tone="success" /><MiniStat value={allItems.length - activeCount} label="Pasif" tone="warning" /></View>
    <View style={styles.segment}>
      {(['machines', 'products', 'users'] as Section[]).map((item) => <Pressable key={item} onPress={() => setSection(item)} style={[styles.segmentItem, section === item && styles.segmentActive]}>
        <Text style={[styles.segmentText, section === item && styles.segmentTextActive]}>{item === 'machines' ? 'Makineler' : item === 'products' ? 'Ürünler' : 'Kullanıcılar'}</Text>
      </Pressable>)}
    </View>
    <ErrorText message={error} />
    <View style={styles.toolbar}><TextInput value={search} onChangeText={setSearch} placeholder="Ara: ad, kod veya kullanıcı..." placeholderTextColor={colors.textMuted} style={styles.search} /><Pressable onPress={() => setModal(section)} style={styles.addButton}><Text style={styles.addButtonText}>＋ Yeni</Text></Pressable></View>
    {items.map((item) => <Card key={item.id} style={styles.itemCard}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: ('active' in item ? item.active : item.enabled) ? colors.primarySoft : colors.surfaceMuted }]}><Text style={styles.avatarText}>{('name' in item ? item.name : item.fullName).slice(0, 2).toUpperCase()}</Text></View>
        <View style={styles.flex}><View style={styles.titleRow}><Text style={styles.itemTitle}>{'name' in item ? item.name : item.fullName}</Text><View style={[styles.status, ('active' in item ? item.active : item.enabled) ? styles.statusActive : styles.statusPassive]}><Text style={[styles.statusText, ('active' in item ? item.active : item.enabled) ? styles.statusTextActive : styles.statusTextPassive]}>{('active' in item ? item.active : item.enabled) ? 'AKTİF' : 'PASİF'}</Text></View></View>
          <Text style={styles.meta}>{'code' in item ? item.code : `@${item.username} · ${item.role}`}</Text>
          {'description' in item && item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          {isProduct(item) && <><Text style={styles.meta}>Makineler: {(item.machineNames ?? []).join(' · ') || 'Atama yok'}</Text><Text style={styles.meta}>{item.properties.map(p => `${p.name}: ${p.options.map(o => o.value).join(', ')}`).join('  •  ') || 'Henüz kontrol özelliği yok'}</Text></>}
        </View>
        <View style={styles.cardActions}>{isProduct(item) && <Pressable onPress={() => { setSelectedProductId(item.id); setModal('property'); }} style={styles.smallAction}><Text style={styles.add}>＋ Özellik</Text></Pressable>}
        <Pressable onPress={() => confirmStatus(section, item.id, 'name' in item ? item.name : item.fullName, !('active' in item ? item.active : item.enabled))} style={[styles.smallAction, ('active' in item ? item.active : item.enabled) ? styles.passiveAction : styles.activeAction]}><Text style={('active' in item ? item.active : item.enabled) ? styles.danger : styles.activate}>{('active' in item ? item.active : item.enabled) ? 'Pasife al' : 'Aktifleştir'}</Text></Pressable></View>
      </View>
    </Card>)}
    {items.length === 0 && <Card style={styles.empty}><Text style={styles.emptyTitle}>Sonuç bulunamadı</Text><Text style={styles.meta}>Arama ifadesini değiştirin veya yeni kayıt oluşturun.</Text></Card>}
    <Modal visible={!!modal} transparent animationType="slide" onRequestClose={reset}>
      <View style={styles.overlay}><ScrollView contentContainerStyle={styles.sheet}>
        <Text style={styles.sheetTitle}>{modal === 'property' ? 'Kontrol özelliği ekle' : `Yeni ${modal === 'machines' ? 'makine' : modal === 'products' ? 'ürün' : 'kullanıcı'}`}</Text>
        {modal === 'property' ? <><Field label="Özellik adı (örn. Uzunluk)" value={name} onChangeText={setName} /><Field label="Seçenekler (virgülle ayırın)" value={options} onChangeText={setOptions} placeholder="Kısa, Orta, Uzun" /></> : modal === 'users' ? <>
          <Field label="Ad soyad" value={name} onChangeText={setName} />
          <Field label="Kullanıcı adı" value={username} onChangeText={setUsername} />
          <Field label="Parola (en az 8 karakter)" value={password} onChangeText={setPassword} secureTextEntry />
          <View style={styles.roleRow}>{(['OPERATOR', 'ADMIN'] as Role[]).map(value => <Pressable key={value} onPress={() => setRole(value)} style={[styles.chip, role === value && styles.chipActive]}><Text style={[styles.chipText, role === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
        </> : <>
          <Field label="Kod" value={code} onChangeText={setCode} />
          <Field label="Ad" value={name} onChangeText={setName} />
          <Field label="Açıklama" value={description} onChangeText={setDescription} />
          {modal === 'products' && <><Text style={styles.label}>Üretilebileceği makineler</Text><View style={styles.roleRow}>{machines.filter(m => m.active).map(machine => <Pressable key={machine.id} onPress={() => setMachineIds(ids => ids.includes(machine.id) ? ids.filter(id => id !== machine.id) : [...ids, machine.id])} style={[styles.chip, machineIds.includes(machine.id) && styles.chipActive]}><Text style={[styles.chipText, machineIds.includes(machine.id) && styles.chipTextActive]}>{machine.name}</Text></Pressable>)}</View></>}
        </>}
        <PrimaryButton title="Kaydet" onPress={create} loading={loading} />
        <PrimaryButton title="Vazgeç" tone="neutral" onPress={reset} />
      </ScrollView></View>
    </Modal>
  </Screen>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#94A3B8" /></View>;
}
function isProduct(item: Machine | Product | User): item is Product { return 'machineNames' in item; }
function MiniStat({ value, label, tone }: { value: number; label: string; tone: 'primary' | 'success' | 'warning' }) { return <View style={[styles.stat, styles[`stat_${tone}`]]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, padding: 4, borderRadius: 14 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 }, segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 }, segmentTextActive: { color: colors.primary },
  stats: { flexDirection: 'row', gap: 9 }, stat: { flex: 1, borderRadius: 16, padding: 13, borderWidth: 1 }, stat_primary: { backgroundColor: colors.primarySoft, borderColor: '#C7D2FE' }, stat_success: { backgroundColor: colors.successSoft, borderColor: '#BBF7D0' }, stat_warning: { backgroundColor: colors.warningSoft, borderColor: '#FDE68A' }, statValue: { color: colors.navy, fontSize: 24, fontWeight: '900' }, statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  toolbar: { flexDirection: 'row', gap: 10 }, search: { flex: 1, minHeight: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, color: colors.text }, addButton: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' }, addButtonText: { color: '#fff', fontWeight: '900' },
  itemCard: { padding: 15 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, flex: { flex: 1 }, avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '900' }, titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, itemTitle: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  status: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 }, statusActive: { backgroundColor: colors.successSoft }, statusPassive: { backgroundColor: colors.surfaceMuted }, statusText: { fontSize: 8, fontWeight: '900' }, statusTextActive: { color: colors.success }, statusTextPassive: { color: colors.textMuted }, description: { color: colors.text, fontSize: 12, marginTop: 6, lineHeight: 18 }, cardActions: { gap: 7, alignItems: 'flex-end' }, smallAction: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: colors.border }, passiveAction: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' }, activeAction: { backgroundColor: colors.successSoft, borderColor: '#BBF7D0' }, activate: { color: colors.success, fontWeight: '800', fontSize: 11 }, empty: { alignItems: 'center', paddingVertical: 30 }, emptyTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12 }, danger: { color: colors.danger, fontWeight: '800', fontSize: 12 }, add: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: '#0F172A99', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#fff', padding: 22, paddingBottom: 36, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 14 },
  sheetTitle: { color: colors.navy, fontWeight: '900', fontSize: 23 }, field: { gap: 7 }, label: { color: colors.text, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, color: colors.text, backgroundColor: '#F8FAFC' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 }, chipTextActive: { color: '#fff' },
});
