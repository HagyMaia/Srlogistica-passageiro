/**
 * Utilitário de Autenticação Biométrica e Impressão Digital (WebAuthn / Passkeys)
 * Suporte nativo para Touch ID, Face ID, Windows Hello e Biometria Android
 */

export interface BiometricUserInfo {
  id: string;
  email: string;
  name?: string;
  enrolledAt: string;
}

const STORAGE_KEY_ENROLLED = 'sr_passenger_biometrics_enrolled';
const STORAGE_KEY_USER = 'sr_passenger_biometrics_user';
const STORAGE_KEY_CREDENTIAL_ID = 'sr_passenger_biometrics_cred_id';

// Converte string para ArrayBuffer
function strToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Converte base64 para buffer
function base64ToBuffer(base64: string): Uint8Array {
  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return strToBuffer(base64);
  }
}

/**
 * Verifica se o dispositivo atual suporta autenticação por biometria / digital
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
  } catch (err) {
    console.warn('Erro ao verificar suporte a biometria:', err);
  }
  return false;
}

/**
 * Verifica se o usuário atual já cadastrou a biometria neste aparelho
 */
export function isBiometricsEnrolled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_ENROLLED) === 'true';
}

/**
 * Obtém os dados do usuário cadastrado na biometria deste aparelho
 */
export function getBiometricUser(): BiometricUserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Registra a biometria / digital do passageiro no aparelho
 */
export async function enrollBiometrics(user: { id: string; email: string; name?: string }): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const isSupported = await isBiometricsSupported();
    if (!isSupported) {
      throw new Error('Este dispositivo ou navegador não possui leitor de biometria / digital compatível.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBuffer = strToBuffer(user.id || 'passenger-id');

    const publicKeyCredentialCreationOptions: any = {
      challenge: challenge as any,
      rp: {
        name: 'SR Logística Passageiro',
        id: window.location.hostname
      },
      user: {
        id: userIdBuffer as any,
        name: user.email,
        displayName: user.name || user.email.split('@')[0]
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential;

    if (credential && credential.id) {
      localStorage.setItem(STORAGE_KEY_ENROLLED, 'true');
      localStorage.setItem(STORAGE_KEY_CREDENTIAL_ID, credential.id);
      localStorage.setItem(
        STORAGE_KEY_USER,
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          enrolledAt: new Date().toISOString()
        })
      );
      return true;
    }
    return false;
  } catch (err: any) {
    console.error('Falha ao cadastrar biometria:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Leitura de digital / Face ID cancelada pelo usuário.');
    }
    throw new Error(err.message || 'Falha ao autenticar com o leitor biométrico do dispositivo.');
  }
}

/**
 * Autentica o usuário com a biometria / digital do aparelho
 */
export async function authenticateWithBiometrics(): Promise<BiometricUserInfo> {
  if (typeof window === 'undefined') {
    throw new Error('Ambiente inválido');
  }

  const savedUser = getBiometricUser();
  if (!savedUser) {
    throw new Error('Nenhuma biometria cadastrada neste dispositivo. Faça login tradicional e ative no seu perfil.');
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const rawCredId = localStorage.getItem(STORAGE_KEY_CREDENTIAL_ID);
    const allowCredentials = rawCredId
      ? [
          {
            id: base64ToBuffer(rawCredId) as any,
            type: 'public-key',
            transports: ['internal']
          }
        ]
      : [];

    const publicKeyCredentialRequestOptions: any = {
      challenge: challenge as any,
      timeout: 60000,
      rpId: window.location.hostname,
      userVerification: 'required',
      ...(allowCredentials.length > 0 ? { allowCredentials } : {})
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (assertion) {
      return savedUser;
    }

    throw new Error('Validação biométrica não confirmada.');
  } catch (err: any) {
    console.error('Erro na autenticação biométrica:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Leitura de digital cancelada ou não reconhecida.');
    }
    throw new Error(err.message || 'Falha ao autenticar com biometria.');
  }
}

/**
 * Remove a biometria cadastrada no dispositivo
 */
export function removeBiometrics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_ENROLLED);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_CREDENTIAL_ID);
}
