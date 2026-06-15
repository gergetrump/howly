import { CompanionAvatar } from '@/components/brand/companionAvatar';

export function Companion({
    src,
    type = 'wolf',
    name = 'Howly',
    size = 'xl',
    showName = true,
    equippedItemKeys = [],
    className,
}) {
    return (
        <CompanionAvatar
            src={src}
            type={type}
            name={name}
            size={size}
            showName={showName}
            equippedItemKeys={equippedItemKeys}
            className={className}
        />
    );
}
