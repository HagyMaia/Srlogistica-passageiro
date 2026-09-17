/**
 * Utilitário de Armazenamento e Otimização de Imagem de Perfil do Passageiro
 * Implementa persistência multicamadas:
 * 1. IndexedDB (Persistência nativa de alto desempenho para Web / PWA / APK)
 * 2. LocalStorage (Cache síncrono para renderização instantânea 0ms)
 * 3. Supabase Auth User Metadata (Nuvem / Sincronização multi-dispositivo)
 */

const DB_NAME = 'sr_passenger_db';
const STORE_NAME = 'passenger_avatars';
const DB_VERSION = 1;

const STORAGE_AVATAR_KEY = 'sr_passenger_active_avatar';
const STORAGE_PROFILE_PREFIX = 'sr-passenger-profile-';
const STORAGE_AVATAR_PREFIX = 'sr-passenger-avatar-';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

/**
 * Abre o banco de dados IndexedDB
 */
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target?.result as IDBDatabase;
        if (db && !db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target?.result || null);
      };

      request.onerror = (err) => {
        console.warn('Erro ao abrir IndexedDB:', err);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Salva um valor no IndexedDB por chave
 */
async function idbSet(key: string, val: string): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        tx.oncomplete = () => {
          try {
            db.close();
          } catch (_) {}
          resolve();
        };
      } catch {
        resolve();
      }
    });
  } catch {
    // fallback
  }
}

/**
 * Obtém um valor do IndexedDB por chave
 */
async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => {
          resolve(null);
        };
        tx.oncomplete = () => {
          try {
            db.close();
          } catch (_) {}
        };
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Remove um valor do IndexedDB por chave
 */
async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        tx.oncomplete = () => {
          try {
            db.close();
          } catch (_) {}
          resolve();
        };
      } catch {
        resolve();
      }
    });
  } catch {
    // fallback
  }
}

/**
 * Processa e otimiza uma imagem para avatar (recorte central quadrado 1:1, alta definição e compactação JPEG)
 */
export async function optimizeAvatarImage(
  fileOrDataUrl: File | Blob | string,
  targetSize = 360,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const handleImageLoad = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Falha ao inicializar contexto Canvas'));
            return;
          }

          // Habilita interpolação suave
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Calcula recorte centralizado 1:1
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          let sourceX = 0;
          let sourceY = 0;
          let sourceSize = Math.min(originalWidth, originalHeight);

          if (originalWidth > originalHeight) {
            sourceX = Math.floor((originalWidth - originalHeight) / 2);
          } else {
            sourceY = Math.floor((originalHeight - originalWidth) / 2);
          }

          // Desenha centralizado e redimensiona
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            targetSize,
            targetSize
          );

          const resultBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(resultBase64);
        } catch (err) {
          reject(err);
        }
      };

      img.onload = handleImageLoad;
      img.onerror = (e) => reject(new Error('Erro ao carregar a imagem'));

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(fileOrDataUrl);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Salva o avatar de forma persistente em todas as camadas de armazenamento local
 */
export async function persistPassengerAvatar(params: {
  userId?: string;
  email?: string;
  avatarUrl: string;
}): Promise<void> {
  const { userId, email, avatarUrl } = params;
  if (!avatarUrl) return;

  // 1. Grava no LocalStorage (Síncrono para acesso imediato 0ms)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, avatarUrl);
      if (userId) {
        localStorage.setItem(`${STORAGE_AVATAR_PREFIX}${userId}`, avatarUrl);
      }
      if (email) {
        localStorage.setItem(`${STORAGE_AVATAR_PREFIX}${email.toLowerCase()}`, avatarUrl);
      }

      // Atualiza também a sessão ativa local se existir
      const rawSession = localStorage.getItem('sr_passenger_active_session');
      if (rawSession) {
        try {
          const session = JSON.parse(rawSession);
          if (session?.profile) {
            session.profile.avatar_url = avatarUrl;
            localStorage.setItem('sr_passenger_active_session', JSON.stringify(session));
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Aviso no LocalStorage ao salvar avatar:', e);
    }
  }

  // 2. Grava no IndexedDB (Persistência robusta para PWA / APK sem limite de 5MB)
  try {
    await idbSet('current_avatar', avatarUrl);
    if (userId) {
      await idbSet(`user_${userId}`, avatarUrl);
    }
    if (email) {
      await idbSet(`email_${email.toLowerCase()}`, avatarUrl);
    }
  } catch (e) {
    console.warn('Aviso no IndexedDB ao salvar avatar:', e);
  }
}

/**
 * Leitura síncrona instantânea do avatar do cache local para renderização sem piscar
 */
export function getInstantSyncPassengerAvatar(userId?: string, email?: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    if (userId) {
      const byId = localStorage.getItem(`${STORAGE_AVATAR_PREFIX}${userId}`);
      if (byId && byId.length > 5) return byId;
    }

    if (email) {
      const byEmail = localStorage.getItem(`${STORAGE_AVATAR_PREFIX}${email.toLowerCase()}`);
      if (byEmail && byEmail.length > 5) return byEmail;
    }

    const current = localStorage.getItem(STORAGE_AVATAR_KEY);
    if (current && current.length > 5) return current;

    const rawSession = localStorage.getItem('sr_passenger_active_session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.profile?.avatar_url) {
        return session.profile.avatar_url;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Leitura assíncrona com verificação profunda no IndexedDB e LocalStorage
 */
export async function getPersistedPassengerAvatar(
  userId?: string,
  email?: string
): Promise<string | null> {
  // 1. Tenta IndexedDB
  try {
    if (userId) {
      const byId = await idbGet(`user_${userId}`);
      if (byId && byId.length > 5) return byId;
    }

    if (email) {
      const byEmail = await idbGet(`email_${email.toLowerCase()}`);
      if (byEmail && byEmail.length > 5) return byEmail;
    }

    const current = await idbGet('current_avatar');
    if (current && current.length > 5) return current;
  } catch (_) {}

  // 2. Tenta LocalStorage como fallback
  return getInstantSyncPassengerAvatar(userId, email);
}

/**
 * Remove o avatar salvo nas camadas locais
 */
export async function clearPersistedPassengerAvatar(userId?: string, email?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_AVATAR_KEY);
      if (userId) {
        localStorage.removeItem(`${STORAGE_AVATAR_PREFIX}${userId}`);
      }
      if (email) {
        localStorage.removeItem(`${STORAGE_AVATAR_PREFIX}${email.toLowerCase()}`);
      }
    } catch (_) {}
  }

  try {
    await idbDelete('current_avatar');
    if (userId) {
      await idbDelete(`user_${userId}`);
    }
    if (email) {
      await idbDelete(`email_${email.toLowerCase()}`);
    }
  } catch (_) {}
}
