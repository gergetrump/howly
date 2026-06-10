import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { UserProfileTrigger } from '@/components/social/UserProfileTrigger.jsx';

export function FriendCard({ name, username, streakDays, avatarSrc, action, onClick, user }) {
    const profileUser = user ?? {
        firstName: name,
        username,
        profilePictureUrl: avatarSrc,
        streak: streakDays,
    };

    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-3">
                <UserProfileTrigger
                    user={profileUser}
                    avatarClassName="size-12"
                    onOpen={onClick}
                />

                <Badge className="border border-white/15 bg-white/10 text-slate-100">🔥 {streakDays} days</Badge>
                {action}
            </CardContent>
        </Card>
    );
}
