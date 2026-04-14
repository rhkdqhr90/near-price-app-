module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['jest.setup.js', '**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    // console.log 커밋 금지 (warn/error는 허용 — 디버깅 및 에러 리포팅용)
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
};
