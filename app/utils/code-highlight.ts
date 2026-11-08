export type CodeLanguage = 'md' | 'ts' | 'json'

export type TokenKind = 'plain' | 'keyword' | 'string' | 'number' | 'key' | 'comment' | 'heading' | 'punct' | 'bold' | 'link'

export interface CodeToken {
    kind: TokenKind
    text: string
    /** Set on string / link tokens that hold a URL or mailto address, so they can be rendered as links. */
    href?: string
}

type Rule = [RegExp, TokenKind]

/** Rules are tried in order at each position; all of them are sticky (`y`). */
const RULES: Record<CodeLanguage, Rule[]> = {
    ts: [
        [/\/\/[^\n]*/y, 'comment'],
        [/\/\*[\s\S]*?\*\//y, 'comment'],
        [/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/y, 'string'],
        [/\b(?:export|import|from|const|let|as|default|return|type|interface)\b/y, 'keyword'],
        [/\b\d+(?:\.\d+)?\b/y, 'number'],
        [/[A-Za-z_$][\w$]*(?=\s*:)/y, 'key'],
        [/[A-Za-z_$][\w$]*/y, 'plain'],
        [/[{}[\]().,:;=]/y, 'punct'],
    ],
    json: [
        [/"(?:[^"\\\n]|\\.)*"(?=\s*:)/y, 'key'],
        [/"(?:[^"\\\n]|\\.)*"/y, 'string'],
        [/-?\b\d+(?:\.\d+)?\b/y, 'number'],
        [/\b(?:true|false|null)\b/y, 'keyword'],
        [/[{}[\],:]/y, 'punct'],
    ],
    md: [
        [/^#{1,6} [^\n]*/my, 'heading'],
        [/^> [^\n]*/my, 'comment'],
        [/^[ \t]*[-*] /my, 'punct'],
        [/\*\*[^*\n]+\*\*/y, 'bold'],
        [/\[[^\]\n]+\]\([^)\n]+\)/y, 'link'],
        [/`[^`\n]+`/y, 'string'],
    ],
}

const URL_PATTERN = /(?:https?:\/\/|mailto:)[^'"`)\s]+/
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/

/** A link target for a token's text: a URL or mailto: as is, or a bare email address as mailto:. */
function linkTarget(text: string): string | undefined {
    const url = text.match(URL_PATTERN)?.[0]

    if (url) {
        return url
    }

    const email = text.match(EMAIL_PATTERN)?.[0]

    return email ? `mailto:${email}` : undefined
}

/** A tiny, good-enough highlighter for the handful of files shown on the PC screen. */
export function tokenize(code: string, language: CodeLanguage): CodeToken[] {
    const rules = RULES[language]
    const tokens: CodeToken[] = []
    let pos = 0

    const push = (kind: TokenKind, text: string) => {
        const last = tokens[tokens.length - 1]

        if (kind === 'plain' && last?.kind === 'plain') {
            last.text += text

            return
        }

        const href = kind === 'string' || kind === 'link' ? linkTarget(text) : undefined
        tokens.push(href ? { kind, text, href } : { kind, text })
    }

    while (pos < code.length) {
        let matched = false

        for (const [pattern, kind] of rules) {
            pattern.lastIndex = pos
            const match = pattern.exec(code)

            if (match?.[0]) {
                push(kind, match[0])
                pos += match[0].length
                matched = true
                break
            }
        }

        if (!matched) {
            push('plain', code[pos] ?? '')
            pos++
        }
    }

    return tokens
}
