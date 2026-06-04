import { cn } from '@/lib/utils';
import { Starfield } from './background/Starfield';
import { Moon } from './background/Moon';
import { Tree } from './background/Tree';
import { Ground } from './background/Ground';

export function Background({ theme = 'forest', className, children }) {
    // We can conditionally render things based on `theme` later.
    // For now, it defaults to the Forest Night Sky theme.

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
            <Starfield />

            {/* The Moon */}
            <Moon className="top-[8%] right-[12%] size-24 md:size-32" />

            {/* ---- Back layer trees (darker, smaller, behind) ---- */}
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

            {/* ---- Front layer trees (lighter lavender, larger, in front) ---- */}
            <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10" style={{ height: '42vh' }}>
                <Tree color={frontColor} trunkColor={trunkColor} width={180} height={320} x={-3}  y={20} />
                <Tree color={frontColor} trunkColor={trunkColor} width={130} height={220} x={10}  y={40} />
                <Tree color={frontColor} trunkColor={trunkColor} width={200} height={360} x={28}  y={10} />
                <Tree color={frontColor} trunkColor={trunkColor} width={140} height={240} x={46}  y={35} />
                <Tree color={frontColor} trunkColor={trunkColor} width={190} height={340} x={62}  y={5}  />
                <Tree color={frontColor} trunkColor={trunkColor} width={130} height={230} x={78}  y={30} />
                <Tree color={frontColor} trunkColor={trunkColor} width={185} height={330} x={94}  y={15} />
            </div>

            {/* Ground / Horizon */}
            <Ground />

            {/* Child content wrapped properly so it sits above the background */}
            <div className="relative z-30 h-full w-full">
                {children}
            </div>
        </div>
    );
}
