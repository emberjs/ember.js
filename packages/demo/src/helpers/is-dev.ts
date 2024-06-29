import env from '@/config/env';

export default function isDev(): boolean {
  return env.environment === 'development';
}
