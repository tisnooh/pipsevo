module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/jest-setup.cjs'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/style-mock.cjs',
    '\\.(png|jpg|jpeg|gif|svg|webp|woff2?)$': '<rootDir>/tests/file-mock.cjs',
  },
  clearMocks: true,
};
