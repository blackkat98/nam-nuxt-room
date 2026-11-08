// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: ['@nuxt/eslint'],
    devtools: { enabled: true },
    app: {
        head: {
            link: [
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap' },
            ],
            script: [
                {
                    // Apply the saved (or system) theme before first paint, so dark mode doesn't flash light.
                    // The storage key matches THEME_STORAGE_KEY in app/composables/useTheme.ts.
                    innerHTML: `(function () {
                        var theme
                        try { theme = localStorage.getItem('nuxt-room-theme') } catch (e) {}
                        if (theme !== 'light' && theme !== 'dark') {
                            theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                        }
                        document.documentElement.dataset.theme = theme
                    })()`,
                    tagPosition: 'head',
                },
            ],
        },
    },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2025-07-15',
    vite: {
        optimizeDeps: {
            include: [
                'three',
                'three/addons/controls/OrbitControls.js',
                'three/addons/geometries/RoundedBoxGeometry.js',
            ],
        },
    },
    eslint: {
        config: {
            stylistic: {
                indent: 4,
                semi: false,
                quotes: 'single',
                commaDangle: 'always-multiline',
                braceStyle: '1tbs',
            },
        },
    },
})
