import HoodieNew from './HoodieNew';

const WOLF_BODY_WIDTH = 1200;
const HOODIE_NEW_WIDTH = 1211;
const HOODIE_NEW_HEIGHT = 578;
const HOODIE_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / HOODIE_NEW_WIDTH) * HOODIE_NEW_HEIGHT;

export function HoodieLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <HoodieNew
                width={WOLF_BODY_WIDTH}
                height={HOODIE_HEIGHT_AT_WOLF_WIDTH}
            />
        </g>
    );
}

export default function Hoodie(props) {
    return (
        <HoodieNew
            width={WOLF_BODY_WIDTH}
            height={HOODIE_HEIGHT_AT_WOLF_WIDTH}
            {...props}
        />
    );
}
