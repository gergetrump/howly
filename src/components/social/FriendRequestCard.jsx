import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

export function FriendRequestCard({ request, busy, onAccept, onReject }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-3">
                <UserAvatar user={request.requester} />

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{getDisplayName(request.requester)}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="truncate text-sm text-slate-300">@{getUsername(request.requester)}</p>
                        <p className="shrink-0 text-sm font-medium text-slate-200">
                            🔥 {request.requester?.streak ?? 0} days
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="bg-emerald-700 text-white hover:bg-emerald-600"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20"
                        aria-label="Reject friend request"
                        disabled={busy}
                        onClick={() => onReject(request.id)}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
