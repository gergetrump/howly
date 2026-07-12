import { API_BASE_URL } from '../../config.js';

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const DEFAULT_PROFILE_AVATAR_SRC = `${BACKEND_BASE_URL}/uploads/profile-pictures/default.png`;
