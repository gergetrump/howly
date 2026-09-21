import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { appCardClassName } from '@/components/cards/cardStyles';
import { DEFAULT_PROFILE_AVATAR_SRC } from '@/lib/profileAvatar.js';
import { useEffect, useState } from 'react';

export function PostAuthorAvatar({ avatarSrc, name, isPremium }) {
    const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';
    const resolvedAvatarSrc = typeof avatarSrc === 'string' ? avatarSrc.trim() : '';
    const [hasImageLoadError, setHasImageLoadError] = useState(false);
    const [hasDefaultImageLoadError, setHasDefaultImageLoadError] = useState(false);
    const displayedAvatarSrc = resolvedAvatarSrc && !hasImageLoadError
        ? resolvedAvatarSrc
        : hasDefaultImageLoadError ? '' : DEFAULT_PROFILE_AVATAR_SRC;

    useEffect(() => {
        setHasImageLoadError(false);
        setHasDefaultImageLoadError(false);
    }, [resolvedAvatarSrc]);

    return (
        <div className="relative shrink-0">
            <div className={`flex size-12 items-center justify-center overflow-hidden rounded-full bg-slate-300 text-lg font-bold text-slate-950 ${isPremium ? 'ring-2 ring-theme-gold ring-offset-2 ring-offset-theme-surface' : ''}`}>
                {displayedAvatarSrc ? (
                    <img
                        src={displayedAvatarSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => {
                            if (displayedAvatarSrc === resolvedAvatarSrc) {
                                setHasImageLoadError(true);
                            } else {
                                setHasDefaultImageLoadError(true);
                            }
                        }}
                    />
                ) : (
                    initial
                )}
            </div>
        </div>
    );
}

export function FeedPostCard({
    authorName,
    authorUsername,
    authorAvatarSrc,
    authorIsPremium,
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

    return (
        <Card className={`${appCardClassName} gap-5 p-5`}>
            <CardHeader className="px-0">
                <div className="flex min-w-0 items-start gap-3">
                    <PostAuthorAvatar
                        avatarSrc={authorAvatarSrc}
                        name={authorName}
                        isPremium={authorIsPremium}
                    />
                    <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg text-theme-text">{authorName}</CardTitle>
                        <div className="flex min-w-0 items-center gap-3">
                            {authorUsername ? (
                                <p className="min-w-0 flex-1 truncate text-sm text-theme-text-muted">@{authorUsername}</p>
                            ) : (
                                <span className="flex-1" />
                            )}
                            {meta ? <p className="shrink-0 text-right text-sm text-theme-text-muted">{meta}</p> : null}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-5 px-0">
                <div className="flex flex-col gap-4 rounded-xl bg-theme-bg/35 p-5 sm:flex-row sm:items-center">
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

                    <div className="relative flex min-w-0 w-fit max-w-full items-center gap-4 rounded-lg bg-theme-text/5 p-4 before:absolute before:left-[-14px] before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[12px] before:border-r-[14px] before:border-y-transparent before:border-r-white/5">
                        <div className="min-w-0">
                            {milestoneTitle ? (
                                <p className="relative text-base font-semibold text-theme-text">{milestoneTitle}</p>
                            ) : null}
                        </div>
                    </div>
                </div>
                {children ? (
                    <div className="border-t border-theme-text/10 pt-4">
                        {children}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
