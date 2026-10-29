import { StyleSheet } from "react-native";
import { vibesTheme } from "../../src/theme/vibesTheme";
import * as ds from "../../src/theme/tokens";
const c = vibesTheme.colors;
export const dayStyles = StyleSheet.create({
  plain: {
    gap: ds.spacing[3],
  },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.accentBlue,
    borderRadius: ds.radii.xl,
    padding: ds.spacing[4],
    gap: ds.spacing[3],
  },
  title: { color: c.primaryText, ...ds.textStyles.heading },
  text: { color: c.primaryText, ...ds.textStyles.body },
  hint: { color: c.secondaryText, ...ds.textStyles.bodySmall },
  error: {
    color: c.primaryText,
    backgroundColor: c.accentCoral,
    borderRadius: ds.radii.md,
    padding: ds.spacing[3],
  },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2], flexWrap: "wrap" },
  mediaSection: {
    gap: ds.spacing[1],
    marginTop: ds.spacing[1],
  },
  sectionTitle: {
    color: c.primaryText,
    ...ds.textStyles.subtitle,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ds.spacing[3],
  },
  mediaButton: {
    flexGrow: 0,
    flexShrink: 1,
    width: "48%",
    borderRadius: ds.radii.lg,
    minHeight: 58,
    paddingHorizontal: ds.spacing[2],
  },
  mediaButtonText: {
    ...ds.textStyles.bodySmall,
    textAlign: "center",
  },
  linkBox: {
    borderWidth: 1,
    borderColor: c.accentBlue,
    borderRadius: ds.radii.lg,
    backgroundColor: c.surface,
    padding: ds.spacing[3],
    gap: ds.spacing[3],
  },
  linkInput: {
    color: c.primaryText,
    backgroundColor: c.background,
    borderColor: c.secondaryText,
    borderWidth: 1,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    ...ds.textStyles.body,
    minHeight: 50,
  },
  linkButton: {
    borderRadius: ds.radii.lg,
    minHeight: 52,
  },
  footerActions: {
    gap: ds.spacing[3],
    marginTop: ds.spacing[1],
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[2],
  },
  button: {
    minHeight: 44,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderRadius: ds.radii.lg,
    backgroundColor: c.primaryText,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: c.accentMustard },
  secondary: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.secondaryText,
  },
  danger: { backgroundColor: c.accentCoral },
  buttonText: {
    color: c.background,
    ...ds.textStyles.body,
    textAlign: "center",
  },
  secondaryButtonText: {
    color: c.primaryText,
  },
  disabled: { opacity: 0.4 },
  input: {
    color: c.primaryText,
    backgroundColor: c.surface,
    borderColor: c.secondaryText,
    borderWidth: 1,
    borderRadius: ds.radii.md,
    padding: ds.spacing[3],
    ...ds.textStyles.body,
    minHeight: 48,
  },
  sheet: { flex: 1, backgroundColor: c.background },
  image: { width: "100%", height: 220, borderRadius: ds.radii.md },
  fullImage: { flex: 1, width: "100%" },
  content: { padding: ds.spacing[5], gap: ds.spacing[4], paddingBottom: ds.spacing[12] },
});
