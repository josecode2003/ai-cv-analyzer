module.exports = {
  testEnvironment: 'node',

  testMatch: [
    '**/tests/**/*.test.js'
  ],

  setupFiles: [
    '<rootDir>/tests/testEnv.js'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  clearMocks: true,

  verbose: true
}