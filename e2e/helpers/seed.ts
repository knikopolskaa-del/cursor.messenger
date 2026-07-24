/** Seed / E2E идентификаторы и учётные записи (см. docs/TEST_CASES.md). */

export const TOKEN_KEY = "messenger_access_token";

export const USERS = {
  test: { email: "test@example.com", password: "1234", name: "Тест Пользователь" },
  /** Локальная БД: bootstrap из .env; seed: maria@example.com / secret12 */
  maria: { email: "maria@gmail.com", password: "1234", name: "Главный админ" },
  mariaSeed: { email: "maria@example.com", password: "secret12", name: "Мария С." },
  ivan: { email: "ivan@example.com", password: "secret12", name: "Иван П." },
  anna: { email: "anna@example.com", password: "secret12", name: "Анна К." },
  guest: { email: "alex.contractor@example.com", password: "secret12", name: "Алекс (Подрядчик)" },
} as const;

export const CHANNELS = {
  general: { id: "c_general", title: "общий", slug: "general" },
  design: { id: "c_design", title: "дизайн", slug: "design" },
  random: { id: "c_random", title: "болталка", slug: "random" },
} as const;

export const GROUPS = {
  launch: { id: "g_launch", title: "Команда запуска" },
} as const;

export const MESSAGES = {
  welcome: { id: "m1", snippet: "Добро пожаловать" },
  reply: { id: "m3", parentId: "m1", snippet: "Threads" },
  pdf: { id: "m2", fileName: "spec-v1.pdf" },
} as const;

export const USER_IDS = {
  me: "u_me",
  ivan: "u_ivan",
  test: "u_test",
  guest: "u_guest",
} as const;
