import multer from 'multer';
import path from 'path';
import fs from 'fs';

const profilePictureDir = path.join(process.cwd(), 'uploads', 'profile-pictures');

if (!fs.existsSync(profilePictureDir)) {
    fs.mkdirSync(profilePictureDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilePictureDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const filename = `${req.user.id}-${Date.now()}${extension}`;
        cb(null, filename);
    },
});

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