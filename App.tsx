/** @format */

import "react-native-url-polyfill/auto";
import React from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Toast from "react-native-toast-message";
import { useFonts } from "expo-font";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Home,
  Matches,
  Messages,
  Match,
  Profile,
  Meditations,
  Welcome,
  Videos,
  Events,
  EditProfile,
  Premium,
  Chat,
  Settings,
  PreferenceDetail,
  OnboardingGender,
  OnboardingOrientation,
  OnboardingInterested,
  OnboardingName,
  OnboardingAge,
  OnboardingCountry,
  OnboardingPhoto,
  OnboardingSpiritualPath,
  Login,
  Signup,
  EventDetail,
  EventChat,
  CreateEvent,
  Contact,
  Faq,
  TermsConditions,
  Session,
} from "./screens";
import TabBarIcon from "./components/TabBarIcon";
import CustomTabBar from "./components/CustomTabBar";
import VibesMinimalOnboarding from "./src/screens/Onboarding/VibesMinimalOnboarding";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
let hasAppliedGlobalFont = false;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  if (!hasAppliedGlobalFont) {
    (Text as any).defaultProps = (Text as any).defaultProps || {};
    (Text as any).defaultProps.style = [
      { fontFamily: "CormorantGaramond_500Medium" },
      (Text as any).defaultProps.style,
    ];
    (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps.style = [
      { fontFamily: "CormorantGaramond_500Medium" },
      (TextInput as any).defaultProps.style,
    ];
    hasAppliedGlobalFont = true;
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
      <Stack.Navigator
        initialRouteName="VibesMinimalOnboarding"
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
            <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
              <Tab.Screen
                name="Discover"
                component={Home}
                options={{
                  tabBarLabel: "Discover",
                  tabBarIcon: ({ focused }) => (
                    <TabBarIcon focused={focused} iconName="compass" />
                  ),
                }}
              />
              <Tab.Screen
                name="Soulmates"
                component={Session}
                options={{
                  tabBarLabel: "guruVibes",
                  tabBarIcon: ({ focused }) => (
                    <TabBarIcon focused={focused} iconName="heart" />
                  ),
                }}
              />
              <Tab.Screen
                name="Flow"
                component={Messages}
                options={{
                  tabBarLabel: "Flow",
                  tabBarIcon: ({ focused }) => (
                    <TabBarIcon
                      focused={focused}
                      iconName="chatbubble-ellipses"
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Events"
                component={Events}
                options={{
                  tabBarLabel: "Events",
                  tabBarIcon: ({ focused }) => (
                    <TabBarIcon focused={focused} iconName="calendar" />
                  ),
                }}
              />
              <Tab.Screen
                name="Aura"
                component={Profile}
                options={{
                  tabBarLabel: "Aura",
                  tabBarIcon: ({ focused }) => (
                    <TabBarIcon focused={focused} iconName="person-circle" />
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
          name="OnboardingGender"
          component={OnboardingGender}
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
  );
};

export default App;
