import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { NotificationBanner } from '@/components/ui/notification-banner.jsx';
import { sendUserReport } from '@/services/reportApi';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

// These tags are hints for the team. The written description remains required
// so a report has enough context even when no tag is selected.
const REPORT_TAGS = [
    'Hate Speech or Harassment',
    'Explicit or Dangerous Content',
    'Fraud & Scams',
    'Spam or Misinformation',
];

const SUCCESS_MESSAGE = 'Thank you for your report. We will take a look at it and come back to you as soon as possible.';

export function ReportUserDialog({ user, open, onOpenChange }) {
    const fileInputRef = useRef(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            // Reopen the dialog as a clean form so an old report draft or error
            // does not leak into the next user being reported.
            setSelectedTags([]);
            setMessage('');
            setAttachment(null);
            setError('');
            setSuccess('');
            setIsSubmitting(false);
        }
    }, [open]);

    function toggleTag(tag) {
        setSelectedTags((currentTags) =>
            currentTags.includes(tag)
                ? currentTags.filter((currentTag) => currentTag !== tag)
                : [...currentTags, tag],
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!message.trim()) {
            setError('Please describe what happened.');
            return;
        }

        const reportedUserId = user?.id || user?._id;

        if (!reportedUserId) {
            setError('Could not find this user.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Reporting is intentionally separate from blocking. Sending a
            // report does not change the friendship or visibility state.
            const response = await sendUserReport({
                reportedUserId,
                tags: selectedTags,
                message: message.trim(),
                attachment,
            });

            setSuccess(response?.message || SUCCESS_MESSAGE);
            setSelectedTags([]);
            setMessage('');
            setAttachment(null);
        } catch (err) {
            setError(err.message || 'Report could not be sent.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-theme-text/10 bg-theme-surface p-0 text-theme-text shadow-2xl sm:max-w-lg">
                <DialogHeader className="border-b border-theme-text/10 px-6 pb-4 pt-6">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200">
                            <AlertTriangle className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold">
                                Report {user ? getDisplayName(user) : 'user'}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-theme-text-soft">
                                @{user ? getUsername(user) : 'user'} will not be notified about your report.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {success ? (
                    <div className="px-6 py-6">
                        <NotificationBanner
                            variant="success"
                            title="Report sent"
                            icon="🎉"
                            className="shadow-none"
                        >
                            {success}
                        </NotificationBanner>
                        <Button
                            type="button"
                            variant="primary"
                            className="mt-5 w-full"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </div>
                ) : (
                    <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
                        <div>
                            <p className="mb-2 text-sm font-semibold text-theme-text">Reason tags</p>
                            <div className="flex flex-wrap gap-2">
                                {REPORT_TAGS.map((tag) => {
                                    const isSelected = selectedTags.includes(tag);

                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                                                isSelected
                                                    ? 'border-theme-accent bg-theme-accent text-theme-on-accent'
                                                    : 'border-theme-text/10 bg-theme-text/5 text-theme-text hover:bg-theme-text/10'
                                            }`}
                                            onClick={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs text-theme-text-muted">Tags are optional.</p>
                        </div>

                        <div>
                            <label htmlFor="report-message" className="mb-2 block text-sm font-semibold text-theme-text">
                                What happened?
                            </label>
                            <textarea
                                id="report-message"
                                value={message}
                                rows={5}
                                maxLength={2000}
                                className="w-full resize-none rounded-2xl border border-theme-text/15 bg-theme-bg/35 px-4 py-3 text-sm text-theme-text outline-none transition placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/20"
                                placeholder="Write a short description. This field is required."
                                disabled={isSubmitting}
                                onChange={(event) => setMessage(event.target.value)}
                            />
                            <div className="mt-1 flex justify-between text-xs text-theme-text-muted">
                                <span>Required</span>
                                <span>{message.length}/2000</span>
                            </div>
                        </div>

                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                            />
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-theme-text/10 bg-theme-text/5 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-theme-text">Attach picture</p>
                                    <p className="truncate text-xs text-theme-text-muted">
                                        {attachment ? attachment.name : 'Optional PNG, JPEG or WEBP'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {attachment ? (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                                            aria-label="Remove attachment"
                                            onClick={() => setAttachment(null)}
                                        >
                                            <X aria-hidden="true" />
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20 hover:text-theme-text"
                                        disabled={isSubmitting}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus aria-hidden="true" />
                                        Choose
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {error ? <p className="text-sm text-theme-danger">{error}</p> : null}

                        <Button
                            type="submit"
                            variant="primary"
                            className="h-11 w-full rounded-full text-base"
                            disabled={isSubmitting}
                        >
                            <Send aria-hidden="true" />
                            {isSubmitting ? 'Sending report…' : 'Send report'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
