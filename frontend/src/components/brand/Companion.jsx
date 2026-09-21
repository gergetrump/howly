import { CompanionAvatar } from '@/components/brand/CompanionAvatar';

export function Companion({
    src,
    type = 'wolf',
    name = 'Howly',
    size = 'xl',
    showName = true,
    equippedItemKeys = [],
    equippedItemConfigs = [],
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
            equippedItemConfigs={equippedItemConfigs}
            className={className}
        />
    );
}
