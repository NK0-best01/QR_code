import '@testing-library/jest-dom';

process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ||
  'development-super-secret-key-at-least-32-chars-long-for-tests';
