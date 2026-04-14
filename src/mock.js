// Mocked in-memory data for V1 (no backend).
// Intentionally small but covers: channels, DMs, groups, messages, threads, mentions, saved, files.

export const currentUserId = "u_me";

export const users = [
  {
    id: "u_me",
    name: "Мария С.",
    title: "Продуктовый дизайнер",
    department: "Дизайн",
    email: "maria@company.local",
    phone: "+7 (999) 000-00-00",
    status: "online", // online | away | dnd | offline
    userType: "employee", // employee | admin | guest
    avatarUrl: "https://i.pravatar.cc/150?u=u_me",
  },
  {
    id: "u_ivan",
    name: "Иван П.",
    title: "Фронтенд-разработчик",
    department: "Инженерия",
    email: "ivan@company.local",
    phone: "+7 (999) 111-11-11",
    status: "away",
    userType: "employee",
    avatarUrl: "https://i.pravatar.cc/150?u=u_ivan",
  },
  {
    id: "u_anna",
    name: "Анна К.",
    title: "HR-партнёр",
    department: "Люди",
    email: "anna@company.local",
    phone: "+7 (999) 222-22-22",
    status: "online",
    userType: "admin",
    avatarUrl: "https://i.pravatar.cc/150?u=u_anna",
  },
  {
    id: "u_guest",
    name: "Алекс (Подрядчик)",
    title: "iOS-разработчик",
    department: "Внешний",
    email: "alex.contractor@vendor.local",
    phone: "",
    status: "online",
    userType: "guest",
    avatarUrl: "https://i.pravatar.cc/150?u=u_guest",
  },
];

export const channels = [
  { id: "c_general", title: "общий", topic: "Общие объявления и обсуждения", isPrivate: false },
  { id: "c_design", title: "дизайн", topic: "Дизайн-ревью, ресурсы, договорённости", isPrivate: true },
  { id: "c_random", title: "болталка", topic: "Разное", isPrivate: false },
];

export const dms = [
  { id: "d_ivan", peerUserId: "u_ivan" },
  { id: "d_guest", peerUserId: "u_guest" },
];

export const groups = [
  { id: "g_launch", title: "Команда запуска", memberIds: ["u_me", "u_ivan", "u_anna"] },
];

export const membership = {
  // "Which conversations current user can see?"
  channelIds: ["c_general", "c_design", "c_random"],
  dmIds: ["d_ivan", "d_guest"],
  groupIds: ["g_launch"],
};

export const guestMembership = {
  // Example of guest restrictions (frontend-only).
  userId: "u_guest",
  channelIds: ["c_general"],
  dmIds: ["d_guest"],
  groupIds: [],
  canSeeDirectory: false,
  canCreateChannels: false,
};

export const messagesByConversationKey = {
  // conversationKey format:
  // - channel: `c:${channelId}`
  // - dm: `d:${userId}` (by peer user id, for routing)
  // - group: `g:${groupId}`
  "c:c_general": [
    {
      id: "m1",
      authorId: "u_anna",
      createdAt: "2026-04-13T09:12:00Z",
      text: "Добро пожаловать в новый мессенджер V1. Здесь пока моковые данные, но навигация уже как в Slack.",
      attachments: [],
      reactions: [{ emoji: "👍", userIds: ["u_me", "u_ivan"] }],
    },
    {
      id: "m2",
      authorId: "u_me",
      createdAt: "2026-04-13T09:25:00Z",
      text: "Круто. Я добавлю макет профиля и Saved items.",
      attachments: [{ type: "file", name: "spec-v1.pdf", size: "842 KB" }],
      reactions: [{ emoji: "✅", userIds: ["u_anna"] }],
    },
    {
      id: "m3",
      authorId: "u_ivan",
      createdAt: "2026-04-13T10:02:00Z",
      text: "Я возьму Threads и Mentions. Можно сделать правый сайдбар с Files/People?",
      attachments: [{ type: "image", name: "layout.png", size: "1.4 MB" }],
      reactions: [],
      replyToId: "m1",
    },
  ],
  "c:c_design": [
    {
      id: "m10",
      authorId: "u_me",
      createdAt: "2026-04-14T08:10:00Z",
      text: "В приватном #design обсуждаем UI. Гость это не видит.",
      attachments: [],
      reactions: [{ emoji: "👀", userIds: ["u_ivan"] }],
    },
  ],
  "d:u_ivan": [
    {
      id: "m20",
      authorId: "u_ivan",
      createdAt: "2026-04-14T11:40:00Z",
      text: "Привет! Сможешь посмотреть мой PR по компоненту Composer?",
      attachments: [],
      reactions: [],
    },
    {
      id: "m21",
      authorId: "u_me",
      createdAt: "2026-04-14T11:43:00Z",
      text: "Да, после обеда.",
      attachments: [],
      reactions: [{ emoji: "🙌", userIds: ["u_ivan"] }],
    },
  ],
  "d:u_guest": [
    {
      id: "m30",
      authorId: "u_guest",
      createdAt: "2026-04-14T13:00:00Z",
      text: "Hi! I can only see #general, that’s expected for guest access.",
      attachments: [],
      reactions: [],
    },
  ],
  "g:g_launch": [
    {
      id: "m40",
      authorId: "u_anna",
      createdAt: "2026-04-14T10:00:00Z",
      text: "План запуска: в пятницу включаем доступ всей компании.",
      attachments: [],
      reactions: [],
    },
  ],
};

export const savedItems = [
  { id: "s1", type: "message", conversationKey: "c:c_general", messageId: "m2", savedAt: "2026-04-14T09:00:00Z" },
  { id: "s2", type: "file", conversationKey: "c:c_general", fileName: "spec-v1.pdf", savedAt: "2026-04-14T09:01:00Z" },
];

export const mentions = [
  {
    id: "a1",
    type: "mention",
    createdAt: "2026-04-14T09:20:00Z",
    actorUserId: "u_anna",
    conversationKey: "c:c_general",
    messageId: "m2",
    text: "@Мария С. посмотри, пожалуйста, финальный текст анонса.",
  },
  {
    id: "a2",
    type: "reaction",
    createdAt: "2026-04-14T11:44:00Z",
    actorUserId: "u_ivan",
    conversationKey: "d:u_ivan",
    messageId: "m21",
    emoji: "🙌",
  },
];

export const threads = [
  {
    id: "t1",
    rootConversationKey: "c:c_general",
    rootMessageId: "m1",
    replyCount: 3,
    lastReplyAt: "2026-04-13T10:02:00Z",
    unreadRepliesCount: 1,
  },
];

