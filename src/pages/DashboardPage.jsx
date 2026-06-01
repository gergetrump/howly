import { CardGrid, CompletionCircle } from '@/components/common';
import { Page, PageSection, Heading } from '@/components/layout';
import { HabitCard } from '@/components/cards';
import { CompanionStage } from '@/components/brand';

export function DashboardPage() {
    function handleHabitCompletion(habitId) {
        // Later: send habit completion update to backend here.
        console.log(`Complete habit: ${habitId}`);
    }

    return (
        <Page background="forest">
            <Heading
                title="Hi, Lisa!"
                subtitle="Let's make today count."
                streakDays={100}
            />

            <CompanionStage name="Howly" />

            <PageSection title="Today's Habits">
                <CardGrid>
                    <HabitCard
                        emoji="💧"
                        title="Drink Water"
                        frequency="Daily"
                        streakDays={0}
                    >
                        <CompletionCircle
                            label="Mark Drink Water complete"
                            onClick={() => handleHabitCompletion('drink-water')}
                        />
                    </HabitCard>
                    <HabitCard
                        emoji="🧘"
                        title="Yoga Session"
                        frequency="Weekly"
                        streakDays={0}
                    >
                        <CompletionCircle
                            label="Mark Yoga Session complete"
                            onClick={() => handleHabitCompletion('yoga-session')}
                        />
                    </HabitCard>
                </CardGrid>
            </PageSection>

            <PageSection title="My Challenges" width="sm">
            </PageSection>
        </Page>
    );
}
