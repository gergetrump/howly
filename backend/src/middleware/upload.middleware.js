import multer from 'multer';
import path from 'path';
import fs from 'fs';

const profilePictureDir = path.join(process.cwd(), 'uploads', 'profile-pictures');

if (!fs.existsSync(profilePictureDir)) {
    fs.mkdirSync(profilePictureDir, { recursive: true });
}

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG and WEBP images are allowed'));
    }

    cb(null, true);
}

export const uploadProfilePicture = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB
    },
});

export const uploadStoryImage = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB — photos can be larger
    },
});

export const uploadReportAttachment = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});
