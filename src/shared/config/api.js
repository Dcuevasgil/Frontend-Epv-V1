const fromEnv = process.env.EXPO_PUBLIC_API_URL || '';
const cleaned = fromEnv.replace(/\/+$/, '');

if (!cleaned) {
  throw new Error('❌ Falta EXPO_PUBLIC_API_URL en el .env');
}

export const API = cleaned;