import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { CardGrid, CompletionCircle, PlanLimitDialog } from '@/components/common';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { DailyProgressCard } from '@/components/habits/DailyProgressCard.jsx';
import { CompanionStage } from '@/components/brand';
import { AddHabitModal } from '@/components/habits/AddHabitModal.jsx';
import { CompanionChatPanel } from '@/components/habits/CompanionChatPanel.jsx';
import { StreakRepairBanner } from '@/components/habits/StreakRepairBanner.jsx';
import { ShareMomentModal } from '@/components/stories/ShareMomentModal.jsx';



import { toast } from 'sonner';
import { NotificationBanner } from '@/components/ui/notification-banner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getMyHabits, deleteHabit, checkInHabit, uncheckInHabit, waitForHabitTaxonomy } from '@/services/habitService';
import { applyHabitStreakFreeze } from '@/services/streakFreezeApi';
import { getCurrentUser, getCurrentUserPlan } from '@/services/userService';
import { getMyInventory } from '@/services/inventoryApi';
import { getMyActiveStories } from '@/services/storyApi';
import { getMyChallengeHabits } from '@/services/challengeService';
import { useAuth } from '@/context/authContext';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { getEquippedItemConfigsFromInventory } from '@/lib/inventoryItems';

function DashboardChallengeHabitCard({ item, onToggle }) {
    const progressText = `${item.participant?.daysCompleted ?? 0}/${item.challenge?.durationDays ?? 0} days`;

    return (
        <Card className={cn(appCardClassName, item.habit.isCompletedToday && 'bg-[#23423b] ring-emerald-300/25')}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{item.habit.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-white">{item.habit.title}</h3>
                        {item.habit.category ? (
                            <Badge className="border border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/15">
                                {item.habit.category}
                            </Badge>
                        ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-300">{item.challenge?.title}</p>
                    <StreakBadge days={item.participant?.daysCompleted ?? 0} icon={'\uD83D\uDD25'} className="mt-1" />
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-white">{progressText}</span>
                    <CompletionCircle
                        completed={item.habit.isCompletedToday}
                        onClick={() => onToggle(item)}
                        label={`Mark ${item.habit.title} challenge habit as completed`}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user, companion, setUser } = useAuth();
    const [habits, setHabits] = useState([]);
    const [challengeHabits, setChallengeHabits] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState(null);
    const [prefillHabit, setPrefillHabit] = useState(null);
    const [consumeSuggestion, setConsumeSuggestion] = useState(null);
    const [habitsTab, setHabitsTab] = useState('today');
    const [milestoneNotice, setMilestoneNotice] = useState(null);
    const [pendingMilestoneNotice, setPendingMilestoneNotice] = useState(null);
    const [storyHabit, setStoryHabit] = useState(null);
    const [riskConfirmHabit, setRiskConfirmHabit] = useState(null);
    const [equippedItemConfigs, setEquippedItemConfigs] = useState([]);
    const [limitPrompt, setLimitPrompt] = useState(null);
    const [planInfo, setPlanInfo] = useState(null);
    // Habit ids that already have an active story in the 7-day feed window
    const [sharedHabitIds, setSharedHabitIds] = useState(new Set());
    const planLimits = planInfo?.currentPlan?.limits;
    const isPremiumUser = planInfo?.currentPlanKey === 'premium' || user?.role === 'admin' || user?.isPremium === true;

    useEffect(() => {
        async function fetchHabits() {
            try {
                const response = await getMyHabits();
                setHabits(response.data || []);
            } catch (error) {
                console.error('Failed to load habits:', error);
            }
        }
        fetchHabits();

        async function fetchChallengeHabits() {
            try {
                const response = await getMyChallengeHabits();
                setChallengeHabits(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error('Failed to load challenge habits:', error);
            }
        }
        fetchChallengeHabits();

        getMyActiveStories()
            .then((stories) => {
                setSharedHabitIds(
                    new Set(
                        (stories ?? [])
                            .filter((story) => story.sourceType === 'habit')
                            .map((story) => story.sourceId),
                    ),
                );
            })
            .catch((error) => {
                console.error('Failed to load active stories:', error);
            });

        getCurrentUserPlan()
            .then(setPlanInfo)
            .catch((error) => {
                console.error('Failed to load user plan:', error);
            });
    }, []);

    useEffect(() => {
        let isCurrent = true;

        async function fetchEquippedOutfit() {
            try {
                const inventory = await getMyInventory();

                if (isCurrent) {
                    setEquippedItemConfigs(getEquippedItemConfigsFromInventory(inventory));
                }
            } catch (error) {
                console.error('Failed to load equipped outfit:', error);
            }
        }

        fetchEquippedOutfit();
        window.addEventListener('howly:outfit-updated', fetchEquippedOutfit);

        return () => {
            isCurrent = false;
            window.removeEventListener('howly:outfit-updated', fetchEquippedOutfit);
        };
    }, []);

    useEffect(() => {
        if (!pendingMilestoneNotice) {
            return undefined;
        }

        const timeout = setTimeout(() => {
            setMilestoneNotice(pendingMilestoneNotice);
            setPendingMilestoneNotice(null);
        }, 500);

        return () => clearTimeout(timeout);
    }, [pendingMilestoneNotice]);

    useEffect(() => {
        const usedAt = user?.streakShieldAutoUsedAt;

        if (!usedAt) {
            return;
        }

        const storageKey = 'howly_shield_notice_seen';

        if (localStorage.getItem(storageKey) === String(usedAt)) {
            return;
        }

        localStorage.setItem(storageKey, String(usedAt));
        toast('🛡️ A streak shield saved your streak', {
            description: `Your ${user?.streak ?? 0}-day streak is safe.`,
        });
    }, [user?.streakShieldAutoUsedAt, user?.streak]);

    // After a check-in the day may be complete → refetch the user so the overall
    // streak (🔥) in the header updates right away. Uses a direct fetch (not
    // refreshUser) to avoid the full-screen loading state in ProtectedRoute.
    async function refreshUserStreak() {
        try {
            const freshUser = await getCurrentUser();
            setUser(freshUser.user ?? freshUser);
        } catch (error) {
            console.error('Failed to refresh overall streak:', error);
        }
    }

    async function refreshHabitsAndUser() {
        try {
            const [habitsResponse, freshUser] = await Promise.all([getMyHabits(), getCurrentUser()]);
            setHabits(habitsResponse.data || []);
            setUser(freshUser.user ?? freshUser);
        } catch (error) {
            console.error('Failed to refresh after streak rescue:', error);
        }
    }

    async function handleUseHabitFreeze(habit) {
        try {
            await applyHabitStreakFreeze(habit.id);
            await refreshHabitsAndUser();
        } catch (error) {
            console.error('Failed to use streak freeze:', error);
        }
    }

    function handleCompletionClick(habit) {
        if (!habit.isCompletedToday && habit.streakRepairDeadline) {
            setRiskConfirmHabit(habit);
            return;
        }
        handleHabitCompletion(habit);
    }

    async function handleHabitCompletion(habit) {
        try {
            const wasCompleted = habit.isCompletedToday;
            const updatedHabit = wasCompleted
                ? await uncheckInHabit(habit.id)
                : await checkInHabit(habit.id);
            setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit.data : h));

            if (!wasCompleted && updatedHabit.boostReward?.coins !== undefined) {
                setUser(current => (current ? { ...current, coins: updatedHabit.boostReward.coins } : current));
            }

            if (wasCompleted && updatedHabit.boostReverted?.coins !== undefined) {
                setUser(current => (current ? { ...current, coins: updatedHabit.boostReverted.coins } : current));
            }

            // A check-in can complete the day → refresh the overall streak (🔥).
            if (!wasCompleted) {
                refreshUserStreak();
                window.dispatchEvent(new Event('howly:habit-completed'));
            }

            // Offer to share a story moment after checking off a habit (if none posted yet)
            if (!wasCompleted && !sharedHabitIds.has(habit.id)) {
                toast('Capture this moment? 📸', {
                    description: habit.title,
                    action: {
                        label: 'Add photo',
                        onClick: () => setStoryHabit(habit),
                    },
                });
            }

            if (!habit.isCompletedToday && updatedHabit.milestonePost) {
                setPendingMilestoneNotice({
                    ...updatedHabit.milestonePost,
                    habitTitle: `${updatedHabit.data.frequency} ${updatedHabit.milestonePost.habit?.title ?? updatedHabit.milestonePost.habitTitle}`,
                });
            }
        } catch (error) {
            console.error('Failed to complete habit:', error);
            // Optionally show toast error here
        }
    }

    async function handleChallengeHabitCompletion(item) {
        try {
            const wasCompleted = item.habit.isCompletedToday;
            const updatedHabit = await (wasCompleted
                ? uncheckInHabit(item.habit.id)
                : checkInHabit(item.habit.id));

            if (!wasCompleted && updatedHabit.boostReward?.coins !== undefined) {
                setUser(current => (current ? { ...current, coins: updatedHabit.boostReward.coins } : current));
            }

            if (wasCompleted && updatedHabit.boostReverted?.coins !== undefined) {
                setUser(current => (current ? { ...current, coins: updatedHabit.boostReverted.coins } : current));
            }

            const response = await getMyChallengeHabits();
            setChallengeHabits(Array.isArray(response) ? response : []);

            // A check-in can complete the day → refresh the overall streak (🔥).
            if (!wasCompleted) {
                refreshUserStreak();
                window.dispatchEvent(new Event('howly:habit-completed'));
            }
        } catch (error) {
            console.error('Failed to complete challenge habit:', error);
        }
    }

    async function handleDelete(habitId) {
        try {
            await deleteHabit(habitId);
            setHabits(prev => prev.filter(h => h.id !== habitId));
        } catch (error) {
            console.error('Failed to delete habit:', error);
        }
    }

    function handleEdit(habit) {
        setHabitToEdit(habit);
        setPrefillHabit(null);
        setConsumeSuggestion(null);
        setIsAddModalOpen(true);
    }

    function refreshHabitTaxonomyInBackground(habitId) {
        void waitForHabitTaxonomy(habitId).then((updated) => {
            if (!updated) {
                return;
            }
            setHabits((prev) => prev.map((habit) => (habit.id === habitId ? updated : habit)));
        });
    }

    function renderHabitCard(habit, withCompletion) {
        return (
            <HabitCard
                key={habit.id}
                emoji={habit.icon}
                title={habit.title}
                frequency={habit.frequency}
                category={habit.category}
                streakDays={habit.streakCount}
                completed={habit.isCompletedToday}
                atRisk={Boolean(habit.streakRepairDeadline)}
                onUseFreeze={() => handleUseHabitFreeze(habit)}
                onEdit={() => handleEdit(habit)}
                onDelete={() => handleDelete(habit.id)}
                activeBoost={habit.activeBoost}
                onShareStory={
                    habit.isCompletedToday && !sharedHabitIds.has(habit.id)
                        ? () => setStoryHabit(habit)
                        : undefined
                }
            >
                {withCompletion ? (
                    <CompletionCircle
                        completed={habit.isCompletedToday}
                        onClick={() => handleCompletionClick(habit)}
                        aria-label={`Mark ${habit.title} as completed`}
                    />
                ) : null}
            </HabitCard>
        );
    }

    function openAddHabitDialog() {
        const maxHabits = planLimits?.maxHabits;

        if (maxHabits && habits.length >= maxHabits) {
            if (isPremiumUser) {
                setLimitPrompt({
                    title: 'Habit limit reached',
                    message: `Premium users can create up to ${maxHabits} habits. Delete an existing habit before creating a new one.`,
                });
                return;
            }

            const premiumHabitLimit = planInfo?.plans?.premium?.limits?.maxHabits;
            navigate('/premium', {
                state: {
                    message: `Free users can create up to ${maxHabits} habits. Upgrade to Premium${premiumHabitLimit ? ` to create up to ${premiumHabitLimit} habits` : ''}.`,
                    returnTo: '/dashboard',
                },
            });
            return;
        }

        setHabitToEdit(null);
        setPrefillHabit(null);
        setConsumeSuggestion(null);
        setIsAddModalOpen(true);
    }

    const now = new Date();
    const currentDay = now.getDay() || 7; // 1-7 (Mon-Sun)

    const todaysHabits = habits.filter(h => {
        if (h.frequency === 'Custom' && h.customDays && h.customDays.length > 0) {
            return h.customDays.includes(currentDay);
        }
        return true;
    });

    const completedCount = todaysHabits.filter(h => h.isCompletedToday).length;
    const totalCount = todaysHabits.length;

    return (
        <Page theme="forest">
            <Heading
                title={`Hi, ${user?.firstName || 'User'}!`}
                subtitle="Let's make today count."
                streakDays={user?.streak ?? 0}
            />

            {milestoneNotice ? (
                <div className="fixed right-6 top-24 z-[9999] w-[min(92vw,520px)]">
                    <NotificationBanner
                        variant="milestone"
                        icon="🎉"
                        eyebrow={`Congrats! You unlocked a ${milestoneNotice.streakDays}-day milestone`}
                        title={milestoneNotice.habitTitle}
                        onClose={() => setMilestoneNotice(null)}
                        autoCloseMs={10000}
                    />
                </div>
            ) : null}

            <StreakRepairBanner onRescued={refreshHabitsAndUser} />

            <PageSection className="mt-6">
                <DailyProgressCard completed={completedCount} total={totalCount} />
            </PageSection>

            <div className={isChatOpen ? 'flex flex-col items-center gap-4 px-4 md:flex-row md:items-start' : ''}>
                <CompanionStage
                    type={companion?.type}
                    name={companion?.name}
                    size="xl"
                    equippedItemConfigs={equippedItemConfigs}
                    className={isChatOpen ? 'md:flex-shrink-0' : undefined}
                />

                {isChatOpen && (
                    <div className="flex w-full min-w-0 justify-center md:flex-1">
                        <CompanionChatPanel
                            className="max-w-2xl"
                            companionName={companion?.name}
                            onClose={() => setIsChatOpen(false)}
                            onHabitAdded={(habit) => setHabits((prev) => [habit, ...prev])}
                            onEditSuggestion={(suggestion, removeFromPanel) => {
                                setHabitToEdit(null);
                                setPrefillHabit(suggestion);
                                setConsumeSuggestion(() => removeFromPanel);
                                setIsAddModalOpen(true);
                            }}
                        />
                    </div>
                )}
            </div>

            {!isChatOpen && isPremiumUser && (
                <div className="flex justify-center px-4">
                    <button
                        type="button"
                        onClick={() => setIsChatOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:-translate-y-0.5 hover:from-purple-700 hover:to-purple-600"
                    >
                        <Sparkles size={16} />
                        Ask {companion?.name || 'Howly'} for habit ideas
                    </button>
                </div>
            )}

            <PageSection
                title="My Habits"
                actionLabel="Add Habit"
                onAction={openAddHabitDialog}
            >
                <Tabs value={habitsTab} onValueChange={setHabitsTab}>
                    <TabsList className="w-full border border-white/10 bg-white/10 text-white">
                        <TabsTrigger
                            value="today"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            Today ({todaysHabits.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="all"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            All Habits ({habits.length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {habitsTab === 'today' ? (
                    todaysHabits.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No habits scheduled for today. Take a break!</p>
                    ) : (
                        <CardGrid columns={todaysHabits.length === 1 ? 1 : 2}>
                            {todaysHabits.map((habit) => renderHabitCard(habit, true))}
                        </CardGrid>
                    )
                ) : habits.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No habits yet. Click "Add Habit" to start!</p>
                ) : (
                    <CardGrid columns={habits.length === 1 ? 1 : 2}>
                        {habits.map((habit) => renderHabitCard(habit, false))}
                    </CardGrid>
                )}
            </PageSection>

            <PageSection title="My Challenges">
                <CardGrid columns={challengeHabits.length === 1 ? 1 : 2}>
                    {challengeHabits.map((item) => (
                        <DashboardChallengeHabitCard
                            key={item.participant.id}
                            item={item}
                            onToggle={handleChallengeHabitCompletion}
                        />
                    ))}
                    {challengeHabits.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">No active challenge habits yet.</p>
                    )}
                </CardGrid>
            </PageSection>

            <AddHabitModal 
                open={isAddModalOpen} 
                onOpenChange={setIsAddModalOpen}
                editHabit={habitToEdit}
                prefill={prefillHabit}
                existingHabits={habits}
                onHabitAdded={(savedHabit, isEdit) => {
                    if (isEdit) {
                        setHabits(prev => prev.map(h => h.id === savedHabit.id ? savedHabit : h));
                    } else {
                        setHabits(prev => [savedHabit, ...prev]);
                        if (consumeSuggestion) {
                            consumeSuggestion();
                            setConsumeSuggestion(null);
                        }
                    }
                    if (!savedHabit.category) {
                        refreshHabitTaxonomyInBackground(savedHabit.id);
                    }
                }}
            />

            <ShareMomentModal
                open={Boolean(storyHabit)}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setStoryHabit(null);
                    }
                }}
                sourceType="habit"
                sourceId={storyHabit?.id}
                sourceTitle={storyHabit?.title}
                sourceEmoji={storyHabit?.icon}
                onPosted={(story) => {
                    if (story?.sourceId) {
                        setSharedHabitIds((prev) => new Set(prev).add(story.sourceId));
                    }
                }}
            />

            <PlanLimitDialog
                open={Boolean(limitPrompt)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setLimitPrompt(null);
                    }
                }}
                title={limitPrompt?.title}
                message={limitPrompt?.message}
            />

            <Dialog open={Boolean(riskConfirmHabit)} onOpenChange={(open) => { if (!open) setRiskConfirmHabit(null); }}>
                <DialogContent className="rounded-3xl border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-md">
                    <DialogHeader className="space-y-3 pt-4 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight">Your streak is at risk</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed text-slate-300">
                            Completing “{riskConfirmHabit?.title}” now starts a new streak at 1. Your current {riskConfirmHabit?.streakCount}-day streak can still be saved with a shield.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-7 flex w-full flex-col gap-3">
                        {(user?.streakShields ?? 0) > 0 ? (
                            <Button
                                className="h-14 w-full rounded-full bg-amber-400 text-lg font-semibold text-amber-950 shadow-lg shadow-amber-900/20 hover:bg-amber-300"
                                onClick={() => { const target = riskConfirmHabit; setRiskConfirmHabit(null); handleUseHabitFreeze(target); }}
                            >
                                Save streak
                            </Button>
                        ) : (
                            <Button
                                className="h-14 w-full rounded-full bg-amber-400 text-lg font-semibold text-amber-950 shadow-lg shadow-amber-900/20 hover:bg-amber-300"
                                onClick={() => { setRiskConfirmHabit(null); navigate('/shop?category=powerUp'); }}
                            >
                                Get a shield
                            </Button>
                        )}
                        <Button
                            className="h-14 w-full rounded-full border border-slate-700/50 bg-[#2a2746] text-lg font-semibold text-white hover:bg-[#343155] hover:text-white"
                            onClick={() => { const target = riskConfirmHabit; setRiskConfirmHabit(null); handleHabitCompletion(target); }}
                        >
                            Complete & restart
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-12 w-full rounded-full text-slate-300 hover:bg-white/5 hover:text-white"
                            onClick={() => setRiskConfirmHabit(null)}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
