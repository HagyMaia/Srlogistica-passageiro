import { createBrowserClient } from '@supabase/ssr';

export type DemoUser = {
  id: string;
  email: string;
  role?: 'passenger' | 'driver' | 'admin';
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export type DemoSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: DemoUser;
};

const DEFAULT_SUPABASE_URL = 'https://lvdplhnbkkmlcxeuqhdo.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_CoC8vHLwAQ3kGsXwWBlaoA_4LB5SzsK';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  supabaseAnonKey &&
  !rawUrl.includes('placeholder') &&
  !rawUrl.includes('example') &&
  !supabaseAnonKey.includes('placeholder') &&
  rawUrl.startsWith('http')
);

function normalizeSupabaseUrl(url: string) {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return url.replace(/\/rest\/v1.*$/i, '').replace(/\/+$/g, '');
  }
}

export const browserUrl = isSupabaseConfigured ? normalizeSupabaseUrl(rawUrl as string) : DEFAULT_SUPABASE_URL;
const browserKey = supabaseAnonKey || DEFAULT_SUPABASE_KEY;

const DEMO_PASSENGERS_KEY = 'sr-demo-passengers';
const DEMO_ACCOUNTS_KEY = 'sr-demo-passenger-accounts';
const DEMO_SESSION_KEY = 'sr-demo-passenger-session';
const DEFAULT_DEMO_EMAIL = 'passageiro@demo.local';
const DEFAULT_DEMO_PASSWORD = 'demo123';
const MOCK_TABLES_KEY = 'sr-passenger-mock-tables';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore local storage errors
  }
}

function setDemoCookie(userId: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `sb-passenger-token=${userId}; path=/; max-age=86400; SameSite=Lax`;
  }
}

function clearDemoCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'sb-passenger-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

function createDemoSession(user: DemoUser): DemoSession {
  const session: DemoSession = {
    access_token: `demo-passenger-token-${user.id}`,
    refresh_token: `demo-refresh-token-${user.id}`,
    expires_in: 86400,
    expires_at: Date.now() + 86400 * 1000,
    token_type: 'bearer',
    user,
  };

  writeStorage(DEMO_SESSION_KEY, session);
  setDemoCookie(user.id);
  return session;
}

function readDemoSession(): DemoSession | null {
  return readStorage<DemoSession | null>(DEMO_SESSION_KEY, null);
}

function clearDemoSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    clearDemoCookie();
  }
}

function buildDemoUser(id: string, email: string, name = 'Passageiro'): DemoUser {
  return {
    id,
    email: email.trim().toLowerCase(),
    role: 'passenger',
    app_metadata: { provider: 'demo', role: 'passenger' },
    user_metadata: { source: 'local-demo', name, role: 'passenger' },
  };
}

const DEFAULT_PASSENGER = {
  id: 'demo-passenger-default',
  email: DEFAULT_DEMO_EMAIL,
  nome: 'Ana Clara Souza',
  telefone: '(92) 99123-4567',
  role: 'passenger',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  rating: 4.9,
  created_at: new Date().toISOString()
};

function getMockTablesData(): Record<string, any[]> {
  if (typeof window === 'undefined') {
    return {
      profiles: [DEFAULT_PASSENGER],
      trips: [],
      rides: [],
      drivers: [
        {
          id: 'driver-1',
          name: 'Carlos Eduardo da Silva',
          phone: '(92) 98492-3316',
          rating: 4.95,
          total_rides: 1420,
          vehicle: {
            brand: 'Chevrolet',
            model: 'Onix Plus',
            color: 'Prata',
            plate: 'ABC-1D23',
            category: 'POPULAR'
          },
          current_location: { latitude: -3.1180, longitude: -60.0230 }
        },
        {
          id: 'driver-2',
          name: 'Marcos Vinicius Ferreira',
          phone: '(92) 99455-8890',
          rating: 4.88,
          total_rides: 890,
          vehicle: {
            brand: 'Toyota',
            model: 'Corolla',
            color: 'Preto',
            plate: 'MOB-3600',
            category: 'CONFORT'
          },
          current_location: { latitude: -3.1250, longitude: -60.0190 }
        }
      ]
    };
  }

  try {
    const raw = window.localStorage.getItem(MOCK_TABLES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }

  return {
    profiles: [DEFAULT_PASSENGER],
    trips: [],
    rides: [],
    drivers: [
      {
        id: 'driver-1',
        name: 'Carlos Eduardo da Silva',
        phone: '(92) 98492-3316',
        rating: 4.95,
        total_rides: 1420,
        vehicle: {
          brand: 'Chevrolet',
          model: 'Onix Plus',
          color: 'Prata',
          plate: 'ABC-1D23',
          category: 'POPULAR'
        },
        current_location: { latitude: -3.1180, longitude: -60.0230 }
      }
    ]
  };
}

function setMockTableData(tableName: string, records: any[]) {
  if (typeof window === 'undefined') return;
  try {
    const current = getMockTablesData();
    current[tableName] = records;
    window.localStorage.setItem(MOCK_TABLES_KEY, JSON.stringify(current));
  } catch {
    // fallback
  }
}

function loadTableData(tableName: string): any[] {
  const tables = getMockTablesData();
  return tables[tableName] || [];
}

const mockRealtimeCallbacks = new Set<(payload: any) => void>();

export function createMockSupabase() {
  return {
    auth: {
      async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        const normalizedEmail = email.trim().toLowerCase();
        const userId = `demo-passenger-${Date.now()}`;
        const name = options?.data?.name || options?.data?.nome || normalizedEmail.split('@')[0];
        const user = buildDemoUser(userId, normalizedEmail, name);
        const session = createDemoSession(user);

        const profiles = loadTableData('profiles');
        profiles.push({
          id: userId,
          email: normalizedEmail,
          nome: name,
          role: 'passenger',
          telefone: options?.data?.telefone || options?.data?.phone || '(92) 99999-9999',
          created_at: new Date().toISOString()
        });
        setMockTableData('profiles', profiles);

        return { data: { user, session }, error: null };
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const normalizedEmail = email.trim().toLowerCase();
        const userId = normalizedEmail === DEFAULT_DEMO_EMAIL ? DEFAULT_PASSENGER.id : `demo-passenger-${Date.now()}`;
        const name = normalizedEmail === DEFAULT_DEMO_EMAIL ? DEFAULT_PASSENGER.nome : normalizedEmail.split('@')[0];
        const user = buildDemoUser(userId, normalizedEmail, name);
        const session = createDemoSession(user);

        return {
          data: { user, session },
          error: null,
        };
      },

      async signOut() {
        clearDemoSession();
        return { error: null };
      },

      async getSession() {
        return {
          data: { session: readDemoSession() },
          error: null,
        };
      },

      async getUser() {
        const session = readDemoSession();
        return {
          data: { user: session?.user ?? null },
          error: null,
        };
      },

      async resetPasswordForEmail(email: string) {
        return {
          data: { user: null },
          error: null,
          email,
        };
      },

      onAuthStateChange(callback: (event: string, session: DemoSession | null) => void) {
        const session = readDemoSession();
        if (session) {
          setTimeout(() => callback('SIGNED_IN', session), 0);
        }

        return {
          data: {
            subscription: {
              unsubscribe: () => undefined,
            },
          },
        };
      },
    },

    channel(name: string) {
      let listener: ((payload: any) => void) | null = null;
      const channelObj = {
        on(event: string, filter: any, callback: (payload: any) => void) {
          listener = callback;
          mockRealtimeCallbacks.add(callback);
          return channelObj;
        },
        subscribe(callback?: (status: string) => void) {
          if (callback) {
            setTimeout(() => callback('SUBSCRIBED'), 0);
          }
          return channelObj;
        },
        unsubscribe() {
          if (listener) {
            mockRealtimeCallbacks.delete(listener);
          }
          return Promise.resolve();
        },
      };
      return channelObj;
    },

    removeChannel() {
      return Promise.resolve();
    },

    from(table: string) {
      const executeOperation = (
        filters: Array<(row: any) => boolean>,
        pendingUpdate: Record<string, any> | null,
        pendingDelete: boolean,
        orderCol: string | null,
        orderAsc: boolean,
        limitCount: number | null
      ) => {
        let current = loadTableData(table);
        let filtered = current.filter((row) => filters.every((fn) => fn(row)));

        if (pendingUpdate) {
          current = current.map((row) => {
            const matches = filters.every((fn) => fn(row));
            if (matches) {
              const updated = { ...row, ...pendingUpdate };
              // Dispara evento realtime simulado
              mockRealtimeCallbacks.forEach((cb) => {
                try {
                  cb({ eventType: 'UPDATE', new: updated, old: row });
                } catch {
                  // ignore
                }
              });
              return updated;
            }
            return row;
          });
          setMockTableData(table, current);
          filtered = current.filter((row) => filters.every((fn) => fn(row)));
        } else if (pendingDelete) {
          current = current.filter((row) => !filters.every((fn) => fn(row)));
          setMockTableData(table, current);
        }

        if (orderCol) {
          filtered = [...filtered].sort((a, b) => {
            const valA = a[orderCol!] ?? '';
            const valB = b[orderCol!] ?? '';
            const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return orderAsc ? comp : -comp;
          });
        }

        if (limitCount !== null) {
          filtered = filtered.slice(0, limitCount);
        }

        return filtered;
      };

      const createQueryBuilder = (initialFilters: Array<(row: any) => boolean> = []) => {
        const filters = [...initialFilters];
        let pendingUpdate: Record<string, any> | null = null;
        let pendingDelete = false;
        let orderCol: string | null = null;
        let orderAsc = true;
        let limitCount: number | null = null;

        const builder: any = {
          select() {
            return builder;
          },
          update(values: Record<string, any>) {
            pendingUpdate = values;
            return builder;
          },
          delete() {
            pendingDelete = true;
            return builder;
          },
          eq(column: string, value: any) {
            filters.push((row) => String(row[column] ?? '') === String(value ?? ''));
            return builder;
          },
          neq(column: string, value: any) {
            filters.push((row) => String(row[column] ?? '') !== String(value ?? ''));
            return builder;
          },
          order(column: string, options?: { ascending?: boolean }) {
            orderCol = column;
            orderAsc = options?.ascending !== false;
            return builder;
          },
          limit(count: number) {
            limitCount = count;
            return builder;
          },
          single() {
            const results = executeOperation(filters, pendingUpdate, pendingDelete, orderCol, orderAsc, limitCount);
            return Promise.resolve({ data: results[0] || null, error: null });
          },
          maybeSingle() {
            const results = executeOperation(filters, pendingUpdate, pendingDelete, orderCol, orderAsc, limitCount);
            return Promise.resolve({ data: results[0] || null, error: null });
          },
          then(onfulfilled?: any, onrejected?: any) {
            const results = executeOperation(filters, pendingUpdate, pendingDelete, orderCol, orderAsc, limitCount);
            return Promise.resolve({ data: results, error: null }).then(onfulfilled, onrejected);
          },
        };

        return builder;
      };

      return {
        async insert(values: any) {
          const records = loadTableData(table);
          const itemsToInsert = Array.isArray(values) ? values : [values];

          const nextRecords = itemsToInsert.map((item) => {
            const row = {
              ...item,
              id: String(item.id || `sr-${table}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
              status: item.status || 'REQUESTED',
              created_at: item.created_at || new Date().toISOString(),
            };
            // Disparar evento realtime simulado
            mockRealtimeCallbacks.forEach((cb) => {
              try {
                cb({ eventType: 'INSERT', new: row });
              } catch {
                // ignore
              }
            });
            return row;
          });

          setMockTableData(table, [...records, ...nextRecords]);
          return { error: null, data: nextRecords[0] || nextRecords };
        },

        select(columns?: string) {
          return createQueryBuilder().select(columns);
        },

        update(values: Record<string, any>) {
          return createQueryBuilder().update(values);
        },

        delete() {
          return createQueryBuilder().delete();
        },
      };
    },
  };
}

const browserClient = isSupabaseConfigured
  ? createBrowserClient(browserUrl, browserKey)
  : createMockSupabase();

export const supabase = browserClient as any;
export const createClient = () => (isSupabaseConfigured ? createBrowserClient(browserUrl, browserKey) : createMockSupabase()) as any;
