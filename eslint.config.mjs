import gts from 'gts';

let customConfig = [];
let hasIgnoresFile = false;

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
  ...gts,
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
];
