import { API_BASE_URL } from '../../config.js';

/* Central fetch wrapper that attaches the auth token, sets headers, redirects on 401, and throws on error responses. */
export async function apiRequest(path, options = {}) {
    const { redirectOnUnauthorized = true, ...requestOptions } = options;
    const token = localStorage.getItem('howly_token');
    const isFormData = requestOptions.body instanceof FormData;

    const headers = {
        ...requestOptions.headers,
    };

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        headers,
    });

    if (response.status === 204) {
        return undefined;
    }

    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType?.includes('application/json');

    const responseBody = isJsonResponse
        ? await response.json()
        : await response.text();

    if (response.status === 401 && redirectOnUnauthorized) {
        localStorage.removeItem('howly_token');
        window.location.href = '/login';
        return undefined;
    }

    if (!response.ok) {
        const message =
            typeof responseBody === 'object' && responseBody?.message
                ? responseBody.message
                : 'Request failed';
        const error = new Error(message);

        if (typeof responseBody === 'object' && (responseBody?.code || responseBody?.errorCode)) {
            error.code = responseBody.code || responseBody.errorCode;
        }

        throw error;
    }

    return responseBody;
}
