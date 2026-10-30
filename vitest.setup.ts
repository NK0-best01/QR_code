import '@testing-library/jest-dom';

process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ||
  'development-super-secret-key-at-least-32-chars-long-for-tests';

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'file:./test.db?connection_limit=1&socket_timeout=60';
