import React from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import styles, { DARK_GRAY, PRIMARY_COLOR } from "../assets/styles";
import Icon from "../components/Icon";

const Premium = () => (
  <ImageBackground
    source={require("../assets/images/bg.png")}
    style={styles.bg}
  >
    <View style={styles.premiumContainer}>
      <View style={styles.premiumHeader}>
        <Icon name="flame" size={20} color={PRIMARY_COLOR} />
        <Text style={styles.premiumBrand}>Vibe Gold</Text>
      </View>

      <Text style={styles.premiumTitle}>
        See who resonates with you and match instantly with Vibe Gold.
      </Text>

      <Text style={styles.premiumSectionLabel}>Select a plan</Text>
      <View style={styles.premiumPlans}>
        <View style={[styles.premiumPlanCard, styles.premiumPlanActive]}>
          <Text style={styles.premiumPlanTitle}>1 month</Text>
          <Text style={styles.premiumPlanPrice}>$19.99 / mo</Text>
          <View style={styles.premiumPlanCheck}>
            <Icon name="checkmark" size={12} color={PRIMARY_COLOR} />
          </View>
        </View>
        <View style={styles.premiumPlanCard}>
          <View style={styles.premiumPlanBadge}>
            <Text style={styles.premiumPlanBadgeText}>Popular</Text>
          </View>
          <Text style={styles.premiumPlanTitle}>6 months</Text>
          <Text style={styles.premiumPlanPrice}>$11.99 / mo</Text>
        </View>
      </View>

      <View style={styles.premiumList}>
        <Text style={styles.premiumListItem}>✓ Unlimited likes</Text>
        <Text style={styles.premiumListItem}>✓ See who likes you</Text>
        <Text style={styles.premiumListItem}>✓ Unlimited rewinds</Text>
        <Text style={styles.premiumListItem}>✓ 1 free boost per month</Text>
        <Text style={styles.premiumListItem}>✓ 5 super likes per week</Text>
        <Text style={styles.premiumListItem}>✓ Passport</Text>
      </View>

      <TouchableOpacity style={styles.premiumCta}>
        <Text style={styles.premiumCtaText}>Continue</Text>
      </TouchableOpacity>
    </View>
  </ImageBackground>
);

export default Premium;
