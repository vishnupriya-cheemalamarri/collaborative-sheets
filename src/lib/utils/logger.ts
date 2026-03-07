type LogLevel = 'error' | 'warn' | 'info';

function log(level: LogLevel, message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;

  const prefix = `[${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, message, data ?? '');
  if (level === 'warn')  console.warn(prefix, message, data ?? '');
  if (level === 'info')  console.log(prefix, message, data ?? '');
}

export const logger = {
  error: (message: string, data?: unknown) => log('error', message, data),
  warn:  (message: string, data?: unknown) => log('warn',  message, data),
  info:  (message: string, data?: unknown) => log('info',  message, data),
};