/**
 * Defines the central routing structure of the Howly frontend.
 *
 * Public pages such as landing, login, and registration are rendered inside
 * the AuthLayout. Application pages such as dashboard, social, shop,
 * inventory, challenges, and profile are grouped under ProtectedRoute and PageLayout.
 *
 * The actual page implementations are intentionally kept separate in
 * src/pages so routing, layout, and page content stay clearly separated.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout.jsx';
import { PageLayout } from '@/components/layout/PageLayout.jsx';
import { ProtectedRoute } from '@/routes/ProtectedRoute.jsx';
import { LandingPage } from '@/pages/landingPage';
import { LoginPage } from '@/pages/loginPage';
import { RegisterPage } from '@/pages/registerPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage.jsx';
import { DashboardPage } from '@/pages/dashboardPage';
import { SocialPage } from '@/pages/SocialPage.jsx';
import { ShopPage } from '@/pages/shopPage';
import { InventoryPage } from '@/pages/InventoryPage.jsx';
import { ChallengesPage } from '@/pages/ChallengesPage.jsx';
import { AnalyticsPage } from '@/pages/AnalyticsPage.jsx';
import { ProfilePage } from '@/pages/profilePage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { CompanionSelectionPage } from '@/pages/CompanionSelectionPage.jsx';
import { HabitSelectionPage } from '@/pages/HabitSelectionPage.jsx';
import { PremiumPage } from '@/pages/PremiumPage.jsx';
import { StoryArchivePage } from '@/pages/StoryArchivePage.jsx';

export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/onboarding/habits" element={<HabitSelectionPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route path="/onboarding/companion" element={<CompanionSelectionPage />} />


                <Route element={<PageLayout />}>

                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/social" element={<SocialPage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/challenges" element={<ChallengesPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/stories" element={<StoryArchivePage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
