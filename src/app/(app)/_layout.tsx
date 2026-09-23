import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

const icon = (value: string, color: ColorValue) => (
  <Text style={{ color, fontSize: 20 }}>{value}</Text>
);

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => icon('⌂', color),
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Üretim',
          href: user?.role === 'OPERATOR' ? undefined : null,
          tabBarIcon: ({ color }) => icon('▶', color),
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: 'Yönetim',
          href: user?.role === 'ADMIN' ? undefined : null,
          tabBarIcon: ({ color }) => icon('⌘', color),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Oturumlar',
          tabBarIcon: ({ color }) => icon('≡', color),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Raporlar',
          tabBarIcon: ({ color }) => icon('▥', color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => icon('●', color),
        }}
      />
    </Tabs>
  );
}
