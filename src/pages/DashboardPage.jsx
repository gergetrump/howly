import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { CardGrid, CompletionCircle, PlanLimitDialog } from '@/components/common';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { DailyProgressCard } from '@/components/habits/DailyProgressCard.jsx';
import { CompanionStage } from '@/components/brand';
import { AddHabitModal } from '@/components/habits/AddHabitModal.jsx';
import { ShareMomentModal } from '@/components/stories/ShareMomentModal.jsx';
import { NotificationBanner } from '@/components/ui/notification-banner';
import { getMyHabits, deleteHabit, checkInHabit, uncheckInHabit } from '@/services/habitService';
import { getMyInventory } from '@/services/inventoryApi';
import { getMyActiveStories } from '@/services/storyApi';
import { getCurrentUserPlan } from '@/services/userService';
import { useAuth } from '@/context/authContext';

export function DashboardPage() {
    const navigate = useNavigate();
    const { user, companion } = useAuth();
    const [habits, setHabits] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState(null);
    const [allHabitsOpen, setAllHabitsOpen] = useState(false);
    const [milestoneNotice, setMilestoneNotice] = useState(null);
    const [pendingMilestoneNotice, setPendingMilestoneNotice] = useState(null);
    const [storyHabit, setStoryHabit] = useState(null);
    const [equippedItemConfigs, setEquippedItemConfigs] = useState([]);
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
                setEquippedItemConfigs(
                    (inventory ?? [])
                        .filter((entry) => entry.equipped)
                        .map((entry) => ({
                            assetKey: entry.item?.assetKey,
                            customization: entry.customization ?? {},
                        }))
                        .filter((item) => item.assetKey),
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
        setIsAddModalOpen(true);
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

            <CompanionStage
                type={companion?.type}
                name={companion?.name}
                equippedItemConfigs={equippedItemConfigs}
            />

            <PageSection 
                title="Today's Habits" 
                actionLabel="Add Habit"
                onAction={openAddHabitDialog}
            >
                <CardGrid columns={todaysHabits.length === 1 ? 1 : 2}>
                    {todaysHabits.map((habit) => (
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
                            <CompletionCircle
                                completed={habit.isCompletedToday}
                                onClick={() => handleHabitCompletion(habit)}
                                aria-label={`Mark ${habit.title} as completed`}
                            />
                        </HabitCard>
                    ))}
                    {todaysHabits.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">No habits scheduled for today. Take a break!</p>
                    )}
                </CardGrid>
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
                    <div className="mt-4">
                        <CardGrid columns={habits.length === 1 ? 1 : 2}>
                            {habits.map((habit) => (
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
                                    />
                            ))}
                            {habits.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">No habits yet. Click "Add Habit" to start!</p>
                            )}
                        </CardGrid>
                    </div>
                )}
            </div>

            <PageSection title="My Challenges" width="sm">
            </PageSection>

            <AddHabitModal 
                open={isAddModalOpen} 
                onOpenChange={setIsAddModalOpen}
                editHabit={habitToEdit}
                existingHabits={habits}
                onHabitAdded={(savedHabit, isEdit) => {
                    if (isEdit) {
                        setHabits(prev => prev.map(h => h.id === savedHabit.id ? savedHabit : h));
                    } else {
                        setHabits(prev => [savedHabit, ...prev]);
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
