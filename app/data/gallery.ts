export interface GalleryItem {
    title: string
    /** Image URL: a file in /public (e.g. '/gallery/my-photo.jpg') or a full https link. */
    src: string
    caption?: string
}

/**
 * The gallery's pictures. The first three hang on the left wall, in this order: the big poster, the small top one,
 * the small bottom one; any after that only show in the gallery (browse with its arrows).
 * The wall shows each image cropped to fill its frame; the gallery shows it whole.
 */
export const GALLERY: GalleryItem[] = [
    {
        title: 'Me',
        src: '/gallery/my-profile-picture.jpg',
        caption: 'Hi, that is me. Nam.',
    },
    {
        title: 'Taylor Swift',
        src: '/gallery/taylor-swift.jpg',
    },
    {
        title: 'Hu-Li the Jewel Mikanko',
        src: '/gallery/huli-mikanko.png',
        caption: 'A Yu-Gi-Oh! card.',
    },
    {
        title: 'Butterfly Knife | Gamma Doppler',
        src: '/gallery/butterfly-knife-gamma-doppler.jpg',
        caption: 'A Counter-Strike skin.',
    },
]
