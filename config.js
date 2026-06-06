const config = {
    port: 3000,
    mongoUri: 'mongodb://127.0.0.1:27017/howly',
    jwtSecret: 'REDACTED',
    serverBaseUrl: 'http://localhost:3000',
    frontendBaseUrl: 'http://localhost:5173',
    cloudinary: {
        cloudName: 'dxclpq7wx',
        apiKey: 'REDACTED',
        apiSecret: 'REDACTED',
    },
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'yourhowlyteam@gmail.com',
        pass: 'REDACTED',
        from: 'Howly <yourhowlyteam@gmail.com>',
    },
};

export default config;