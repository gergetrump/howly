/**
 * Defines the central routing structure of the Howly frontend.
 *
 * Public pages such as landing, login, and registration are rendered inside
 * the AuthLayout. Application pages such as dashboard, social, shop,
 * challenges, and profile are grouped under ProtectedRoute and PageLayout.
 *
 * The actual page implementations are intentionally kept separate in
 * src/pages so routing, layout, and page content stay clearly separated.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SocialPage } from '@/pages/SocialPage';
import { ShopPage } from '@/pages/ShopPage';
import { ChallengesPage } from '@/pages/ChallengesPage';
import { ProfilePage } from '@/pages/ProfilePage';

export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<PageLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/social" element={<SocialPage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/challenges" element={<ChallengesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}