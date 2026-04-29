import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireSiwe } from "@/components/RequireSiwe";
import { AdminPlaceholderPage } from "@/pages/AdminPlaceholderPage";
import { AdminOraclePage } from "@/pages/AdminOraclePage";
import { AdminOracleHealthPage } from "@/pages/AdminOracleHealthPage";
import { AdminDisputesPage } from "@/pages/AdminDisputesPage";
import { LandingPage } from "@/pages/LandingPage";
import { BrowsePage } from "@/pages/BrowsePage";
import { CreateLeagueWizardPage } from "@/pages/CreateLeagueWizardPage";
import { LeagueCreatorDashboardPage } from "@/pages/LeagueCreatorDashboardPage";
import { LeagueDetailPage } from "@/pages/LeagueDetailPage";
import { LeagueEntryPage } from "@/pages/LeagueEntryPage";
import { LeagueClaimPage } from "@/pages/LeagueClaimPage";
import { LeagueLeaderboardPage } from "@/pages/LeagueLeaderboardPage";
import { LeaguePredictPage } from "@/pages/LeaguePredictPage";
import { MyLeaguesPlaceholderPage } from "@/pages/MyLeaguesPlaceholderPage";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/league/:address" element={<LeagueDetailPage />} />
        <Route path="/league/:address/leaderboard" element={<LeagueLeaderboardPage />} />
        <Route
          path="/league/:address/claim"
          element={
            <RequireSiwe>
              <LeagueClaimPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/league/:address/enter"
          element={
            <RequireSiwe>
              <LeagueEntryPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/league/:address/predict"
          element={
            <RequireSiwe>
              <LeaguePredictPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/league/:address/creator"
          element={
            <RequireSiwe>
              <LeagueCreatorDashboardPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/create"
          element={
            <RequireSiwe>
              <CreateLeagueWizardPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/my-leagues"
          element={
            <RequireSiwe>
              <MyLeaguesPlaceholderPage />
            </RequireSiwe>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RequireSiwe>
              <RequireAdmin>
                <Routes>
                  <Route path="" element={<AdminPlaceholderPage />} />
                  <Route path="oracle" element={<AdminOraclePage />} />
                  <Route path="oracle/health" element={<AdminOracleHealthPage />} />
                  <Route path="disputes" element={<AdminDisputesPage />} />
                </Routes>
              </RequireAdmin>
            </RequireSiwe>
          }
        />
      </Routes>
    </AppShell>
  );
}
