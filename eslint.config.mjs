import gts from 'gts';
import globals from 'globals';

let customConfig = [];
let hasIgnoresFile = false;

const withModuleTsExtensions = config => {
  if (!config.files) {
    return config;
  }

  return {
    ...config,
    files: config.files.flatMap(filePattern => {
      if (filePattern === '**/*.ts') {
        return ['**/*.ts', '**/*.mts'];
      }

      if (filePattern === '**/*.tsx') {
        return ['**/*.tsx', '**/*.mtsx'];
      }

      return [filePattern];
    }),
  };
};

const gtsWithModuleTsExtensions = gts.map(withModuleTsExtensions);

try {
  // noinspection JSFileReferences
  await import('./eslint.ignores.mjs');
  hasIgnoresFile = true;
} catch {
  // eslint.ignores.js doesn't exist
}

if (hasIgnoresFile) {
  // noinspection JSFileReferences
  const {default: ignores} = await import('./eslint.ignores.mjs');
  customConfig = [{ignores}];
}

export default [
  ...customConfig,
  ...gtsWithModuleTsExtensions,
  {
    rules: {
      'max-len': [
        'error',
        {
          code: 120,
        },
      ],
    },
  },
  {
    files: ['**/*.spec.mts', '**/*.spec.ts'],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      'max-len': [
        'error',
        {
          code: 120,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
];
