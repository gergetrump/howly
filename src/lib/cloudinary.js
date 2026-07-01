export function cloudinaryUrl(url, { width } = {}) {
    if (typeof url !== 'string' || !url.includes('/upload/')) {
        return url;
    }

    const transforms = ['f_auto', 'q_auto'];

    if (width) {
        transforms.push('c_limit', `w_${width}`);
    }

    return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}
