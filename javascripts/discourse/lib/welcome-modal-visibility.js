export const USER_TYPE = {
  NEW: "new",
  RETURNING: "returning",
  UNKNOWN: "unknown",
};

const DISPLAY_FOR = {
  BOTH: "both",
  NEW_USERS: "new_users",
  RETURNING_USERS: "returning_users",
};

const FORCED_PREVIEW_USER_TYPE = USER_TYPE.NEW;

export const LEGACY_STORAGE_KEYS = Object.freeze([
  "has_seen_welcome_modal",
  "welcome_modal_last_seen_at",
  "welcome_modal_last_visit_at",
]);

export function purgeLegacyState(storage) {
  if (!storage) {
    return;
  }

  LEGACY_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function classifyUser(registeredAt, featureEnabledDate) {
  const registered = toDate(registeredAt);
  const enabledFrom = toDate(featureEnabledDate);

  if (!registered || !enabledFrom) {
    return USER_TYPE.UNKNOWN;
  }

  return registered < enabledFrom ? USER_TYPE.RETURNING : USER_TYPE.NEW;
}

function isDisplayable(card, userType) {
  if (!card?.id || !card.title || !card.subtitle) {
    return false;
  }

  switch (card.displayFor ?? DISPLAY_FOR.BOTH) {
    case DISPLAY_FOR.BOTH:
      return true;
    case DISPLAY_FOR.NEW_USERS:
      return userType === USER_TYPE.NEW;
    case DISPLAY_FOR.RETURNING_USERS:
      return userType === USER_TYPE.RETURNING;
    default:
      return false;
  }
}

function resolveAudience({
  registeredAt,
  featureEnabledDate,
  forced,
  userTypeOverride,
}) {
  if (Object.values(USER_TYPE).includes(userTypeOverride)) {
    return userTypeOverride;
  }

  const classified = classifyUser(registeredAt, featureEnabledDate);

  if (forced && classified === USER_TYPE.UNKNOWN) {
    return FORCED_PREVIEW_USER_TYPE;
  }

  return classified;
}

export function resolveModalState({
  enabled = false,
  registeredAt = null,
  featureEnabledDate = null,
  cards = [],
  forced = false,
  userTypeOverride = null,
} = {}) {
  if (!enabled && !forced) {
    return { visible: false, userType: USER_TYPE.UNKNOWN, cards: [] };
  }

  const userType = resolveAudience({
    registeredAt,
    featureEnabledDate,
    forced,
    userTypeOverride,
  });
  const displayable = (Array.isArray(cards) ? cards : []).filter((card) =>
    isDisplayable(card, userType)
  );

  return { visible: displayable.length > 0, userType, cards: displayable };
}
