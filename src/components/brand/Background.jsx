import forestBackground from '@/assets/backgrounds/forest.png';
import { cn } from '@/lib/utils';

const backgroundImages = {
    forest: forestBackground,
};

export function Background({ background = 'forest', backgroundSrc, className, children }) {
    const selectedBackground = backgroundSrc ?? backgroundImages[background];

    const backgroundStyle = selectedBackground
        ? {
              backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.9)), url(${selectedBackground})`,
          }
        : undefined;

    return (
        <div
            className={cn(
                'fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.16),_transparent_32%),linear-gradient(180deg,_#172554,_#020617)] bg-cover bg-center bg-no-repeat',
                className,
            )}
            style={backgroundStyle}
            aria-hidden={children ? undefined : 'true'}
        >
            {children}
        </div>
    );
}
