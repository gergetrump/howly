import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { appCardClassName } from '@/components/cards/cardStyles';

export function FeedPostCard({
    authorName,
    authorUsername,
    authorAvatarSrc,
    meta,
    companionName,
    companionType,
    companionAvatarSrc,
    companionSrc,
    companionEquippedItemConfigs = [],
    milestoneTitle,
    children,
}) {
    const resolvedCompanionSrc = companionAvatarSrc ?? companionSrc;
    const authorInitial = authorName?.trim()?.charAt(0)?.toUpperCase() || '?';

    return (
        <Card className={`${appCardClassName} gap-5 p-5`}>
            <CardHeader className="px-0">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-300 text-lg font-bold text-slate-950">
                        {authorAvatarSrc ? (
                            <img src={authorAvatarSrc} alt="" className="h-full w-full object-cover" />
                        ) : (
                            authorInitial
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg text-white">{authorName}</CardTitle>
                        <div className="flex min-w-0 items-center gap-3">
                            {authorUsername ? (
                                <p className="min-w-0 flex-1 truncate text-sm text-slate-400">@{authorUsername}</p>
                            ) : (
                                <span className="flex-1" />
                            )}
                            {meta ? <p className="shrink-0 text-right text-sm text-slate-400">{meta}</p> : null}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-5 px-0">
                <div className="flex flex-col gap-4 rounded-xl bg-slate-950/35 p-5 sm:flex-row sm:items-center">
                    <div className="flex justify-center sm:w-44 sm:shrink-0">
                        <CompanionAvatar
                            src={resolvedCompanionSrc}
                            type={companionType}
                            name={companionName}
                            size="feed"
                            showName={false}
                            equippedItemConfigs={companionEquippedItemConfigs}
                        />
                    </div>

                    <div className="relative flex min-w-0 w-fit max-w-full items-center gap-4 rounded-lg bg-white/5 p-4 before:absolute before:left-[-14px] before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[12px] before:border-r-[14px] before:border-y-transparent before:border-r-white/5">
                        <div className="min-w-0">
                            {milestoneTitle ? (
                                <p className="relative text-base font-semibold text-white">{milestoneTitle}</p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {children ? (
                    <div className="border-t border-white/10 pt-4">
                        {children}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
