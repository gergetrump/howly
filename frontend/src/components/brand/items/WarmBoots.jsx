import { adjustColor } from '@/lib/colorUtils';

const WARM_BOOTS_WIDTH = 208;
const WARM_BOOTS_HEIGHT = 206;
const PREVIEW_SHOE_WIDTH = 190;
const LAYER_SHOE_WIDTH = 205;
const PREVIEW_SHOE_HEIGHT = (PREVIEW_SHOE_WIDTH / WARM_BOOTS_WIDTH) * WARM_BOOTS_HEIGHT;
const LAYER_SHOE_HEIGHT = (LAYER_SHOE_WIDTH / WARM_BOOTS_WIDTH) * WARM_BOOTS_HEIGHT;

export function WarmBootsLayer({
    transform,
    leftShoeTransform = 'translate(380 1315)',
    rightShoeTransform = 'translate(805 1315)',
    color,
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <WarmBoots width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
            <g transform={rightShoeTransform}>
                <WarmBoots width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
        </g>
    );
}

export function WarmBootsPair({ className, color, ...props }) {
    return (
        <svg className={className} width="520" height="250" viewBox="0 0 520 250" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g transform="translate(45 22)">
                <WarmBoots width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
            <g transform="translate(285 22)">
                <WarmBoots width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
        </svg>
    );
}

export default function WarmBoots({ className, color = '#392E18', ...props }) {
    const lineColor = adjustColor(color, 2, 'darken');

    return (
        <svg className={className} width="208" height="206" viewBox="0 0 208 206" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 136">
                <path id="Rectangle 62" d="M4 10.879C4 5.02461 9.0296 0.426834 14.8654 0.894002C82.7561 6.32884 125.2 6.68717 193.076 0.954784C198.933 0.46017 204 5.06501 204 10.9425V112.779C204 118.301 199.523 122.779 194 122.779H14C8.47716 122.779 4 118.301 4 112.779V10.879Z" fill={color}/>
                <g id="Group 134">
                    <g id="Group 78">
                        <g id="Ellipse 34">
                            <path d="M104 74.4344C159.228 74.4344 177 80.1896 204 120.86C204 163.241 159.228 197.597 104 197.597C48.7715 197.597 4 163.241 4 120.86C27.5 80.957 48.7715 74.4344 104 74.4344Z" fill={color}/>
                            <path d="M6.50488 121.54C17.9842 102.193 28.7597 91.2368 43.1025 84.9746C57.7359 78.5857 76.3847 76.9346 104 76.9346C131.636 76.9346 149.391 78.3979 163.573 84.6816C177.494 90.8498 188.277 101.813 201.493 121.611C201.232 141.569 190.591 159.784 173.188 173.138C155.565 186.661 131.112 195.097 104 195.097C76.888 195.097 52.4346 186.661 34.8115 173.138C17.3884 159.768 6.74128 141.525 6.50488 121.54Z" stroke={lineColor} strokeWidth="5"/>
                        </g>
                        <g id="Union">
                            <mask id="path-4-inside-1_179_105" fill="white">
                                <path d="M204.001 122.778C204.001 166.097 159.229 201.215 104.001 201.215C48.7725 201.215 4 166.097 4 122.778C27.8263 161.395 49.3462 174.581 104.001 181.214C160.868 174.998 182.124 161.62 204.001 122.778Z"/>
                            </mask>
                            <path d="M204.001 122.778C204.001 166.097 159.229 201.215 104.001 201.215C48.7725 201.215 4 166.097 4 122.778C27.8263 161.395 49.3462 174.581 104.001 181.214C160.868 174.998 182.124 161.62 204.001 122.778Z" fill={lineColor}/>
                            <path d="M204.001 122.778H209.001V103.712L199.644 120.325L204.001 122.778ZM104.001 201.215V206.215H104.001L104.001 201.215ZM4 122.778L8.25524 120.153L-1 105.152V122.778H4ZM104.001 181.214L103.399 186.177L103.971 186.247L104.544 186.184L104.001 181.214ZM204.001 122.778H199.001C199.001 162.273 157.667 196.215 104.001 196.215L104.001 201.215L104.001 206.215C160.791 206.215 209.001 169.922 209.001 122.778H204.001ZM104.001 201.215V196.215C50.3346 196.215 9 162.273 9 122.778H4H-1C-1 169.922 47.2104 206.215 104.001 206.215V201.215ZM4 122.778L-0.255243 125.404C11.8764 145.066 23.7339 158.769 39.9011 168.298C55.9781 177.773 75.8352 182.832 103.399 186.177L104.001 181.214L104.603 176.25C77.512 172.962 59.2817 168.113 44.9786 159.683C30.7655 151.306 19.9499 139.107 8.25524 120.153L4 122.778ZM104.001 181.214L104.544 186.184C133.197 183.052 153.585 178.059 169.67 168.533C185.88 158.933 197.198 145.045 208.357 125.232L204.001 122.778L199.644 120.325C188.927 139.353 178.679 151.575 164.574 159.929C150.346 168.355 131.672 173.16 103.458 176.243L104.001 181.214Z" fill={lineColor} mask="url(#path-4-inside-1_179_105)"/>
                        </g>
                        <g id="Ellipse 36">
                            <path d="M4 122.779C27.8263 161.396 49.3458 174.581 104.001 181.214C160.868 174.998 182.124 161.62 204.001 122.779C204.001 166.098 159.229 201.215 104.001 201.215C48.7721 201.215 4 166.098 4 122.779Z" fill={lineColor}/>
                            <path d="M5.75879 128.363C16.6774 145.182 27.5054 156.929 41.6777 165.282C57.1338 174.392 76.4221 179.378 103.82 182.703L103.991 182.724L104.163 182.705C132.663 179.59 152.451 174.663 167.887 165.521C181.9 157.222 192.199 145.525 202.192 128.877C198.218 168.25 156.097 199.715 104.001 199.715C51.6786 199.715 9.41743 167.976 5.75879 128.363Z" stroke={lineColor} strokeWidth="3"/>
                        </g>
                    </g>
                </g>
                <rect id="Rectangle 63" x="4" width="200" height="27.6252" rx="5" fill={lineColor}/>
            </g>
            <defs>
            </defs>
        </svg>
    );
}
