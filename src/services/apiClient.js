const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('howly_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('howly_token');
        window.location.href = '/login';
        return undefined;
    }

    if (response.status === 204) {
        return undefined;
    }

    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType?.includes('application/json');

    const responseBody = isJsonResponse
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message =
            typeof responseBody === 'object' && responseBody?.message
                ? responseBody.message
                : 'Request failed';
        const error = new Error(message);

        if (typeof responseBody === 'object' && responseBody?.code) {
            error.code = responseBody.code;
        }

        throw error;
    }

    return responseBody;
}
