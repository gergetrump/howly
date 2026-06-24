export default function Eclipse({ className, color = '#FFFF00', ...props }) {
    return (
        <svg
            className={className}
            width="143"
            height="160"
            viewBox="0 0 143 160"
            fill="none"
            overflow="visible"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M56.1699 0C46.0761 14.1485 40 32.3739 40 52.2637C40 97.2749 71.1162 133.764 109.5 133.764C121.487 133.764 132.764 130.205 142.607 123.939C128.581 145.557 104.879 159.764 78 159.764C34.9218 159.764 0 123.275 0 78.2637C0 41.1703 23.7168 9.86597 56.1699 0Z" fill={color} />
        </svg>
    );
}
