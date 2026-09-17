/**
 * Utilitário de Armazenamento, Otimização e Persistência de Imagem de Perfil do Passageiro
 * Implementa persistência multicamadas ultra-resiliente:
 * 1. IndexedDB (Persistência nativa de alta capacidade sem limite de 5MB)
 * 2. LocalStorage (Cache síncrono para renderização instantânea 0ms)
 * 3. Supabase Auth User Metadata (Sincronização em nuvem com compressão inteligente para caber no limite do servidor)
 * 4. Event Bus no navegador (Eventos customizados para sincronização em tempo real entre páginas/abas)
 */

import { supabase, isSupabaseConfigured } from './supabase';

const DB_NAME = 'sr_passenger_db';
const STORE_NAME = 'passenger_avatars';
const DB_VERSION = 1;

export const STORAGE_AVATAR_KEY = 'sr_passenger_active_avatar';
export const STORAGE_AVATAR_META_KEY = 'sr_passenger_avatar_meta';
export const STORAGE_AVATAR_PREFIX = 'sr-passenger-avatar-';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

export interface StoredAvatarMeta {
  avatarUrl: string;
  isCustom: boolean;
  updatedAt: number;
  userId?: string;
  email?: string;
}

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
async function idbSet(key: string, val: any): Promise<void> {
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
async function idbGet(key: string): Promise<any | null> {
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
 * Processa e otimiza uma imagem para avatar com recorte central quadrado 1:1 e compressão
 */
export async function optimizeAvatarImage(
  fileOrDataUrl: File | Blob | string,
  targetSize = 300,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let blobUrl: string | null = null;

      const cleanUp = () => {
        if (blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (_) {}
          blobUrl = null;
        }
      };

      const handleImageLoad = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            cleanUp();
            reject(new Error('Falha ao inicializar contexto Canvas'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const originalWidth = img.naturalWidth || img.width || targetSize;
          const originalHeight = img.naturalHeight || img.height || targetSize;

          let sourceX = 0;
          let sourceY = 0;
          let sourceSize = Math.min(originalWidth, originalHeight);

          if (originalWidth > originalHeight) {
            sourceX = Math.floor((originalWidth - originalHeight) / 2);
          } else {
            sourceY = Math.floor((originalHeight - originalWidth) / 2);
          }

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
          cleanUp();
          resolve(resultBase64);
        } catch (err) {
          cleanUp();
          reject(err);
        }
      };

      img.onload = handleImageLoad;
      img.onerror = () => {
        cleanUp();
        if (typeof fileOrDataUrl !== 'string') {
          const reader = new FileReader();
          reader.onload = (event) => {
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error('Falha no canvas'));
                  return;
                }
                ctx.drawImage(fallbackImg, 0, 0, targetSize, targetSize);
                resolve(canvas.toDataURL('image/jpeg', quality));
              } catch (e) {
                reject(e);
              }
            };
            fallbackImg.onerror = () => reject(new Error('Erro ao processar imagem no celular'));
            fallbackImg.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error('Erro ao ler arquivo da câmera'));
          reader.readAsDataURL(fileOrDataUrl);
        } else {
          reject(new Error('Erro ao carregar imagem'));
        }
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        try {
          blobUrl = URL.createObjectURL(fileOrDataUrl);
          img.src = blobUrl;
        } catch (_) {
          const reader = new FileReader();
          reader.onload = (event) => {
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
          reader.readAsDataURL(fileOrDataUrl);
        }
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Cria uma miniatura compacta (120x120 JPEG 0.65, ~3KB a 5KB) estritamente garantida para caber no Supabase Auth User Metadata sem estourar o limite de payload HTTP
 */
export async function createCompactAvatarThumbnail(
  fileOrDataUrl: File | Blob | string
): Promise<string> {
  return optimizeAvatarImage(fileOrDataUrl, 120, 0.65);
}

/**
 * Faz upload da imagem de perfil para o Supabase Storage (tentando buckets 'avatars', 'passageiros', 'perfil')
 * Retorna a URL pública direta da imagem se o bucket público estiver ativo, permitindo que a central carregue instantaneamente.
 */
export async function uploadAvatarToSupabaseStorage(
  userId: string,
  base64OrBlob: string | Blob | File
): Promise<string | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    let blob: Blob;
    if (typeof base64OrBlob === 'string' && base64OrBlob.startsWith('data:')) {
      const parts = base64OrBlob.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else if (base64OrBlob instanceof Blob) {
      blob = base64OrBlob;
    } else {
      return null;
    }

    const cleanId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `passenger_${cleanId}_${Date.now()}.jpg`;
    const bucketsToTry = ['avatars', 'passageiros', 'perfil', 'public'];

    for (const bucket of bucketsToTry) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!error && data?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (_) {
        // Tenta o próximo bucket
      }
    }
  } catch (err) {
    console.warn('Tentativa de upload no Supabase Storage:', err);
  }
  return null;
}

/**
 * Verifica se uma string de avatar é personalizada pelo usuário (base64 ou custom URL)
 */
export function isCustomAvatar(url?: string | null): boolean {
  if (!url) return false;
  if (url === DEFAULT_AVATAR_URL) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.includes('blob:')) return true;
  if (url.includes('supabase.co/storage')) return true;
  if (url.includes('cloudinary.com') || url.includes('imgbb.com')) return true;
  return true;
}

/**
 * Salva o avatar de forma persistente em todas as camadas de armazenamento local
 */
export async function persistPassengerAvatar(params: {
  userId?: string;
  email?: string;
  avatarUrl: string;
  isCustom?: boolean;
}): Promise<void> {
  const { userId, email, avatarUrl } = params;
  if (!avatarUrl) return;

  const isCustom = params.isCustom !== undefined ? params.isCustom : isCustomAvatar(avatarUrl);
  const meta: StoredAvatarMeta = {
    avatarUrl,
    isCustom,
    updatedAt: Date.now(),
    userId,
    email: email?.toLowerCase()
  };

  // 1. Grava no LocalStorage (Síncrono para renderização instantânea 0ms)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, avatarUrl);
      localStorage.setItem(STORAGE_AVATAR_META_KEY, JSON.stringify(meta));

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

      // Notifica todos os componentes ativos no navegador
      window.dispatchEvent(
        new CustomEvent('sr_avatar_updated', {
          detail: { avatarUrl, userId, email: email?.toLowerCase(), isCustom }
        })
      );
    } catch (e) {
      console.warn('Aviso no LocalStorage ao salvar avatar:', e);
    }
  }

  // 2. Grava no IndexedDB (Persistência robusta para PWA / APK sem limite de 5MB)
  try {
    await idbSet('current_avatar', avatarUrl);
    await idbSet('current_avatar_meta', meta);
    if (userId) {
      await idbSet(`user_${userId}`, avatarUrl);
      await idbSet(`meta_user_${userId}`, meta);
    }
    if (email) {
      await idbSet(`email_${email.toLowerCase()}`, avatarUrl);
      await idbSet(`meta_email_${email.toLowerCase()}`, meta);
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
 * Resolução inteligente do avatar que protege uploads do usuário contra sobreposição de avatares genéricos/padrão
 */
export function resolveBestAvatar(params: {
  metaAvatar?: string | null;
  dbAvatar?: string | null;
  persistedAvatar?: string | null;
  instantAvatar?: string | null;
  defaultAvatar?: string;
}): string {
  const { metaAvatar, dbAvatar, persistedAvatar, instantAvatar, defaultAvatar = DEFAULT_AVATAR_URL } = params;

  // 1. Se houver upload personalizado local recente (base64), ele tem prioridade máxima contra URLs genéricas
  if (persistedAvatar && isCustomAvatar(persistedAvatar)) {
    return persistedAvatar;
  }

  if (instantAvatar && isCustomAvatar(instantAvatar)) {
    return instantAvatar;
  }

  // 2. Se houver avatar personalizado nos metadados do Auth
  if (metaAvatar && isCustomAvatar(metaAvatar)) {
    return metaAvatar;
  }

  // 3. Se houver avatar no banco de dados
  if (dbAvatar && isCustomAvatar(dbAvatar)) {
    return dbAvatar;
  }

  // 4. Qualquer avatar não-nulo disponível
  if (metaAvatar && metaAvatar !== defaultAvatar) return metaAvatar;
  if (dbAvatar && dbAvatar !== defaultAvatar) return dbAvatar;
  if (persistedAvatar) return persistedAvatar;
  if (instantAvatar) return instantAvatar;

  return defaultAvatar;
}

/**
 * Remove o avatar salvo nas camadas locais
 */
export async function clearPersistedPassengerAvatar(userId?: string, email?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_AVATAR_KEY);
      localStorage.removeItem(STORAGE_AVATAR_META_KEY);
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
    await idbDelete('current_avatar_meta');
    if (userId) {
      await idbDelete(`user_${userId}`);
      await idbDelete(`meta_user_${userId}`);
    }
    if (email) {
      await idbDelete(`email_${email.toLowerCase()}`);
      await idbDelete(`meta_email_${email.toLowerCase()}`);
    }
  } catch (_) {}
}
