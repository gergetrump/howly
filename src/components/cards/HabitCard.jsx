import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, Camera } from 'lucide-react';
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
import { StreakShieldIcon } from '@/components/brand/StreakShieldIcon.jsx';
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
    onUseFreeze,
    onEdit,
    onDelete,
    onShareStory,
    activeBoost = null,
    children,
}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const hasMenuActions = Boolean(onEdit || onDelete || onShareStory);

    return (
        <Card className={cn(appCardClassName, completed && 'bg-[#23423b] ring-emerald-300/25', atRisk && !completed && 'bg-[#42392c] ring-amber-400/30')}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{emoji}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{title}</h3>
                        <div className="flex items-center gap-1.5">
                            {frequency ? <Badge variant="secondary">{frequency}</Badge> : null}
                            {category ? (
                                <Badge className="border border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/15">
                                    {category}
                                </Badge>
                            ) : null}
                            {activeBoost ? (
                                <Badge className="bg-slate-700 hover:bg-slate-800 text-white border-0 font-medium capitalize text-[10px] py-0 h-5 px-1.5 flex gap-1 items-center">
                                    {renderShopItemVisual(activeBoost, 'h-3 w-3')}
                                    {activeBoost.assetKey.replace('-', ' ')} &bull; {activeBoost.remainingCompletions} left
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                    <StreakBadge days={streakDays} icon="🔥" className="mt-1" />
                </div>

                <div className="flex items-center gap-1">
                    {atRisk && onUseFreeze ? (
                        <button
                            type="button"
                            onClick={onUseFreeze}
                            className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition-colors hover:bg-amber-400/25"
                            title="Use a streak shield to save this streak"
                        >
                            <StreakShieldIcon className="h-3.5 w-auto" />
                            Save streak
                        </button>
                    ) : null}
                    {children}
                    {hasMenuActions ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-slate-800 bg-slate-950 text-slate-300">
                            {onEdit ? (
                                <DropdownMenuItem onClick={onEdit} className="cursor-pointer focus:bg-slate-800 focus:text-white">
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit Habit
                                </DropdownMenuItem>
                            ) : null}
                            {onShareStory ? (
                                <DropdownMenuItem onClick={onShareStory} className="cursor-pointer focus:bg-slate-800 focus:text-white">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Share Story
                                </DropdownMenuItem>
                            ) : null}
                            {onDelete ? (
                                <DropdownMenuItem
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="cursor-pointer text-red-400 focus:bg-red-400/10 focus:text-red-400"
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
                        <ConfirmationDialogContent className="bg-[#1e1b3a] border-0 text-white rounded-3xl p-8 sm:max-w-md flex flex-col items-center text-center shadow-2xl">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-2 border border-red-500/20">
                                <Trash2 className="h-8 w-8 text-red-400" />
                            </div>
                            <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                                <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete this habit?</ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-base text-slate-300 text-center flex flex-col gap-2">
                                    <span>
                                        Your streak and all progress for <strong className="text-white font-semibold">{title}</strong> will be lost forever. This can't be undone.
                                    </span>
                                    {activeBoost && (
                                        <span className="text-red-400 font-medium bg-red-400/10 p-2 rounded-lg mt-1 border border-red-400/20 text-sm">
                                            Warning: You will also lose the currently active boost and it cannot be used anymore.
                                        </span>
                                    )}
                                </ConfirmationDialogDescription>
                            </ConfirmationDialogHeader>
                            <ConfirmationDialogFooter className="flex-col w-full gap-3 mt-8 sm:flex-col sm:space-x-0">
                                <AlertDialogPrimitive.Cancel asChild>
                                    <Button 
                                        variant="outline"
                                        className="w-full h-14 rounded-full bg-[#2a2746] border border-slate-700/50 text-white hover:bg-[#343155] hover:text-white mt-0 text-lg font-semibold"
                                    >
                                        Keep it
                                    </Button>
                                </AlertDialogPrimitive.Cancel>
                                <AlertDialogPrimitive.Action asChild>
                                    <Button 
                                        onClick={onDelete}
                                        className="w-full h-14 rounded-full bg-[#d65d53] hover:bg-[#c2534a] text-white text-lg font-semibold shadow-lg shadow-red-900/20"
                                    >
                                        <Trash2 className="mr-2 h-5 w-5" /> Yes, delete habit
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
