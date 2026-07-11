import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, Camera, ShieldAlert } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ConfirmationDialog,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from "@/components/ui/confirmation-dialog";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { renderShopItemVisual } from '@/components/brand/items/itemRegistry';

export function HabitCard({
    emoji = '🔥',
    title,
    frequency,
    category = null,
    streakDays = 0,
    completed = false,
    atRisk = false,
    onEdit,
    onDelete,
    onShareStory,
    activeBoost = null,
    children,
}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const hasMenuActions = Boolean(onEdit || onDelete || onShareStory);
    const truncatedTitle = title && title.length > 40 ? `${title.slice(0, 40)}…` : title;

    return (
        <Card className={cn(appCardClassName, completed && 'bg-theme-success-surface ring-theme-success/25', atRisk && !completed && 'bg-theme-warn-surface ring-theme-gold/30')}>
            <CardContent className="flex items-center gap-3 sm:gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{emoji}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight">{title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                        <StreakBadge days={streakDays} icon="🔥" showLabel={false} className="shrink-0" />
                        {atRisk && !completed ? (
                            <Badge className="shrink-0 gap-1 border border-theme-gold/30 bg-theme-gold/15 text-theme-gold hover:bg-theme-gold/15">
                                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                                At risk
                            </Badge>
                        ) : null}
                        {frequency ? <Badge variant="secondary" className="shrink-0">{frequency}</Badge> : null}
                        {category ? (
                            <Badge className="shrink-0 border border-theme-accent/30 bg-theme-accent/15 text-theme-accent-soft hover:bg-theme-accent/15">
                                {category}
                            </Badge>
                        ) : null}
                        {activeBoost ? (
                            <Badge className="shrink-0 bg-theme-surface-2 hover:bg-theme-surface-2 text-theme-text border-0 font-medium capitalize text-[10px] py-0 h-5 px-1.5 flex gap-1 items-center">
                                {renderShopItemVisual(activeBoost, 'h-3 w-3')}
                                {activeBoost.assetKey.replace('-', ' ')} &bull; {activeBoost.remainingCompletions} left
                            </Badge>
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    {children}
                    {hasMenuActions ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-theme-text-muted hover:text-theme-text hover:bg-theme-surface">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-theme-text/20 bg-theme-bg text-theme-text-soft">
                            {onEdit ? (
                                <DropdownMenuItem onClick={onEdit} className="cursor-pointer focus:bg-theme-surface focus:text-theme-text">
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit Habit
                                </DropdownMenuItem>
                            ) : null}
                            {onShareStory ? (
                                <DropdownMenuItem onClick={onShareStory} className="cursor-pointer focus:bg-theme-surface focus:text-theme-text">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Share Story
                                </DropdownMenuItem>
                            ) : null}
                            {onDelete ? (
                                <DropdownMenuItem
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="cursor-pointer text-theme-danger focus:bg-theme-danger/10 focus:text-theme-danger"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Habit
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    ) : null}

                    {onDelete ? (
                    <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <ConfirmationDialogContent className="p-7 flex flex-col items-center text-center">
                            <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-3 text-center w-full">
                                <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center w-full">Delete this habit?</ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-sm leading-relaxed text-theme-text-soft text-center flex flex-col gap-2 sm:text-base">
                                    <span className="break-words [overflow-wrap:anywhere]">
                                        Your streak and all progress for <strong className="text-theme-text font-semibold">{truncatedTitle}</strong> will be lost forever. This can't be undone.
                                    </span>
                                    {activeBoost && (
                                        <span className="text-theme-danger font-medium bg-theme-danger/10 p-2 rounded-lg mt-1 border border-theme-danger/20 text-sm">
                                            Warning: You will also lose the currently active boost and it cannot be used anymore.
                                        </span>
                                    )}
                                </ConfirmationDialogDescription>
                            </ConfirmationDialogHeader>
                            <ConfirmationDialogFooter className="flex-col w-full gap-3 mt-6 sm:flex-col sm:space-x-0">
                                <AlertDialogPrimitive.Cancel asChild>
                                    <Button 
                                        variant="outline"
                                        className="w-full h-11 rounded-xl bg-theme-surface-2 border border-theme-text/10 text-theme-text hover:bg-theme-surface-2/80 hover:text-theme-text mt-0 text-sm font-semibold"
                                    >
                                        Keep it
                                    </Button>
                                </AlertDialogPrimitive.Cancel>
                                <AlertDialogPrimitive.Action asChild>
                                    <Button 
                                        onClick={onDelete}
                                        className="w-full h-11 rounded-xl bg-theme-danger hover:bg-theme-danger/85 text-white text-sm font-semibold shadow-lg shadow-red-900/20"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Yes, delete habit
                                    </Button>
                                </AlertDialogPrimitive.Action>
                            </ConfirmationDialogFooter>
                        </ConfirmationDialogContent>
                    </ConfirmationDialog>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
