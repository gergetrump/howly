import { Badge } from '@/components/ui/badge';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';

export function FriendCard({ name, username, streakDays, avatarSrc, action, onClick, user }) {
    const profileUser = user ?? {
        firstName: name,
        username,
        profilePictureUrl: avatarSrc,
        streak: streakDays,
    };

    return (
        <UserPanelRow
            user={profileUser}
            avatarClassName="size-12"
            surfaceClassName="bg-violet-400/10"
            className="shadow-xl shadow-slate-950/20 backdrop-blur"
            onOpenProfile={onClick}
        >
            <Badge className="shrink-0 border border-theme-text/15 bg-theme-text/10 text-theme-text">🔥 {streakDays} days</Badge>
            {action}
        </UserPanelRow>
    );
}
