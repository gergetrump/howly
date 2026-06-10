import { CompanionAvatar } from '@/components/brand/companionAvatar';

export function Companion({
    src,
    name = 'Howly',
    size = 'xl',
    showName = true,
    equippedItemKeys = [],
    className,
}) {
    return (
        <CompanionAvatar
            src={src}
            name={name}
            size={size}
            showName={showName}
            equippedItemKeys={equippedItemKeys}
            className={className}
        />
    );
}
