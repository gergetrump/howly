import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { CardGrid, CompletionCircle, PlanLimitDialog } from '@/components/common';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { DailyProgressCard } from '@/components/habits/DailyProgressCard.jsx';
import { CompanionStage } from '@/components/brand';
import { AddHabitModal } from '@/components/habits/AddHabitModal.jsx';
import { CompanionChatPanel } from '@/components/habits/CompanionChatPanel.jsx';
import { ShareMomentModal } from '@/components/stories/ShareMomentModal.jsx';
import { NotificationBanner } from '@/components/ui/notification-banner';
import { Card, CardContent } from '@/components/ui/card';
import { getMyHabits, deleteHabit, checkInHabit, uncheckInHabit } from '@/services/habitService';
import { getMyInventory } from '@/services/inventoryApi';
import { getMyActiveStories } from '@/services/storyApi';
import { getCurrentUserPlan } from '@/services/userService';
import { getMyChallengeHabits } from '@/services/challengeService';
import { useAuth } from '@/context/authContext';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

function DashboardChallengeHabitCard({ item, onToggle }) {
    const progressText = `${item.participant?.daysCompleted ?? 0}/${item.challenge?.durationDays ?? 0} days`;

    return (
        <Card className={cn(appCardClassName, item.habit.isCompletedToday && 'bg-emerald-400/10 ring-emerald-300/25')}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{item.habit.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{item.habit.title}</h3>
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

// Group habits by their goal. Habits without a goal come first (no header),
// followed by one group per goal.
function groupHabitsByGoal(list) {
    const byGoal = new Map();
    for (const habit of list) {
        const key = habit.goal || '';
        if (!byGoal.has(key)) {
            byGoal.set(key, []);
        }
        byGoal.get(key).push(habit);
    }

    const groups = [];
    if (byGoal.has('')) {
        groups.push({ goal: null, habits: byGoal.get('') });
    }
    for (const [key, groupHabits] of byGoal) {
        if (key !== '') {
            groups.push({ goal: key, habits: groupHabits });
        }
    }
    return groups;
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user, companion } = useAuth();
    const [habits, setHabits] = useState([]);
    const [challengeHabits, setChallengeHabits] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState(null);
    const [prefillHabit, setPrefillHabit] = useState(null);
    const [consumeSuggestion, setConsumeSuggestion] = useState(null);
    const [allHabitsOpen, setAllHabitsOpen] = useState(false);
    const [milestoneNotice, setMilestoneNotice] = useState(null);
    const [pendingMilestoneNotice, setPendingMilestoneNotice] = useState(null);
    const [storyHabit, setStoryHabit] = useState(null);
    const [equippedItemKeys, setEquippedItemKeys] = useState([]);
    const [limitPrompt, setLimitPrompt] = useState(null);
    const [planInfo, setPlanInfo] = useState(null);
    // Habit ids that already have an active (< 24h) story
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

        getMyInventory()
            .then((inventory) => {
                setEquippedItemKeys(
                    (inventory ?? [])
                        .filter((entry) => entry.equipped)
                        .map((entry) => entry.item?.assetKey)
                        .filter(Boolean),
                );
            })
            .catch((error) => {
                console.error('Failed to load equipped outfit:', error);
            });

        getCurrentUserPlan()
            .then(setPlanInfo)
            .catch((error) => {
                console.error('Failed to load user plan:', error);
            });
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

    async function handleHabitCompletion(habit) {
        try {
            const wasCompleted = habit.isCompletedToday;
            const updatedHabit = wasCompleted
                ? await uncheckInHabit(habit.id)
                : await checkInHabit(habit.id);
            setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit.data : h));

            // Offer to share a story moment after checking off a habit (if none posted yet)
            if (!wasCompleted && !sharedHabitIds.has(habit.id)) {
                setStoryHabit(habit);
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
            await (wasCompleted
                ? uncheckInHabit(item.habit.id)
                : checkInHabit(item.habit.id));

            const response = await getMyChallengeHabits();
            setChallengeHabits(Array.isArray(response) ? response : []);
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

    function renderGoalHeader(goalLabel) {
        return (
            <div className="px-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-howly-primary/15 px-4 py-1.5 text-sm font-bold text-howly-primary ring-1 ring-howly-primary/40">
                    <Sparkles size={15} aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Goal:</span>
                    {goalLabel}
                </span>
            </div>
        );
    }

    function renderHabitCard(habit, withCompletion) {
        return (
            <HabitCard
                key={habit.id}
                emoji={habit.icon}
                title={habit.title}
                frequency={habit.frequency}
                streakDays={habit.streakCount}
                completed={habit.isCompletedToday}
                onEdit={() => handleEdit(habit)}
                onDelete={() => handleDelete(habit.id)}
                onShareStory={
                    habit.isCompletedToday && !sharedHabitIds.has(habit.id)
                        ? () => setStoryHabit(habit)
                        : undefined
                }
            >
                {withCompletion ? (
                    <CompletionCircle
                        completed={habit.isCompletedToday}
                        onClick={() => handleHabitCompletion(habit)}
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

            <PageSection className="mt-6">
                <DailyProgressCard completed={completedCount} total={totalCount} />
            </PageSection>

            <div className={isChatOpen ? 'flex flex-col gap-4 px-4 md:flex-row md:items-start' : ''}>
                <CompanionStage
                    type={companion?.type}
                    name={companion?.name}
                    size={isChatOpen ? 'lg' : 'xl'}
                    equippedItemKeys={equippedItemKeys}
                    className={isChatOpen ? 'md:w-2/5 md:flex-shrink-0' : undefined}
                />

                {isChatOpen && (
                    <CompanionChatPanel
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
                title="Today's Habits" 
                actionLabel="Add Habit"
                onAction={openAddHabitDialog}
            >
                {todaysHabits.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No habits scheduled for today. Take a break!</p>
                ) : (
                    <div className="space-y-4">
                        {groupHabitsByGoal(todaysHabits).map((group) => (
                            <div key={group.goal ?? '__ungrouped'} className="space-y-2">
                                {group.goal ? renderGoalHeader(group.goal) : null}
                                <CardGrid columns={group.habits.length === 1 ? 1 : 2}>
                                    {group.habits.map((habit) => renderHabitCard(habit, true))}
                                </CardGrid>
                            </div>
                        ))}
                    </div>
                )}
            </PageSection>

            <div className="px-4">
                <button
                    type="button"
                    onClick={() => setAllHabitsOpen(prev => !prev)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
                >
                    <span className="text-base font-semibold text-white">All Habits <span className="text-sm font-normal text-slate-400">({habits.length})</span></span>
                    <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-200 ${allHabitsOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                {allHabitsOpen && (
                    <div className="mt-4 space-y-4">
                        {habits.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No habits yet. Click "Add Habit" to start!</p>
                        ) : (
                            groupHabitsByGoal(habits).map((group) => (
                                <div key={group.goal ?? '__ungrouped'} className="space-y-2">
                                    {group.goal ? renderGoalHeader(group.goal) : null}
                                    <CardGrid columns={group.habits.length === 1 ? 1 : 2}>
                                        {group.habits.map((habit) => renderHabitCard(habit, false))}
                                    </CardGrid>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <PageSection title="My Challenges" width="sm">
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
                        // Came from an AI suggestion → drop it from the panel now that it's saved.
                        if (consumeSuggestion) {
                            consumeSuggestion();
                            setConsumeSuggestion(null);
                        }
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
        </Page>
    );
}
