/** @format */

import "react-native-url-polyfill/auto";
import React from "react";
import { Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Toast from "react-native-toast-message";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  Home,
  Discover,
  Matches,
  Match,
  Connections,
  Profile,
  Meditations,
  Welcome,
  Videos,
  Events,
  EditProfile,
  Premium,
  Chat,
  Settings,
  Configuration,
  PreferenceDetail,
  OnboardingOrientation,
  OnboardingInterested,
  OnboardingName,
  OnboardingAge,
  OnboardingCountry,
  OnboardingPhoto,
  OnboardingSpiritualPath,
  VibesOnboardingFlow,
  Login,
  ResetPassword,
  Signup,
  EventDetail,
  ChallengeDetailScreen,
  EventChat,
  CreateEvent,
  CreateChallenge,
  Contact,
  Faq,
  TermsConditions,
  Session,
  Startup,
  UpdateGate,
} from "./screens";
import TabBarIcon from "./components/TabBarIcon";
import CustomTabBar from "./components/CustomTabBar";
import VibesMinimalOnboarding from "./src/screens/Onboarding/VibesMinimalOnboarding";
import { I18nProvider, useI18n } from "./src/i18n";
import { PushNotificationsBootstrap } from "./src/notifications/pushNotifications";
import { vibesTheme } from "./src/theme/vibesTheme";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = React.createRef<any>();
const linking = {
  prefixes: ["com.gurudevelopers.vibes://"],
  config: {
    screens: {
      ResetPassword: "reset-password",
    },
  },
};
let hasAppliedGlobalFont = false;
let isNavigationReady = false;
let pendingNavigateToMessages = false;
let hasHiddenNativeSplash = false;
const FONT_LOAD_TIMEOUT_MS = 3000;

void SplashScreen.preventAutoHideAsync().catch(() => {
  console.warn("[boot] failed to prevent native splash auto hide");
  return;
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const AppNavigator = () => {
  const { t } = useI18n();
  const [fontsLoaded, fontError] = useFonts({
    "JosefinSans-Thin": require("./assets/font/JosefinSans-Thin.ttf"),
    "JosefinSans-Regular": require("./assets/font/JosefinSans-Regular.ttf"),
    "JosefinSans-Medium": require("./assets/font/JosefinSans-Medium.ttf"),
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = React.useState(false);

  React.useEffect(() => {
    console.log("[boot] AppNavigator mounted");
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      console.log("[boot] fonts loaded");
      return;
    }

    if (fontError) {
      console.error("[boot] fonts failed to load", fontError);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn("[boot] fonts load timed out, continuing without custom fonts");
      setFontLoadTimedOut(true);
    }, FONT_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [fontError, fontsLoaded]);

  if (fontsLoaded && !hasAppliedGlobalFont) {
    (Text as any).defaultProps = (Text as any).defaultProps || {};
    (Text as any).defaultProps.style = [
      { fontFamily: vibesTheme.fonts.regular },
      (Text as any).defaultProps.style,
    ];
    (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps.style = [
      { fontFamily: vibesTheme.fonts.regular },
      (TextInput as any).defaultProps.style,
    ];
    hasAppliedGlobalFont = true;
  }

  React.useEffect(() => {
    if (hasHiddenNativeSplash) return;
    if (!fontsLoaded && !fontError && !fontLoadTimedOut) return;

    hasHiddenNativeSplash = true;
    console.log("[boot] hiding native splash", {
      fontsLoaded,
      hasFontError: Boolean(fontError),
      fontLoadTimedOut,
    });
    void SplashScreen.hideAsync().catch((error) => {
      console.warn("[boot] failed to hide native splash", error);
    });
  }, [fontError, fontLoadTimedOut, fontsLoaded]);

  if (!fontsLoaded && !fontError && !fontLoadTimedOut) {
    return (
      <View
        style={{ flex: 1, backgroundColor: vibesTheme.colors.background }}
      />
    );
  }

  const navigateToMessages = () => {
    if (!isNavigationReady || !navigationRef.current) {
      pendingNavigateToMessages = true;
      return;
    }

    navigationRef.current.dispatch(
      CommonActions.navigate({
        name: "Tab",
        params: {
          screen: "Calendar",
          params: { initialSection: "chat" },
        },
      })
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onReady={() => {
            isNavigationReady = true;
            if (!pendingNavigateToMessages) return;
            pendingNavigateToMessages = false;
            navigateToMessages();
          }}
        >
          <PushNotificationsBootstrap navigateToMessages={navigateToMessages} />
          <Stack.Navigator
            initialRouteName="Startup"
            screenOptions={{
              gestureDirection: "horizontal",
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          >
            <Stack.Screen
              name="Startup"
              component={Startup}
              options={{ headerShown: false, animationEnabled: false }}
            />
            <Stack.Screen
              name="UpdateGate"
              component={UpdateGate}
              options={{
                headerShown: false,
                animationEnabled: true,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Welcome"
              component={Welcome}
              options={{
                headerShown: false,
                animationEnabled: true,
                gestureDirection: "vertical",
                transitionSpec: {
                  open: {
                    animation: "timing",
                    config: { duration: 460 },
                  },
                  close: {
                    animation: "timing",
                    config: { duration: 360 },
                  },
                },
                cardStyleInterpolator: ({ current, layouts }) => ({
                  cardStyle: {
                    opacity: current.progress.interpolate({
                      inputRange: [0, 0.25, 1],
                      outputRange: [0, 0.55, 1],
                    }),
                    transform: [
                      {
                        translateY: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.height, 0],
                        }),
                      },
                    ],
                  },
                }),
              }}
            />
            <Stack.Screen
              name="Tab"
              options={{ headerShown: false, animationEnabled: false }}
            >
              {() => (
                <Tab.Navigator
                  initialRouteName="Home"
                  tabBar={(props) => <CustomTabBar {...props} />}
                >
                  <Tab.Screen
                    name="Flow"
                    component={Events}
                    initialParams={{ section: "challenge" }}
                    options={{
                      tabBarLabel: t("tabs.challenges"),
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon
                          focused={focused}
                          iconName="trophy-outline"
                        />
                      ),
                    }}
                  />
                  <Tab.Screen
                    name="EventsTab"
                    component={Events}
                    initialParams={{ section: "event" }}
                    options={{
                      tabBarLabel: t("tabs.events"),
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon
                          focused={focused}
                          iconName="calendar-outline"
                        />
                      ),
                    }}
                  />
                  <Tab.Screen
                    name="Home"
                    component={Home}
                    options={{
                      tabBarLabel: t("tabs.home"),
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon focused={focused} iconName="home" />
                      ),
                    }}
                  />
                  <Tab.Screen
                    name="Calendar"
                    component={Connections}
                    options={{
                      tabBarLabel: t("tabs.connections"),
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon
                          focused={focused}
                          iconName="chatbubble-ellipses"
                        />
                      ),
                    }}
                  />
                  <Tab.Screen
                    name="Discover"
                    component={Discover}
                    options={{
                      tabBarLabel: t("tabs.discover"),
                      tabBarButton: () => null,
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon focused={focused} iconName="compass" />
                      ),
                    }}
                  />
                  <Tab.Screen
                    name="Aura"
                    component={Profile}
                    options={{
                      tabBarLabel: t("tabs.aura"),
                      tabBarIcon: ({ focused }) => (
                        <TabBarIcon
                          focused={focused}
                          iconName="person-circle"
                        />
                      ),
                    }}
                  />
                </Tab.Navigator>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Meditations"
              component={Meditations}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPassword}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="VibesMinimalOnboarding"
              component={VibesMinimalOnboarding}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="VibesOnboardingFlow"
              component={VibesOnboardingFlow}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingName"
              component={OnboardingName}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingAge"
              component={OnboardingAge}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingCountry"
              component={OnboardingCountry}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingPhoto"
              component={OnboardingPhoto}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingSpiritualPath"
              component={OnboardingSpiritualPath}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Videos"
              component={Videos}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Events"
              component={Events}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetail}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="ChallengeDetailScreen"
              component={ChallengeDetailScreen}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="EventChat"
              component={EventChat}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEvent}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="CreateChallenge"
              component={CreateChallenge}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfile}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Premium"
              component={Premium}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Chat"
              component={Chat}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Match"
              component={Match}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Settings"
              component={Settings}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Configuration"
              component={Configuration}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="PreferenceDetail"
              component={PreferenceDetail}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Contact"
              component={Contact}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Faq"
              component={Faq}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="TermsConditions"
              component={TermsConditions}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="Session"
              component={Session}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingOrientation"
              component={OnboardingOrientation}
              options={{ headerShown: false, animationEnabled: true }}
            />
            <Stack.Screen
              name="OnboardingInterested"
              component={OnboardingInterested}
              options={{ headerShown: false, animationEnabled: true }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <Toast />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

const App = () => (
  <I18nProvider>
    <AppNavigator />
  </I18nProvider>
);

export default App;
