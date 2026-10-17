import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['dist/', 'node_modules/', 'public/', 'reports/'], extends: tseslint.configs.recommended });
