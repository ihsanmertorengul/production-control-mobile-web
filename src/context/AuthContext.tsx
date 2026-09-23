import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AuthResponse, User } from '@/types/api';
import {
  ApiError,
  authorizedRequest,
  publicRequest,
  refreshAccessToken,
} from '@/lib/api';
import { clearAuth, loadAuth, saveAuth } from '@/lib/storage';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRef = useRef<AuthResponse | null>(null);
  const refreshPromise = useRef<Promise<AuthResponse> | null>(null);

  const updateAuth = useCallback(async (next: AuthResponse | null) => {
    authRef.current = next;
    setAuth(next);
    if (next) await saveAuth(next);
    else await clearAuth();
  }, []);

  useEffect(() => {
    loadAuth()
      .then((stored) => {
        authRef.current = stored;
        setAuth(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      const response = await publicRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password, rememberMe }),
      });
      await updateAuth(response);
    },
    [updateAuth],
  );

const logout = useCallback(async () => {
  const current = authRef.current;

  // Önce cihazdaki oturumu kapat.
  // Backend erişilemiyorsa bile kullanıcı uygulamadan çıkabilmeli.
  await updateAuth(null);

  if (!current) return;

  try {
    await authorizedRequest<void>(
      '/api/auth/logout',
      current.accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: current.refreshToken,
        }),
      },
    );
  } catch {
    // Yerel oturum zaten temizlendi.
    // Backend isteğinin başarısız olması çıkışı engellemez.
  }
}, [updateAuth]);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const current = authRef.current;
      if (!current) throw new ApiError('Oturum bulunamadı.', 401);

      try {
        return await authorizedRequest<T>(path, current.accessToken, init);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;

        if (!refreshPromise.current) {
          refreshPromise.current = refreshAccessToken(current.refreshToken)
            .then(async (next) => {
              await updateAuth(next);
              return next;
            })
            .finally(() => {
              refreshPromise.current = null;
            });
        }

        try {
          const renewed = await refreshPromise.current;
          return await authorizedRequest<T>(path, renewed.accessToken, init);
        } catch {
          await updateAuth(null);
          throw new ApiError('Oturum süreniz doldu. Tekrar giriş yapın.', 401);
        }
      }
    },
    [updateAuth],
  );

  const value = useMemo(
    () => ({ user: auth?.user ?? null, isLoading, login, logout, request }),
    [auth?.user, isLoading, login, logout, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return context;
}
