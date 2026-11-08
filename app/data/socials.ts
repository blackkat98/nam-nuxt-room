export interface SocialLink {
    name: string
    /** What's shown under the name, e.g. the handle or address. */
    handle: string
    href: string
    /** A short badge label and its colour (no brand logos, just letters). */
    badge: string
    color: string
}

/** The links on the phone's lock screen. */
export const SOCIALS: SocialLink[] = [
    {
        name: 'Email',
        handle: 'nam.th.200698@gmail.com',
        href: 'mailto:nam.th.200698@gmail.com',
        badge: '@',
        color: '#ea4335',
    },
    {
        name: 'GitHub',
        handle: 'github.com/blackkat98',
        href: 'https://github.com/blackkat98',
        badge: 'GH',
        color: '#24292f',
    },
    {
        name: 'LinkedIn',
        handle: 'linkedin.com/in/namth200698',
        href: 'https://www.linkedin.com/in/namth200698/',
        badge: 'in',
        color: '#0a66c2',
    },
    {
        name: 'Facebook',
        handle: 'facebook.com/tonghoang.nam.9',
        href: 'https://www.facebook.com/tonghoang.nam.9',
        badge: 'f',
        color: '#1877f2',
    },
]

/** The sites of the logos painted where the walls meet the ceiling. */
export const BUILT_WITH = {
    nuxt: 'https://nuxt.com',
    three: 'https://threejs.org',
}

/** My Chess.com profile, opened by the chess knight on the shelf. */
export const CHESS_PROFILE = 'https://www.chess.com/member/blackkat98'

/** The CV the backpack opens: a file in /public, and the name it downloads as. Placeholder for now. */
export const CV = { href: '/cv/nam-cv.pdf', filename: 'Nam-CV.pdf' }
