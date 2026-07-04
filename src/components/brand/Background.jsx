import { cn } from '@/lib/utils';
import { useTheme } from '@/context/themeContext';
import { Starfield } from './background/Starfield.jsx';
import { Moon } from './background/Moon.jsx';
import { Tree } from './background/Tree.jsx';
import { Ground } from './background/Ground.jsx';
import { FallingPetals } from './background/FallingPetals.jsx';
import { Castle } from './background/Castle.jsx';
import { Owl } from './background/Owl.jsx';
import { HogwartsGrounds } from './background/HogwartsGrounds.jsx';

export function Background({ className, children }) {
    const { theme } = useTheme();

    const isSakura = theme === 'sakura-light';
    const isHogwarts = theme === 'hogwarts-night';
    const isDarkTheme = !isSakura;

    const backColor = 'var(--color-howly-forest-back)';
    const frontColor = 'var(--color-howly-forest-front)';
    const trunkColor = 'var(--color-howly-trunk)';

    return (
        <div
            className={cn(
                'fixed inset-0 overflow-hidden bg-gradient-to-b from-howly-sky-top to-howly-sky-bottom',
                className,
            )}
            aria-hidden={children ? undefined : 'true'}
        >
            {/* Stars only at night (dark themes) */}
            {isDarkTheme ? <Starfield /> : null}

            {/* The Moon (doubles as the sun in Sakura Light) */}
            <Moon className="top-[8%] right-[12%] size-24 md:size-32" />

            {/* Falling cherry blossom petals */}
            {isSakura ? <FallingPetals /> : null}

            {/* Hogwarts castle silhouette on the horizon */}
            {isHogwarts ? (
                <div className="pointer-events-none absolute inset-x-0 z-[5] flex justify-center" style={{ bottom: '6vh' }}>
                    <Castle className="w-auto" style={{ height: '52vh' }} />
                </div>
            ) : null}

            {/* An owl on night patrol */}
            {isHogwarts ? (
                <Owl className="pointer-events-none absolute left-[5%] top-[42%] z-[5] w-20 md:w-28" />
            ) : null}

            {/* Rolling hills, Hagrid's hut and Hogsmeade lights */}
            {isHogwarts ? (
                <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-[4]" style={{ height: '30vh' }}>
                    <HogwartsGrounds className="h-full w-full" />
                </div>
            ) : null}

            {/* ---- Back layer trees (darker, smaller, behind) ---- */}
            {!isHogwarts ? (
                <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-0" style={{ height: '38vh' }}>
                    <Tree color={backColor} trunkColor={trunkColor} width={90}  height={160} x={2}   y={30} />
                    <Tree color={backColor} trunkColor={trunkColor} width={140} height={240} x={14}  y={55} />
                    <Tree color={backColor} trunkColor={trunkColor} width={100} height={180} x={26}  y={20} />
                    <Tree color={backColor} trunkColor={trunkColor} width={150} height={260} x={40}  y={45} />
                    <Tree color={backColor} trunkColor={trunkColor} width={90}  height={150} x={54}  y={15} />
                    <Tree color={backColor} trunkColor={trunkColor} width={130} height={230} x={66}  y={40} />
                    <Tree color={backColor} trunkColor={trunkColor} width={100} height={170} x={78}  y={25} />
                    <Tree color={backColor} trunkColor={trunkColor} width={145} height={250} x={92}  y={50} />
                </div>
            ) : null}

            {/* ---- Front layer trees (larger, in front — with blossoms in Sakura) ---- */}
            {!isHogwarts ? (
                <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10" style={{ height: '42vh' }}>
                    <Tree color={frontColor} trunkColor={trunkColor} width={180} height={320} x={-3}  y={20} blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={130} height={220} x={10}  y={40} blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={200} height={360} x={28}  y={10} blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={140} height={240} x={46}  y={35} blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={190} height={340} x={62}  y={5}  blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={130} height={230} x={78}  y={30} blossoms={isSakura} />
                    <Tree color={frontColor} trunkColor={trunkColor} width={185} height={330} x={94}  y={15} blossoms={isSakura} />
                </div>
            ) : null}

            {/* Ground / Horizon */}
            <Ground />

            {/* Child content wrapped properly so it sits above the background */}
            <div className="relative z-30 h-full w-full">
                {children}
            </div>
        </div>
    );
}
