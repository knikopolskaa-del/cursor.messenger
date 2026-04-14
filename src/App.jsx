import React, { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { users, currentUserId } from "./mock.js";
import { getUser } from "./lib/utils.js";

import AppShell from "./layout/AppShell.jsx";
import LoginPage from "./pages/LoginPage.jsx";
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

export default function App() {
  const [sessionUserId, setSessionUserId] = useState(null);
  const me = useMemo(
    () => getUser(sessionUserId ?? currentUserId),
    [sessionUserId],
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoginAs={setSessionUserId} />} />

      <Route
        path="/app"
        element={
          sessionUserId ? (
            <AppShell me={me} onLogout={() => setSessionUserId(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<AppIndexRedirect />} />

        <Route path="c/:id" element={<ChatPage kind="channel" />} />
        <Route path="d/:id" element={<ChatPage kind="dm" />} />
        <Route path="g/:id" element={<ChatPage kind="group" />} />

        <Route path="threads"  element={<ThreadsPage />} />
        <Route path="mentions" element={<MentionsPage />} />
        <Route path="saved"    element={<SavedPage />} />
        <Route path="me"       element={<MePage me={me} />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route path="new"         element={<NewHubModal />} />
        <Route path="new/channel" element={<NewChannelModal me={me} />} />
        <Route path="new/group"   element={<NewGroupModal />} />
        <Route path="new/dm"      element={<NewDmModal />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
