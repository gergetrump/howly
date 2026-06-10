import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanionAvatar } from '@/components/brand/companionAvatar';
import { appCardClassName } from '@/components/cards/cardStyles';

export function FeedPostCard({
    authorName,
    companionName,
    companionAvatarSrc,
    companionSrc,
    message,
    children,
}) {
    const resolvedCompanionSrc = companionAvatarSrc ?? companionSrc;

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle>{authorName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4">
                    <CompanionAvatar src={resolvedCompanionSrc} name={companionName} size="lg" showName />
                </div>
                {message ? <p className="text-sm text-theme-text">{message}</p> : null}
                {children}
            </CardContent>
        </Card>
    );
}
