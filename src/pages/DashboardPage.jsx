import { useState, useEffect } from 'react';
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

    const completedCount = habits.filter(h => h.isCompletedToday).length;
    const totalCount = habits.length;

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
                        >
                            <CompletionCircle
                                completed={habit.isCompletedToday}
                                onClick={() => handleHabitCompletion(habit)}
                                aria-label={`Mark ${habit.title} as completed`}
                            />
                        </HabitCard>
                    ))}
                    {habits.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">No habits yet. Click "Add Habit" to start!</p>
                    )}
                </CardGrid>
            </PageSection>

            <PageSection title="My Challenges" width="sm">
            </PageSection>

            <AddHabitModal 
                open={isAddModalOpen} 
                onOpenChange={setIsAddModalOpen}
                editHabit={habitToEdit}
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
