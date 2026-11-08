import type { CodeLanguage } from '~/utils/code-highlight'

export interface PcFile {
    name: string
    language: CodeLanguage
    content: string
}

/**
 * The "files" open in the editor on the PC screen, in sidebar order. Edit freely: plain text, highlighted by
 * extension. URLs and email addresses inside strings or markdown links become clickable.
 */
export const PC_FILES: PcFile[] = [
    {
        name: 'about.md',
        language: 'md',
        content: `# Hi, I'm Nam

Web developer. I like building things people can poke at,
like this room.

## What I do
- Build web apps end to end, from the API to the UI
- Write **Node.js**, **TypeScript**, **Python** and **PHP**
- Sweat the small stuff: tooling, consistency, details

## Off the clock
- Taylor Swift on repeat
- Counter-Strike 2
- Anime, Attack on Titan especially
- Chinese chess (xiangqi)
- Chess
- Cats, though I don't have one (yet)
- Yu-Gi-Oh! card game

> Psst: the TV has more of that.
`,
    },
    {
        name: 'skills.ts',
        language: 'ts',
        content: `// The stack I reach for
export const stack = [
    'Node.js',
    'Nuxt',
    'Vue',
    'TypeScript',
    'Python',
    'PHP',
    'Laravel',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'MariaDB',
    'Docker',
    '...',
] as const
`,
    },
    {
        name: 'experience.json',
        language: 'json',
        content: `[
    {
        "company": "Offspring Digital",
        "role": "Full-stack Developer",
        "period": "Mar 2026 - present",
        "stack": ["Node.js", "Python"]
    },
    {
        "company": "CMC Global",
        "unit": "DUS1",
        "role": "Senior Full-stack Developer",
        "period": "Nov 2025 - Mar 2026",
        "stack": ["Node.js"]
    },
    {
        "company": "Viettel Networks",
        "role": "Full-stack Developer",
        "period": "Sep 2020 - Nov 2025",
        "stack": [
            "Laravel + Vue + MySQL",
            "NestJS + Vue + MariaDB"
        ]
    },
    {
        "company": "Base.vn",
        "role": "PHP Intern",
        "period": "Jan 2020 - Mar 2020",
        "stack": ["PHP"]
    }
]
`,
    },
    {
        name: 'contact.ts',
        language: 'ts',
        content: `// Say hi, the email is clickable
export const contact = {
    email: 'nam.th.200698@gmail.com',
}
`,
    },
]
