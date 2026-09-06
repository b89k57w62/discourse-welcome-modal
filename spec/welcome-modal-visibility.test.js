import { describe, expect, it } from "vitest";

import {
  LEGACY_STORAGE_KEYS,
  USER_TYPE,
  purgeLegacyState,
  resolveModalState,
} from "../javascripts/discourse/lib/welcome-modal-visibility";

const AD_CARD = {
  id: "promo-1",
  title: "限时活动",
  subtitle: "点进来看看这周的活动。",
  btnLabel: "立即查看",
  action: "/t/12345",
  displayFor: "both",
};

describe("resolveModalState", () => {
  it("hides the modal when the component is disabled", () => {
    const state = resolveModalState({ enabled: false, cards: [AD_CARD] });

    expect(state.visible).toBe(false);
  });

  it("shows the modal to anonymous visitors", () => {
    const state = resolveModalState({ enabled: true, cards: [AD_CARD] });

    expect(state.visible).toBe(true);
    expect(state.cards).toEqual([AD_CARD]);
  });

  it("shows the modal on every call, with no seen-state to suppress it", () => {
    const args = { enabled: true, cards: [AD_CARD] };

    expect(resolveModalState(args).visible).toBe(true);
    expect(resolveModalState(args).visible).toBe(true);
    expect(resolveModalState(args).visible).toBe(true);
  });
});

describe("card validation", () => {
  it("hides the modal when no cards are configured", () => {
    const state = resolveModalState({ enabled: true, cards: [] });

    expect(state.visible).toBe(false);
  });

  it("hides the modal when card_content is not an array", () => {
    const state = resolveModalState({ enabled: true, cards: undefined });

    expect(state.visible).toBe(false);
  });

  it("drops cards missing an id, a title or a subtitle", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [
        AD_CARD,
        { title: "缺 id", subtitle: "不该显示" },
        { id: "no-title", subtitle: "不该显示" },
        { id: "no-subtitle", title: "缺副标" },
      ],
    });

    expect(state.cards).toEqual([AD_CARD]);
  });
});

describe("user classification", () => {
  const FEATURE_ENABLED_DATE = "2026-02-06";

  it("treats a visitor with no registration date as unknown", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [AD_CARD],
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.userType).toBe(USER_TYPE.UNKNOWN);
  });

  it("treats someone who registered before the enabled date as returning", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [AD_CARD],
      registeredAt: "2025-11-30T08:00:00.000Z",
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.userType).toBe(USER_TYPE.RETURNING);
  });

  it("treats someone who registered after the enabled date as new", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [AD_CARD],
      registeredAt: "2026-08-01T08:00:00.000Z",
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.userType).toBe(USER_TYPE.NEW);
  });

  it("falls back to unknown when a date cannot be parsed", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [AD_CARD],
      registeredAt: "not-a-date",
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.userType).toBe(USER_TYPE.UNKNOWN);
  });
});

describe("audience targeting", () => {
  const FEATURE_ENABLED_DATE = "2026-02-06";
  const BOTH = { ...AD_CARD, id: "both", displayFor: "both" };
  const NEW_ONLY = { ...AD_CARD, id: "new-only", displayFor: "new_users" };
  const RETURNING_ONLY = {
    ...AD_CARD,
    id: "returning-only",
    displayFor: "returning_users",
  };
  const ALL_CARDS = [BOTH, NEW_ONLY, RETURNING_ONLY];

  it("shows both-audience and new-user cards to a new user", () => {
    const state = resolveModalState({
      enabled: true,
      cards: ALL_CARDS,
      registeredAt: "2026-08-01T08:00:00.000Z",
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.cards).toEqual([BOTH, NEW_ONLY]);
  });

  it("shows both-audience and returning-user cards to a returning user", () => {
    const state = resolveModalState({
      enabled: true,
      cards: ALL_CARDS,
      registeredAt: "2025-11-30T08:00:00.000Z",
      featureEnabledDate: FEATURE_ENABLED_DATE,
    });

    expect(state.cards).toEqual([BOTH, RETURNING_ONLY]);
  });

  it("shows only both-audience cards to an anonymous visitor", () => {
    const state = resolveModalState({ enabled: true, cards: ALL_CARDS });

    expect(state.cards).toEqual([BOTH]);
  });

  it("treats a card with no displayFor as both-audience", () => {
    const untargeted = { ...AD_CARD, id: "untargeted", displayFor: undefined };
    const state = resolveModalState({ enabled: true, cards: [untargeted] });

    expect(state.cards).toEqual([untargeted]);
  });

  it("drops a card with an unrecognised displayFor value", () => {
    const bogus = { ...AD_CARD, id: "bogus", displayFor: "staff_only" };
    const state = resolveModalState({ enabled: true, cards: [bogus] });

    expect(state.visible).toBe(false);
  });
});

describe("admin preview override", () => {
  it("shows the modal while the component is disabled when forced", () => {
    const state = resolveModalState({
      enabled: false,
      cards: [AD_CARD],
      forced: true,
    });

    expect(state.visible).toBe(true);
  });

  it("previews a chosen audience", () => {
    const newOnly = { ...AD_CARD, id: "new-only", displayFor: "new_users" };
    const state = resolveModalState({
      enabled: true,
      cards: [newOnly],
      userTypeOverride: USER_TYPE.RETURNING,
    });

    expect(state.userType).toBe(USER_TYPE.RETURNING);
    expect(state.cards).toEqual([]);
  });

  it("ignores an unrecognised user-type override", () => {
    const state = resolveModalState({
      enabled: true,
      cards: [AD_CARD],
      registeredAt: "2026-08-01T08:00:00.000Z",
      featureEnabledDate: "2026-02-06",
      userTypeOverride: "moderator",
    });

    expect(state.userType).toBe(USER_TYPE.NEW);
  });

  it("previews as a new user when forced without a resolvable audience", () => {
    const state = resolveModalState({
      enabled: false,
      cards: [AD_CARD],
      forced: true,
    });

    expect(state.userType).toBe(USER_TYPE.NEW);
  });
});

describe("purgeLegacyState", () => {
  function fakeStorage(initial) {
    const entries = new Map(Object.entries(initial));
    return {
      entries,
      getItem: (key) => entries.get(key) ?? null,
      removeItem: (key) => entries.delete(key),
    };
  }

  it("removes every key the old seen-state tracking left behind", () => {
    const storage = fakeStorage({
      has_seen_welcome_modal: "true",
      welcome_modal_last_seen_at: "2026-03-01T00:00:00.000Z",
      welcome_modal_last_visit_at: "2026-09-01T00:00:00.000Z",
    });

    purgeLegacyState(storage);

    LEGACY_STORAGE_KEYS.forEach((key) => {
      expect(storage.getItem(key)).toBeNull();
    });
  });

  it("leaves unrelated keys alone", () => {
    const storage = fakeStorage({ "discourse-theme": "dark" });

    purgeLegacyState(storage);

    expect(storage.getItem("discourse-theme")).toBe("dark");
  });

  it("does nothing when storage is unavailable", () => {
    expect(() => purgeLegacyState(null)).not.toThrow();
  });
});
