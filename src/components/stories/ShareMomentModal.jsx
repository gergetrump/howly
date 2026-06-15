import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
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
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
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
            <DialogContent className="sm:max-w-md rounded-2xl bg-[#1e1b3a] border-0 p-8 text-white shadow-2xl">
                <div className="flex flex-col gap-5">
                    <div>
                        <h2 className="text-xl font-bold">Share a moment 📸</h2>
                        <p className="mt-1 text-sm text-slate-400">
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
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-slate-400 transition hover:border-purple-500/50 hover:text-white"
                            >
                                <Camera className="size-7" aria-hidden="true" />
                                <span className="text-sm font-medium">Take a photo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-slate-400 transition hover:border-purple-500/50 hover:text-white"
                            >
                                <ImageIcon className="size-7" aria-hidden="true" />
                                <span className="text-sm font-medium">Pick from gallery</span>
                            </button>
                        </div>
                    )}

                    {/* Camera input — `capture` forces the camera on mobile browsers */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Gallery input — no `capture`, opens the photo picker / file chooser */}
                    <input
                        ref={galleryInputRef}
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
                        className="h-12 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-slate-500"
                    />

                    {error && <p className="text-sm text-red-300">{error}</p>}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            className="flex-1 rounded-2xl text-slate-400 hover:text-white"
                        >
                            Maybe later
                        </Button>
                        <Button
                            type="button"
                            onClick={handlePost}
                            disabled={isPosting || !imageFile}
                            className="flex-1 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                            {isPosting ? 'Posting...' : 'Post Story'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
