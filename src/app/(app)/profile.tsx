import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, PageHeader, PrimaryButton, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const performLogout = async () => {
  try {
    await logout();
  } finally {
    router.replace('/login');
  }
};

const confirmLogout = () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'Oturumunu kapatmak istiyor musun?',
    );

    if (confirmed) {
      void performLogout();
    }

    return;
  }

  Alert.alert(
    'Çıkış yap',
    'Oturumunu kapatmak istiyor musun?',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
      },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ],
  );
};

  return (
    <Screen>
      <PageHeader
        eyebrow="Hesabım"
        title="Profil"
        subtitle="Oturum ve bağlantı bilgilerin."
      />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName
              ?.split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <View style={styles.role}>
          <Text style={styles.roleText}>
            {user?.role === 'ADMIN' ? 'Yönetici' : 'Operatör'}
          </Text>
        </View>
      </Card>
      <Card>
        <Text style={styles.label}>Backend adresi</Text>
        <Text selectable style={styles.api}>{API_URL}</Text>
        <Text style={styles.note}>
          Gerçek telefonda bu adres bilgisayarının yerel IPv4 adresi olmalıdır.
        </Text>
      </Card>
      <PrimaryButton title="Çıkış Yap" tone="neutral" onPress={confirmLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center' },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 25, fontWeight: '900' },
  name: { color: colors.navy, fontSize: 22, fontWeight: '900', marginTop: 14 },
  username: { color: colors.textMuted, marginTop: 4 },
  role: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  roleText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  api: { color: colors.navy, fontSize: 14, fontWeight: '700', marginTop: 8 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 8 },
});
