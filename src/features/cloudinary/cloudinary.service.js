import cloudinary from '../../config/cloudinary.js';

export function uploadBufferToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
}

export function deleteFromCloudinary(publicId) {
    return cloudinary.uploader.destroy(publicId);
}
