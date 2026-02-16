/** @format */

import "react-native-url-polyfill/auto";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Toast from "react-native-toast-message";
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
  Login,
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={Welcome}
          options={{ headerShown: false, animationEnabled: true }}
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
                component={Matches}
                options={{
                  tabBarLabel: "Soulmates",
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

export default App;
