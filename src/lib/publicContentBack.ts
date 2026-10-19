export type DetailBackNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  reset: (state: { index: number; routes: { name: string; params?: { screen: string } }[] }) => void;
};

/** A cold deep link has no previous screen. Always provide an app destination. */
export function leavePublicContent(navigation: DetailBackNavigation, hasSession: boolean) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.reset({
    index: 0,
    routes: [hasSession ? { name: "Tab", params: { screen: "Home" } } : { name: "Welcome" }],
  });
}
