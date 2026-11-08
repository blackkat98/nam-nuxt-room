/** Pulls the video id out of the usual YouTube link shapes (watch, youtu.be, shorts, embed); anything else is taken as an id already. */
export function youtubeId(url: string): string {
    try {
        const parsed = new URL(url)

        if (parsed.hostname === 'youtu.be') {
            return parsed.pathname.slice(1)
        }

        return parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop() ?? url
    } catch {
        return url
    }
}

/** The playlist id (`list=`) of a YouTube link, if it has one. */
export function youtubePlaylistId(url: string): string | undefined {
    try {
        return new URL(url).searchParams.get('list') ?? undefined
    } catch {
        return undefined
    }
}

/**
 * Embed URL for a YouTube link: plays the playlist when the link has one (starting at its `v=` video if given),
 * otherwise the single video. `params` are added to the query string.
 */
export function youtubeEmbedUrl(url: string, params: Record<string, string | number> = {}): string {
    const list = youtubePlaylistId(url)
    const hasVideo = (() => {
        try {
            const parsed = new URL(url)

            return parsed.hostname === 'youtu.be' || parsed.searchParams.has('v') || !parsed.pathname.endsWith('/playlist')
        } catch {
            return true
        }
    })()
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))
    let path = `embed/${youtubeId(url)}`

    if (list) {
        query.set('list', list)

        if (!hasVideo) {
            path = 'embed/videoseries'
        }
    }

    return `https://www.youtube-nocookie.com/${path}?${query}`
}
