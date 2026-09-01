export const topicIdFromHash = hash =>
  new URLSearchParams(hash.replace(/^#/, "")).get("topic");

export const pushTopicHash = (browser, topicId) => {
  browser.history.pushState(null, "", `#topic=${encodeURIComponent(topicId)}`);
};

export const subscribeToTopicHistory = (browser, restore) => {
  browser.addEventListener("popstate", restore);
  browser.addEventListener("hashchange", restore);
  return () => {
    browser.removeEventListener("popstate", restore);
    browser.removeEventListener("hashchange", restore);
  };
};