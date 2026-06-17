import { useState, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { CardGrid, CompletionCircle } from '@/components/common';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { DailyProgressCard } from '@/components/habits/DailyProgressCard.jsx';
import { CompanionStage } from '@/components/brand';
import { AddHabitModal } from '@/components/habits/AddHabitModal.jsx';
import { CompanionChatPanel } from '@/components/habits/CompanionChatPanel.jsx';
import { ShareMomentModal } from '@/components/stories/ShareMomentModal.jsx';
import { NotificationBanner } from '@/components/ui/notification-banner';
import { getMyHabits, deleteHabit, checkInHabit, uncheckInHabit } from '@/services/habitService';
import { getMyInventory } from '@/services/inventoryApi';
import { getMyActiveStories } from '@/services/storyApi';
import { useAuth } from '@/context/authContext';

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
    const { user, companion } = useAuth();
    const isPremium = user?.isPremium === true || user?.role === 'admin';
    const [habits, setHabits] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState(null);
    const [prefillHabit, setPrefillHabit] = useState(null);
    const [allHabitsOpen, setAllHabitsOpen] = useState(false);
    const [milestoneNotice, setMilestoneNotice] = useState(null);
    const [pendingMilestoneNotice, setPendingMilestoneNotice] = useState(null);
    const [storyHabit, setStoryHabit] = useState(null);
    const [equippedItemKeys, setEquippedItemKeys] = useState([]);
    // Habit ids that already have an active (< 24h) story
    const [sharedHabitIds, setSharedHabitIds] = useState(new Set());

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
        setPrefillHabit(null);
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
                        onEditSuggestion={(suggestion) => {
                            setHabitToEdit(null);
                            setPrefillHabit(suggestion);
                            setIsAddModalOpen(true);
                        }}
                    />
                )}
            </div>

            {!isChatOpen && isPremium && (
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
                onAction={() => {
                    setHabitToEdit(null);
                    setPrefillHabit(null);
                    setIsAddModalOpen(true);
                }}
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
        </Page>
    );
}
