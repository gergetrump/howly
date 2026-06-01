import { Page, PageSection, Heading } from '@/components/layout';

export function ProfilePage() {
    return (
        <Page background="forest">
            <Heading title="Profile" subtitle="Manage your Howly account." streakDays={100}/>
            <PageSection title="Account">
                <p className="text-sm text-slate-300">Profile details will go here.</p>
            </PageSection>
        </Page>
    );
}
