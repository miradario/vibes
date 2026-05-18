import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles, { DARK_GRAY, PRIMARY_COLOR } from "../assets/styles";
import Icon from "../components/Icon";

const Premium = () => (
  <View style={styles.bg}>
    <View style={styles.premiumContainer}>
      <View style={styles.premiumHeader}>
        <Icon name="flame" size={20} color={PRIMARY_COLOR} />
        <Text style={styles.premiumBrand}>Vibe Gold</Text>
      </View>

      <Text style={styles.premiumTitle}>
        Mirá quién resuena con vos y conectá al instante con Vibe Gold.
      </Text>

      <Text style={styles.premiumSectionLabel}>Elegí un plan</Text>
      <View style={styles.premiumPlans}>
        <View style={[styles.premiumPlanCard, styles.premiumPlanActive]}>
          <Text style={styles.premiumPlanTitle}>1 mes</Text>
          <Text style={styles.premiumPlanPrice}>$19.99 / mes</Text>
          <View style={styles.premiumPlanCheck}>
            <Icon name="checkmark" size={12} color={PRIMARY_COLOR} />
          </View>
        </View>
        <View style={styles.premiumPlanCard}>
          <View style={styles.premiumPlanBadge}>
            <Text style={styles.premiumPlanBadgeText}>Popular</Text>
          </View>
          <Text style={styles.premiumPlanTitle}>6 meses</Text>
          <Text style={styles.premiumPlanPrice}>$11.99 / mes</Text>
        </View>
      </View>

      <View style={styles.premiumList}>
        <Text style={styles.premiumListItem}>✓ Likes ilimitados</Text>
        <Text style={styles.premiumListItem}>✓ Ver quién te dio like</Text>
        <Text style={styles.premiumListItem}>✓ Rewinds ilimitados</Text>
        <Text style={styles.premiumListItem}>✓ 1 boost gratis por mes</Text>
        <Text style={styles.premiumListItem}>✓ 5 super likes por semana</Text>
        <Text style={styles.premiumListItem}>✓ Pasaporte</Text>
      </View>

      <TouchableOpacity style={styles.premiumCta}>
        <Text style={styles.premiumCtaText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default Premium;
