import {
  createStore,
  createEvent,
  combine,
  guard,
  Unit,
  Event,
  forward,
} from 'effector-root';

import { sessionGet, SessionUser } from 'api/session';
import { historyPush } from 'features/navigation';
import { path } from 'pages/paths';

export const readyToLoadSession = createEvent<void>();

export const sessionLoaded = sessionGet.finally;

export const $session = createStore<SessionUser | null>(null);
export const $isAuthenticated = $session.map((user) => user !== null);

// Show loading state if no session but first request is sent
export const $sessionPending = combine(
  [$session, sessionGet.pending],
  ([session, pending]) => !session && pending,
);

$session
  .on(sessionGet.doneData, (_, { body }) => body.user)
  .on(sessionGet.failData, (session, { status }) => {
    if (status === 401) {
      return null;
    }
    return session;
  });

guard({
  source: readyToLoadSession,
  filter: $sessionPending.map((is) => !is),
  target: sessionGet,
});

/**
 * If user not authenticated, redirect to login
 */
export function checkAuthenticated<T>(config: {
  when: Unit<T>;
  continue?: Unit<T>;
}): Event<T> {
  const continueLogic = config.continue ?? createEvent();
  guard({
    source: config.when,
    filter: $isAuthenticated,
    target: continueLogic,
  });
  guard({
    source: config.when,
    filter: $isAuthenticated.map((is) => !is),
    target: historyPush.prepend(path.login),
  });

  const result = createEvent<T>();
  forward({
    from: continueLogic,
    to: result,
  });
  return result;
}

/**
 * If user **anonymous**, continue, else redirect to home
 */
export function checkAnonymous<T>(config: {
  when: Unit<T>;
  continue?: Unit<T>;
}): Event<T> {
  const continueLogic = config.continue ?? createEvent<T>();
  guard({
    source: config.when,
    filter: $isAuthenticated,
    target: historyPush.prepend(path.home),
  });
  guard({
    source: config.when,
    filter: $isAuthenticated.map((is) => !is),
    target: continueLogic,
  });

  const result = createEvent<T>();
  forward({
    from: continueLogic,
    to: result,
  });
  return result;
}
