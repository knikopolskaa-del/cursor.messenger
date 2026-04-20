import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MessengerProvider, useMessenger } from "./context/MessengerContext.jsx";

import AppShell from "./layout/AppShell.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ChatPage, { AppIndexRedirect } from "./pages/ChatPage.jsx";
import { ThreadsPage, MentionsPage, SavedPage } from "./pages/AggregatorPages.jsx";
import MePage from "./pages/MePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import {
  NewHubModal,
  NewChannelModal,
  NewGroupModal,
  NewDmModal,
} from "./modals/CreateModals.jsx";

function RequireAuth({ children }) {
  const { token, me, booting, sessionError, retrySession, logout } = useMessenger();

  if (booting) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 text-sm text-white/60">
        Загрузка...
      </div>
    );
  }

  if (token && !me && sessionError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-6 text-center">
          <div className="text-sm font-semibold text-rose-100">Не удалось загрузить профиль</div>
          <div className="text-sm text-rose-200/90">{sessionError}</div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => retrySession()}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              Повторить
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !me) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<AppIndexRedirect />} />

        <Route path="c/:id" element={<ChatPage kind="channel" />} />
        <Route path="d/:id" element={<ChatPage kind="dm" />} />
        <Route path="g/:id" element={<ChatPage kind="group" />} />

        <Route path="threads" element={<ThreadsPage />} />
        <Route path="mentions" element={<MentionsPage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="me" element={<MePage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route path="new" element={<NewHubModal />} />
        <Route path="new/channel" element={<NewChannelModal />} />
        <Route path="new/group" element={<NewGroupModal />} />
        <Route path="new/dm" element={<NewDmModal />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MessengerProvider>
      <AppRoutes />
    </MessengerProvider>
  );
}
