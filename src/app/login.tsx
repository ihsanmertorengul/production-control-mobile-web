import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { API_URL, ApiError } from '@/lib/api';
import { colors } from '@/constants/theme';
import { ErrorText, PrimaryButton } from '@/components/ui';

export default function LoginScreen() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Kullanıcı adı ve parola zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username, password, rememberMe);
      router.replace('/(app)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>ÜK</Text>
          </View>
          <Text style={styles.title}>Üretim Kontrol</Text>
          <Text style={styles.subtitle}>
            Üretim oturumlarını güvenli ve anlık olarak yönetin.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Kullanıcı adı</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUsername}
            placeholder="operator"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={username}
          />
          <Text style={styles.label}>Parola</Text>
          <TextInput
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable
            onPress={() => setRememberMe((value) => !value)}
            style={styles.rememberRow}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>Oturumu açık tut</Text>
          </Pressable>

          <ErrorText message={error} />
          <PrimaryButton title="Giriş Yap" onPress={submit} loading={loading} />
          <Text style={styles.api}>API: {API_URL}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 34,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { alignItems: 'center', gap: 10 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 25, fontWeight: '900' },
  title: { color: '#fff', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', textAlign: 'center', lineHeight: 22 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontWeight: '900' },
  rememberText: { color: colors.textMuted, fontSize: 14 },
  api: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 2 },
});
