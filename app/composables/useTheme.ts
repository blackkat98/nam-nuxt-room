export type Theme = 'light' | 'dark'

/** Must match the key read by the pre-paint theme script in nuxt.config.ts. */
export const THEME_STORAGE_KEY = 'nuxt-room-theme'

/**
 * Page theme, stored on `<html data-theme>`. The initial value is set before first paint by the inline script in
 * nuxt.config.ts (saved choice, else the system preference); toggling saves the choice for the next visit.
 */
export function useTheme() {
    const theme = useState<Theme>('theme', () => 'light')

    onMounted(() => {
        theme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    })

    const setTheme = (value: Theme) => {
        theme.value = value
        document.documentElement.dataset.theme = value

        try {
            localStorage.setItem(THEME_STORAGE_KEY, value)
        } catch {
            // storage blocked (private mode etc.): the theme just won't be remembered
        }
    }

    const toggle = () => setTheme(theme.value === 'dark' ? 'light' : 'dark')

    return { theme, toggle }
}
