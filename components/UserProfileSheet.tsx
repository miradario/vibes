import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import styles from "../assets/styles";
import Icon from "./Icon";
import UserProfileCard, { type UserProfileCardData } from "./UserProfileCard";

type Props = {
  visible: boolean;
  profile: UserProfileCardData | null;
  onClose: () => void;
  onContactPress?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void;
  onImagePress?: (image?: any, index?: number) => void;
  animationType?: "none" | "slide" | "fade";
};

const UserProfileSheet = ({
  visible,
  profile,
  onClose,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  onImagePress,
  animationType = "slide",
}: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View style={styles.discoverSheetRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.discoverSheetBackdrop}
          onPress={onClose}
        />
        <TouchableOpacity
          style={styles.discoverSheetCloseButton}
          onPress={onClose}
          activeOpacity={0.9}
        >
          <Icon name="close" size={20} color="#2B2B2B" />
        </TouchableOpacity>
        <View style={styles.discoverSheetContainer}>
          <View style={styles.discoverSheetHandle} />
          <UserProfileCard
            profile={profile}
            onContactPress={onContactPress}
            secondaryActionLabel={secondaryActionLabel}
            onSecondaryActionPress={onSecondaryActionPress}
            onImagePress={onImagePress}
          />
        </View>
      </View>
    </Modal>
  );
};

export default UserProfileSheet;
