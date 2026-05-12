import React from "react";
import { TouchableOpacity, View } from "react-native";
import styles from "../assets/styles";
import AnimatedSheetModal from "./AnimatedSheetModal";
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
};

const UserProfileSheet = ({
  visible,
  profile,
  onClose,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  onImagePress,
}: Props) => {
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.discoverSheetContainer}
      offsetY={320}
    >
      <>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.discoverSheetCloseButton}
          onPress={onClose}
          activeOpacity={0.9}
        >
          <Icon name="close" size={20} color="#2B2B2B" />
        </TouchableOpacity>
        <View style={styles.discoverSheetHandle} />
        <UserProfileCard
          profile={profile}
          onContactPress={onContactPress}
          secondaryActionLabel={secondaryActionLabel}
          onSecondaryActionPress={onSecondaryActionPress}
          onImagePress={onImagePress}
        />
      </>
    </AnimatedSheetModal>
  );
};

export default UserProfileSheet;
