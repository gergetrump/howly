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
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

export function HabitCard({
    emoji = '🔥',
    title,
    frequency,
    streakDays = 0,
    completed = false,
    onEdit,
    onDelete,
    onShareStory,
    children,
}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    return (
        <Card className={cn(appCardClassName, completed && 'bg-pink-500/20 ring-pink-300/30')}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{emoji}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{title}</h3>
                        {frequency ? <Badge variant="secondary">{frequency}</Badge> : null}
                    </div>
                    <StreakBadge days={streakDays} icon="🔥" className="mt-1" />
                </div>

                <div className="flex items-center gap-1">
                    {children}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-slate-800 bg-slate-950 text-slate-300">
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer focus:bg-slate-800 focus:text-white">
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Habit
                            </DropdownMenuItem>
                            {onShareStory ? (
                                <DropdownMenuItem onClick={onShareStory} className="cursor-pointer focus:bg-slate-800 focus:text-white">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Share Story
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem 
                                onClick={() => setIsDeleteDialogOpen(true)} 
                                className="cursor-pointer text-red-400 focus:bg-red-400/10 focus:text-red-400"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Habit
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <ConfirmationDialogContent className="bg-[#1e1b3a] border-0 text-white rounded-3xl p-8 sm:max-w-md flex flex-col items-center text-center shadow-2xl">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-2 border border-red-500/20">
                                <Trash2 className="h-8 w-8 text-red-400" />
                            </div>
                            <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                                <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete this habit?</ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-base text-slate-300 text-center">
                                    Your streak and all progress for <strong className="text-white font-semibold">{title}</strong> will be lost forever. This can't be undone.
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
                </div>
            </CardContent>
        </Card>
    );
}
