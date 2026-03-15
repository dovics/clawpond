module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.(ts|tsx)', '**/?(*.)+(spec|test).(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      babelConfig: {
        presets: [
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript'
        ]
      }
    }],
    '^.+\\.(js)$': ['babel-jest'],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\\.(svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
};