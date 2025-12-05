const raw = process.env.EXPO_PUBLIC_API_URL || '';

if (!raw) {
  throw new Error('❌ Falta EXPO_PUBLIC_API_URL en tu .env');
}

export const BASE_URL = raw.replace(/\/+$/, '');
