import sharp from 'sharp';

export async function processProfilePicture(fileBuffer) {
    return sharp(fileBuffer)
        .resize({
            width: 512,
            height: 512,
            fit: 'cover',
        })
        .webp({
            quality: 80,
        })
        .toBuffer();
}