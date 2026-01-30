import { StyleSheet, Dimensions } from "react-native";

export const PRIMARY_COLOR = "#5B2D8B";
export const SECONDARY_COLOR = "#FF9F68";
export const WHITE = "#FFF6EE";
export const GRAY = "#7A6E86";
export const DARK_GRAY = "#3B2F4A";
export const BLACK = "#1C1622";

export const ONLINE_STATUS = "#66BCA3";
export const OFFLINE_STATUS = "#E07A6F";

export const STAR_ACTIONS = "#FF9F68";
export const LIKE_ACTIONS = "#FF9F68";
export const DISLIKE_ACTIONS = "#D66A6A";
export const FLASH_ACTIONS = "#9B7EDC";

export const DIMENSION_WIDTH = Dimensions.get("window").width;
export const DIMENSION_HEIGHT = Dimensions.get("window").height;

export default StyleSheet.create({
  // COMPONENT - CARD ITEM
  containerCardItem: {
    backgroundColor: WHITE,
    borderRadius: 8,
    alignItems: "center",
    margin: 10,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 0, width: 0 },
  },
  matchesCardItem: {
    backgroundColor: SECONDARY_COLOR,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  matchesTextCardItem: {
    color: WHITE,
  },
  descriptionCardItem: {
    color: GRAY,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  status: {
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    color: GRAY,
    fontSize: 12,
  },
  online: {
    width: 6,
    height: 6,
    backgroundColor: ONLINE_STATUS,
    borderRadius: 3,
    marginRight: 4,
  },
  offline: {
    width: 6,
    height: 6,
    backgroundColor: OFFLINE_STATUS,
    borderRadius: 3,
    marginRight: 4,
  },
  actionsCardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 30,
  },
  cardImageWrap: {
    position: "relative",
  },
  matchesCardOverlay: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
  },
  cardThumbRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: -6,
    marginBottom: 6,
  },
  cardThumbWrap: {
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardThumb: {
    width: 48,
    height: 48,
  },
  contactButton: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  contactButtonText: {
    color: WHITE,
    fontSize: 12,
    marginLeft: 6,
  },
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  welcomeTop: {
    paddingTop: 70,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 38,
    color: "#FF9F68",
    marginBottom: 6,
    fontWeight: "700",
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: WHITE,
    textAlign: "center",
    maxWidth: 280,
  },
  welcomeCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginTop: 30,
    alignItems: "center",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowColor: BLACK,
    shadowOffset: { height: 8, width: 0 },
  },
  welcomeQuestion: {
    fontSize: 16,
    color: DARK_GRAY,
    textAlign: "center",
    marginTop: 6,
  },
  welcomeButtons: {
    marginTop: 18,
    width: "100%",
    gap: 14,
  },
  welcomePrimary: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  welcomePrimaryText: {
    color: WHITE,
    fontSize: 15,
  },
  welcomeSecondary: {
    backgroundColor: "#FFE1CC",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  welcomeSecondaryText: {
    color: DARK_GRAY,
    fontSize: 15,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loginCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowColor: BLACK,
    shadowOffset: { height: 8, width: 0 },
  },
  loginTitle: {
    fontSize: 22,
    color: PRIMARY_COLOR,
    fontWeight: "700",
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 13,
    color: GRAY,
    textAlign: "center",
    marginTop: 6,
  },
  loginField: {
    marginTop: 16,
  },
  loginLabel: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  loginInput: {
    backgroundColor: "#FFF1E6",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: DARK_GRAY,
    fontSize: 14,
  },
  loginError: {
    marginTop: 12,
    color: DISLIKE_ACTIONS,
    textAlign: "center",
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 18,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: WHITE,
    fontSize: 15,
  },
  loginSecondary: {
    backgroundColor: "#FFE1CC",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  loginSecondaryText: {
    color: DARK_GRAY,
    fontSize: 15,
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  galleryClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  gallerySlide: {
    width: DIMENSION_WIDTH,
    height: DIMENSION_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: DIMENSION_WIDTH,
    height: DIMENSION_HEIGHT * 0.7,
    resizeMode: "contain",
  },
  contactOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  contactCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: DIMENSION_HEIGHT * 0.7,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 18,
    color: DARK_GRAY,
  },
  contactSectionTitle: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  contactSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE1CC",
  },
  contactRowTitle: {
    color: DARK_GRAY,
    fontSize: 14,
  },
  contactRowMeta: {
    color: GRAY,
    fontSize: 12,
    marginTop: 2,
  },
  swipeOverlay: {
    position: "absolute",
    top: 140,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  swipeIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowColor: BLACK,
    shadowOffset: { height: 8, width: 0 },
  },
  swipeText: {
    marginTop: 10,
    color: DARK_GRAY,
    fontSize: 14,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
  },
  vibeRow: {
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  vibePill: {
    backgroundColor: "#FFE1CC",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },
  vibeText: {
    color: DARK_GRAY,
    fontSize: 12,
  },
  promptLabel: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 6,
  },
  promptText: {
    color: GRAY,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WHITE,
    marginHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowColor: DARK_GRAY,
    shadowOffset: { height: 10, width: 0 },
  },
  miniButton: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: WHITE,
    marginHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowColor: DARK_GRAY,
    shadowOffset: { height: 10, width: 0 },
  },

  // COMPONENT - CITY
  city: {
    backgroundColor: WHITE,
    padding: 10,
    borderRadius: 20,
    width: 100,
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 0, width: 0 },
  },
  cityText: {
    color: DARK_GRAY,
    fontSize: 13,
    textAlign: "center",
  },

  // COMPONENT - FILTERS
  filters: {
    backgroundColor: WHITE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 0, width: 0 },
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  filtersIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FFE1CC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  filtersLabel: {
    color: GRAY,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  filtersValue: {
    color: DARK_GRAY,
    fontSize: 13,
    marginTop: 2,
  },
  filtersChevron: {
    marginLeft: 10,
  },

  // COMPONENT - MESSAGE
  containerMessage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
    paddingHorizontal: 10,
    width: DIMENSION_WIDTH - 100,
  },
  avatar: {
    borderRadius: 30,
    width: 60,
    height: 60,
    marginRight: 20,
    marginVertical: 15,
  },
  message: {
    color: GRAY,
    fontSize: 12,
    paddingTop: 5,
  },

  // COMPONENT - PROFILE ITEM
  containerProfileItem: {
    backgroundColor: WHITE,
    paddingHorizontal: 10,
    paddingBottom: 25,
    margin: 20,
    borderRadius: 8,
    marginTop: -65,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 0, width: 0 },
  },
  matchesProfileItem: {
    width: 135,
    marginTop: -15,
    backgroundColor: SECONDARY_COLOR,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "center",
  },
  matchesTextProfileItem: {
    color: WHITE,
    textAlign: "center",
  },
  name: {
    paddingTop: 25,
    paddingBottom: 5,
    color: DARK_GRAY,
    fontSize: 15,
    textAlign: "center",
  },
  descriptionProfileItem: {
    color: GRAY,
    textAlign: "center",
    paddingBottom: 20,
    fontSize: 13,
  },
  info: {
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconProfile: {
    fontSize: 12,
    color: DARK_GRAY,
    paddingHorizontal: 10,
  },
  infoContent: {
    color: GRAY,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    flexWrap: "wrap",
  },
  profileSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FFE1CC",
  },
  profileSectionTitle: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  profileRowTitle: {
    color: DARK_GRAY,
    fontSize: 14,
  },
  profileRowMeta: {
    color: GRAY,
    fontSize: 12,
    marginTop: 2,
  },
  profileBadge: {
    backgroundColor: "#FFE1CC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileBadgeText: {
    color: DARK_GRAY,
    fontSize: 12,
  },

  // CONTAINER - GENERAL
  bg: {
    flex: 1,
    resizeMode: "cover",
    width: DIMENSION_WIDTH,
    height: DIMENSION_HEIGHT,
    backgroundColor: "#FFC3A0",
  },
  top: {
    paddingTop: 50,
    marginHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { paddingBottom: 10, fontSize: 22, color: PRIMARY_COLOR },
  meditatePill: {
    backgroundColor: WHITE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 0, width: 0 },
  },
  meditateText: {
    color: DARK_GRAY,
    fontSize: 12,
    marginLeft: 6,
  },

  // CONTAINER - HOME
  containerHome: {
    marginHorizontal: 10,
  },

  // CONTAINER - MATCHES
  containerMatches: {
    justifyContent: "space-between",
    flex: 1,
    paddingHorizontal: 10,
  },

  // CONTAINER - MESSAGES
  containerMessages: {
    justifyContent: "space-between",
    flex: 1,
    paddingHorizontal: 10,
  },

  // CONTAINER - PROFILE
  containerProfile: { marginHorizontal: 0 },
  containerMeditations: {
    flex: 1,
    paddingHorizontal: 10,
  },
  photo: {
    width: DIMENSION_WIDTH,
    height: 450,
  },
  topIconLeft: {
    paddingLeft: 20,
  },
  topIconRight: {
    paddingRight: 20,
  },
  actionsProfile: {
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  textButton: {
    fontSize: 15,
    color: WHITE,
    paddingLeft: 5,
  },
  circledButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  roundedButton: {
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    height: 50,
    borderRadius: 25,
    backgroundColor: SECONDARY_COLOR,
    paddingHorizontal: 20,
  },
  meditationList: {
    paddingBottom: 30,
  },
  meditationCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowColor: BLACK,
    shadowOffset: { height: 6, width: 0 },
  },
  meditationTitle: {
    color: DARK_GRAY,
    fontSize: 16,
  },
  meditationMeta: {
    color: GRAY,
    fontSize: 12,
    marginTop: 4,
  },
  meditationPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE1CC",
    alignItems: "center",
    justifyContent: "center",
  },

  // MENU
  tabButtonText: {
    letterSpacing: 0.2,
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  iconMenu: {
    alignItems: "center",
  },
  tabBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },
  tabBarContainer: {
    width: "90%",
    height: 64,
    backgroundColor: WHITE,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowColor: BLACK,
    shadowOffset: { height: 8, width: 0 },
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabBump: {
    position: "absolute",
    top: -14,
    width: 60,
    height: 32,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: WHITE,
  },
  tabCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
