import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireSiwe } from "@/components/RequireSiwe";
import { AdminPlaceholderPage } from "@/pages/AdminPlaceholderPage";
import { LandingPage } from "@/pages/LandingPage";
import { BrowsePage } from "@/pages/BrowsePage";
import { CreateLeagueWizardPage } from "@/pages/CreateLeagueWizardPage";
import { LeagueDetailPage } from "@/pages/LeagueDetailPage";
import { MyLeaguesPlaceholderPage } from "@/pages/MyLeaguesPlaceholderPage";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/league/:address" element={<LeagueDetailPage />} />
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
                <AdminPlaceholderPage />
              </RequireAdmin>
            </RequireSiwe>
          }
        />
      </Routes>
    </AppShell>
  );
}
