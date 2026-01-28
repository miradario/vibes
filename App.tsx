import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  Matches,
  Messages,
  Profile,
  Meditations,
  Welcome,
  Videos,
  Events,
} from "./screens";
import TabBarIcon from "./components/TabBarIcon";
import CustomTabBar from "./components/CustomTabBar";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const App = () => (
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
        name="Videos"
        component={Videos}
        options={{ headerShown: false, animationEnabled: true }}
      />
      <Stack.Screen
        name="Events"
        component={Events}
        options={{ headerShown: false, animationEnabled: true }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default App;
