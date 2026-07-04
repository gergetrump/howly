import { Badge } from '@/components/ui/badge';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';

export function FriendCard({ name, username, streakDays, avatarSrc, action, onClick, user, showStreak = true }) {
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
            {showStreak ? (
                <Badge className="shrink-0 border border-white/15 bg-white/10 text-slate-100">🔥 {streakDays} days</Badge>
            ) : null}
            {action}
        </UserPanelRow>
    );
}
