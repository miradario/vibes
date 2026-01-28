import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import styles, { DARK_GRAY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import DEMO from "../assets/data/demo";

const EditProfile = () => {
  const profile = DEMO[7];
  const media = [
    profile.image,
    ...(profile.images || []).slice(0, 1),
    null,
    null,
    null,
    null,
  ];

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.bg}
    >
      <ScrollView style={styles.editContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity>
            <Icon name="checkmark" color={DARK_GRAY} size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Photos</Text>
          <View style={styles.mediaGrid}>
            {media.map((item, index) => (
              <TouchableOpacity key={`media-${index}`} style={styles.mediaSlot}>
                {item ? (
                  <>
                    <Image source={item} style={styles.mediaImage} />
                    <View style={styles.mediaRemove}>
                      <Icon name="close" size={14} color={WHITE} />
                    </View>
                  </>
                ) : (
                  <View style={styles.mediaPlaceholder}>
                    <View style={styles.mediaAdd}>
                      <Icon name="add" size={16} color={WHITE} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.editPrimaryButton}>
            <Text style={styles.editPrimaryText}>Add media</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Meditations</Text>
          {(profile.meditations || []).map((item, index) => (
            <View key={`edit-med-${index}`} style={styles.editRow}>
              <View>
                <Text style={styles.editRowTitle}>{item.title}</Text>
                <Text style={styles.editRowMeta}>
                  {item.duration} · {item.access}
                </Text>
              </View>
              <TouchableOpacity style={styles.editRowAction}>
                <Icon name="pencil" size={14} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.editOutlineButton}>
            <Icon name="add" size={16} color={DARK_GRAY} />
            <Text style={styles.editOutlineText}>Add meditation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Videos</Text>
          {(profile.videos || []).map((item, index) => (
            <View key={`edit-vid-${index}`} style={styles.editRow}>
              <View>
                <Text style={styles.editRowTitle}>{item.title}</Text>
                <Text style={styles.editRowMeta}>
                  {item.duration} · {item.access}
                </Text>
              </View>
              <TouchableOpacity style={styles.editRowAction}>
                <Icon name="pencil" size={14} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.editOutlineButton}>
            <Icon name="add" size={16} color={DARK_GRAY} />
            <Text style={styles.editOutlineText}>Add video</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default EditProfile;
