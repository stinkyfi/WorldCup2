import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
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
        <Route path="/create" element={<CreatePlaceholderPage />} />
        <Route path="/my-leagues" element={<MyLeaguesPlaceholderPage />} />
      </Routes>
    </AppShell>
  );
}
