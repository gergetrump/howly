import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createStory } from '@/services/storyApi';

/**
 * Generic "Share a moment " modal.
 * Works for any story source: pass sourceType ('habit' | 'challenge' | 'milestone'),
 * sourceId and a display title/emoji for context.
 */
export function ShareMomentModal({
    open,
    onOpenChange,
    sourceType = 'habit',
    sourceId,
    sourceTitle = '',
    sourceEmoji = '🎯',
    onPosted,
}) {
    const fileInputRef = useRef(null);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState('');

    // Reset state when the modal closes, so the next open starts fresh
    function handleOpenChange(isOpen) {
        if (!isOpen) {
            setImageFile(null);
            setPreviewUrl('');
            setCaption('');
            setError('');
        }

        onOpenChange(isOpen);
    }

    // Clean up object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    /* Validates the picked image (size limit) and shows a local preview, or an error. */
    function handleFileChange(event) {
        const file = event.target.files?.[0];

        // Allow re-selecting the same file later
        event.target.value = '';

        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be 5 MB or smaller');
            return;
        }

        setError('');
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }

    /* Uploads the selected photo and caption as a new story, then closes the modal. */
    async function handlePost() {
        if (!imageFile) {
            setError('Please pick a photo first');
            return;
        }

        try {
            setError('');
            setIsPosting(true);

            const story = await createStory({
                sourceType,
                sourceId,
                caption: caption.trim(),
                imageFile,
            });

            onPosted?.(story);
            handleOpenChange(false);
        } catch (err) {
            setError(err.message || 'Could not post your story');
        } finally {
            setIsPosting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl bg-theme-surface border-0 p-8 text-theme-text shadow-2xl">
                <div className="flex flex-col gap-5">
                    <div>
                        <h2 className="text-xl font-bold">Share a moment 📸</h2>
                        <p className="mt-1 text-sm text-theme-text-muted">
                            {sourceEmoji} {sourceTitle}
                        </p>
                    </div>

                    {/* Photo picker / preview */}
                    {previewUrl ? (
                        <div className="relative overflow-hidden rounded-2xl">
                            <img
                                src={previewUrl}
                                alt="Story preview"
                                className="max-h-72 w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setImageFile(null);
                                    setPreviewUrl('');
                                }}
                                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                                aria-label="Remove photo"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-theme-text/20 bg-theme-text/5 text-theme-text-muted transition hover:border-theme-accent/50 hover:text-theme-text"
                        >
                            <Upload className="size-7" aria-hidden="true" />
                            <span className="text-sm font-medium">Upload a picture</span>
                        </button>
                    )}

                    {/* Single file input — opens the native picker (photo library, or camera on mobile) */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Caption */}
                    <Input
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        maxLength={200}
                        placeholder="Add a caption (optional)"
                        className="h-12 rounded-2xl border-theme-text/15 bg-theme-text/5 text-theme-text placeholder:text-theme-text-muted"
                    />

                    {error && <p className="text-sm text-theme-danger">{error}</p>}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            className="flex-1 rounded-2xl text-theme-text-muted hover:text-theme-text"
                        >
                            Maybe later
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handlePost}
                            disabled={isPosting || !imageFile}
                            className="flex-1 rounded-2xl disabled:opacity-50"
                        >
                            {isPosting ? 'Posting...' : 'Post Story'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
