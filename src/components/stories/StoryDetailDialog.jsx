import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { StoryFeedCard } from '@/components/cards/StoryFeedCard';
import { deleteStory } from '@/services/storyApi';

function formatFullDate(value) {
    return new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function StoryDetailDialog({
    story,
    open,
    onOpenChange,
    currentUserId,
    authorAvatarSrc,
    authorIsPremium,
    onDeleted,
}) {
    async function handleDelete(target) {
        await deleteStory(target.id);
        onDeleted?.(target.id);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>Story detail</DialogTitle>
                </DialogHeader>
                {open && story ? (
                    <StoryFeedCard
                        authorName="You"
                        authorAvatarSrc={authorAvatarSrc}
                        authorIsPremium={authorIsPremium}
                        meta={formatFullDate(story.createdAt)}
                        story={story}
                        isOwn
                        currentUserId={currentUserId}
                        onDelete={handleDelete}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
