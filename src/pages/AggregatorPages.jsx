import React from "react";
import { threads, mentions, savedItems, messagesByConversationKey } from "../mock.js";
import { formatTime, getUser, conversationPath } from "../lib/utils.js";
import { Card, Button, PageHeader } from "../components/ui.jsx";

// ── Треды ──────────────────────────────────────────────────────────────────

export function ThreadsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Треды" />
      <div className="mt-4 grid gap-3">
        {threads.length === 0 ? (
          <EmptyState icon="🧵" title="Нет активных тредов" text="Отвечайте на сообщения — они появятся здесь." />
        ) : (
          threads.map((t) => {
            const root = (messagesByConversationKey[t.rootConversationKey] ?? []).find(
              (m) => m.id === t.rootMessageId,
            );
            const [kind, id] = t.rootConversationKey.split(":");
            const path = kind === "g" ? `/app/g/${id}` : `/app/c/${id}`;
            return (
              <Card
                key={t.id}
                title={root ? root.text.slice(0, 80) : "Тред"}
                subtitle={`${t.replyCount} ответа · непрочитанных: ${t.unreadRepliesCount} · ${formatTime(t.lastReplyAt)}`}
                right={
                  <Button to={`${path}?thread=${t.rootMessageId}`} variant="ghost" size="sm">
                    Открыть
                  </Button>
                }
              >
                <div className="text-sm text-white/60">{root?.text ?? "Сообщение не найдено."}</div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Упоминания ─────────────────────────────────────────────────────────────

export function MentionsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Упоминания и реакции" />
      <div className="mt-4 space-y-3">
        {mentions.length === 0 ? (
          <EmptyState icon="🔔" title="Нет упоминаний" text="Когда вас упомянут — вы увидите это здесь." />
        ) : (
          mentions.map((a) => {
            const actor = getUser(a.actorUserId);
            const targetMsg = (messagesByConversationKey[a.conversationKey] ?? []).find(
              (m) => m.id === a.messageId,
            );
            const path = conversationPath(a.conversationKey);
            return (
              <Card
                key={a.id}
                title={a.type === "mention" ? "Упоминание" : "Реакция"}
                subtitle={`${formatTime(a.createdAt)} · от ${actor.name}`}
                right={
                  <Button to={`${path}?thread=${a.messageId}`} variant="ghost" size="sm">
                    Открыть
                  </Button>
                }
              >
                <div className="text-sm text-white/70">
                  {a.type === "mention"
                    ? a.text
                    : `${actor.name} отреагировал ${a.emoji} на: «${targetMsg?.text ?? "…"}»`}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Сохранённое ────────────────────────────────────────────────────────────

export function SavedPage() {
  return (
    <div className="p-6">
      <PageHeader title="Сохранённое" />
      <div className="mt-4 grid gap-3">
        {savedItems.length === 0 ? (
          <EmptyState icon="☆" title="Пока ничего не сохранено" text='Нажмите "☆ Сохранить" на любом сообщении.' />
        ) : (
          savedItems.map((s) => {
            const msg =
              s.type === "message"
                ? (messagesByConversationKey[s.conversationKey] ?? []).find(
                    (m) => m.id === s.messageId,
                  )
                : null;
            const path = conversationPath(s.conversationKey);
            return (
              <Card
                key={s.id}
                title={s.type === "message" ? "Сохранённое сообщение" : "Сохранённый файл"}
                subtitle={`Сохранено: ${formatTime(s.savedAt)}`}
                right={
                  <Button to={path} variant="ghost" size="sm">Перейти</Button>
                }
              >
                <div className="text-sm text-white/70">
                  {s.type === "message"
                    ? msg?.text ?? "Сообщение не найдено"
                    : `Файл: ${s.fileName}`}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Переиспользуемый empty-state ───────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="text-sm font-semibold text-white/70">{title}</div>
      <div className="max-w-xs text-xs text-white/40">{text}</div>
    </div>
  );
}
