import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';

export function FriendCard({ name, username, streakDays, avatarSrc }) {
    const initials = name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-3">
                <Avatar size="lg">
                    <AvatarImage src={avatarSrc} alt={name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{name}</h3>
                    <p className="truncate text-sm text-slate-300">@{username}</p>
                </div>

                <Badge className="border border-white/15 bg-white/10 text-slate-100">{streakDays} days</Badge>
            </CardContent>
        </Card>
    );
}
