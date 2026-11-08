// @ts-check
import jsonc from 'eslint-plugin-jsonc'
import unusedImports from 'eslint-plugin-unused-imports'
import withNuxt from './.nuxt/eslint.config.mjs'

const BLOCKS = ['block-like', 'function', 'class', 'interface', 'enum', 'multiline-export']

export default withNuxt(
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            // Unused imports are auto-removed on --fix; unused variables are reported.
            '@typescript-eslint/no-unused-vars': 'off',
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': ['error', {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
            }],

            // Blank line before return (not needed when it's the first statement in a block),
            // and around block-like statements (if, for, while, try, switch, functions, classes, ...).
            // No blank line is required when the block is the first statement after a
            // function/class opening, since there is no previous statement.
            '@stylistic/padding-line-between-statements': ['error',
                { blankLine: 'always', prev: '*', next: 'return' },
                { blankLine: 'always', prev: '*', next: BLOCKS },
                { blankLine: 'always', prev: BLOCKS, next: '*' },
            ],
            '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
        },
    },
    {
        files: ['**/*.vue'],
        rules: {
            'vue/html-indent': ['error', 4],
            'vue/script-indent': 'off',
            // Keep short element content inline: <button>{{ count }}</button>
            'vue/singleline-html-element-content-newline': 'off',
        },
    },
    ...jsonc.configs['flat/recommended-with-jsonc'],
    {
        files: ['**/*.json', '**/*.jsonc', '**/*.json5'],
        rules: {
            'jsonc/indent': ['error', 4],
            'jsonc/comma-dangle': ['error', 'never'],
        },
    },
    {
        ignores: ['package-lock.json'],
    },
)
