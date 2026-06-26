function normalizeHexColor(hexColor) {
    const cleanHex = hexColor?.replace('#', '') ?? '';

    if (cleanHex.length === 3) {
        return cleanHex
            .split('')
            .map((character) => character + character)
            .join('');
    }

    return cleanHex;
}

function clampColorChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToChannels(hexColor) {
    const normalizedColor = normalizeHexColor(hexColor);

    if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
        return null;
    }

    return normalizedColor.match(/.{2}/g).map((channel) => parseInt(channel, 16));
}

function channelsToHex(channels) {
    return `#${channels
        .map((channel) => clampColorChannel(channel).toString(16).padStart(2, '0'))
        .join('')}`;
}

export function adjustColor(hexColor, stages = 1, direction = 'darken', amountPerStage = 18) {
    const channels = hexToChannels(hexColor);

    if (!channels) {
        return hexColor;
    }

    const amount = amountPerStage * stages * (direction === 'darken' ? -1 : 1);

    return channelsToHex(channels.map((channel) => channel + amount));
}

export function darkenColor(hexColor, amount = 0.15) {
    const channels = hexToChannels(hexColor);

    if (!channels) {
        return hexColor;
    }

    return channelsToHex(channels.map((channel) => channel * (1 - amount)));
}

export function lightenColor(hexColor, amount = 0.15) {
    const channels = hexToChannels(hexColor);

    if (!channels) {
        return hexColor;
    }

    return channelsToHex(channels.map((channel) => channel + (255 - channel) * amount));
}
