// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: ['@nuxt/eslint'],
    devtools: { enabled: true },
    app: {
        head: {
            link: [
                // my face, cut from my portrait: .ico for older browsers, a sharp PNG for the rest, and a square one
                // for phone home screens (which round the corners themselves)
                { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
                { rel: 'icon', type: 'image/png', href: '/icon-192.png', sizes: '192x192' },
                { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap' },
            ],
            script: [
                {
                    // Apply the saved theme before first paint, so dark mode doesn't flash light. Without a saved
                    // choice the room starts light (lights on), whatever the device's own setting.
                    // The storage key matches THEME_STORAGE_KEY in app/composables/useTheme.ts.
                    innerHTML: `(function () {
                        var theme
                        try { theme = localStorage.getItem('nuxt-room-theme') } catch (e) {}
                        document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light'
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
