import { lazy, Suspense } from "react";
import { RouteObject, Navigate } from "react-router-dom";
import { useGame } from "@/providers/GameContext";

const LoginScreen = lazy(() => import("@/pages/LoginScreen"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MintScreen = lazy(() => import("@/pages/MintScreen"));
const AchievementScreen = lazy(() => import("@/pages/AchievementScreen"));
const GameSession = lazy(() => import("@/pages/GameSession"));
const InventoryScreen = lazy(() => import("@/pages/InventoryScreen"));
const TradeUpScreen = lazy(() => import("@/pages/TradeUpScreen"));
const MarketplaceScreen = lazy(() => import("@/pages/MarketplaceScreen"));
const PvPScreen = lazy(() => import("@/pages/PvPScreen"));

const LoadingFallback = () => (
  <div className="min-h-screen bg-sunny-gradient flex items-center justify-center">
    <div className="animate-spin text-4xl">⭐</div>
  </div>
);

function Protected({ children }: { children: JSX.Element }) {
  const { account, authResolved } = useGame();
  if (!authResolved) {
    return <LoadingFallback />;
  }
  if (!account) return <Navigate to="/login" replace />;
  return children;
}

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreen />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/dashboard",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <Dashboard />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/workshop",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <MintScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/achievements",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <AchievementScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/session",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <GameSession />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/inventory",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <InventoryScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/trade-up",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <TradeUpScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/marketplace",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <MarketplaceScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "/pvp",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Protected>
          <PvPScreen />
        </Protected>
      </Suspense>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
];
