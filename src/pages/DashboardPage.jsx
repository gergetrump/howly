import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CardGrid, CompletionCircle } from '@/components/common';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { DailyProgressCard } from '@/components/habits/DailyProgressCard.jsx';
import { CompanionStage } from '@/components/brand';
import { AddHabitModal } from '@/components/habits/addHabitModal';
import { getMyHabits, deleteHabit, checkInHabit, uncheckInHabit } from '@/services/habitService';
import { useAuth } from '@/context/authContext';

export function DashboardPage() {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState(null);
    const [allHabitsOpen, setAllHabitsOpen] = useState(false);

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
    }, []);

    async function handleHabitCompletion(habit) {
        try {
            const updatedHabit = habit.isCompletedToday
                ? await uncheckInHabit(habit.id)
                : await checkInHabit(habit.id);
            setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit.data : h));
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

            <PageSection className="mt-6">
                <DailyProgressCard completed={completedCount} total={totalCount} />
            </PageSection>

            <CompanionStage name="Howly" />

            <PageSection 
                title="Today's Habits" 
                actionLabel="Add Habit"
                onAction={() => {
                    setHabitToEdit(null);
                    setIsAddModalOpen(true);
                }}
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
                        >
                            <CompletionCircle
                                completed={habit.isCompletedToday}
                                onClick={() => handleHabitCompletion(habit)}
                                aria-label={`Mark ${habit.title} as completed`}
                            />
                        </HabitCard>
                    ))}
                    {todaysHabits.length === 0 && (
                        <p className="text-sm text-theme-text-muted text-center py-4">No habits scheduled for today. Take a break!</p>
                    )}
                </CardGrid>
            </PageSection>

            <div className="px-4">
                <button
                    type="button"
                    onClick={() => setAllHabitsOpen(prev => !prev)}
                    className="flex w-full items-center justify-between rounded-xl bg-theme-text/5 px-4 py-3 text-left transition-colors hover:bg-theme-text/10"
                >
                    <span className="text-base font-semibold text-theme-text">All Habits <span className="text-sm font-normal text-theme-text-muted">({habits.length})</span></span>
                    <ChevronDown
                        size={20}
                        className={`text-theme-text-muted transition-transform duration-200 ${allHabitsOpen ? 'rotate-180' : ''}`}
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
                                    />
                            ))}
                            {habits.length === 0 && (
                                <p className="text-sm text-theme-text-muted text-center py-4">No habits yet. Click "Add Habit" to start!</p>
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
        </Page>
    );
}
