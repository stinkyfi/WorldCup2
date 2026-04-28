import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RequireSiwe } from "@/components/RequireSiwe";
import { LandingPage } from "@/pages/LandingPage";
import { BrowsePlaceholderPage } from "@/pages/BrowsePlaceholderPage";
import { CreatePlaceholderPage } from "@/pages/CreatePlaceholderPage";
import { MyLeaguesPlaceholderPage } from "@/pages/MyLeaguesPlaceholderPage";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse" element={<BrowsePlaceholderPage />} />
        <Route
          path="/create"
          element={
            <RequireSiwe>
              <CreatePlaceholderPage />
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
      </Routes>
    </AppShell>
  );
}
