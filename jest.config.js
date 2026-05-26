module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/__mocks__/electron.ts'
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
