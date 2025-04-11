module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',    // New feature
        'fix',     // Bug fix
        'docs',    // Documentation
        'chore',   // Maintenance
        'style',   // Formatting, missing semi colons, etc
        'refactor',// Code change that neither fixes a bug nor adds a feature
        'perf',    // Performance improvements
        'test',    // Adding missing tests
        'revert',  // Revert to a commit
        'ci',      // CI related changes
      ],
    ],
  },
};