module.exports = {
    name: '@zeushq/nextjs-zauth',
    out: './docs/',
    exclude: [
        './src/zauth-session/**',
        './src/session/cache.ts',
        './src/frontend/use-config.tsx',
        './src/utils/!(errors.ts)',
        './src/index.ts',
        './src/index.browser.ts'
    ],
    excludeExternals: true,
    excludePrivate: true,
    hideGenerator: true,
    readme: 'none'
};