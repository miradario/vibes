import {StyleSheet} from "react-native";
import {vibesTheme} from "./vibesTheme";
import * as ds from "./tokens";
const c = vibesTheme.colors;
/** Shared creation/editing fields for events and challenges. */
export const creationFormStyles = StyleSheet.create({
  screenTitle:{...ds.textStyles.title,color:c.primaryText},
  content:{paddingHorizontal:ds.spacing[6],paddingBottom:ds.spacing[6]},
  formCard:{backgroundColor:c.surface,padding:0,marginTop:ds.spacing[2],borderRadius:0,...ds.shadows.none,},
  label:{...ds.textStyles.label,color:c.primaryText,marginTop:ds.spacing[5],marginBottom:ds.spacing[2]},
  input:{minHeight:48,borderWidth:1,borderColor:ds.colors.border.default,borderRadius:ds.radii.lg,paddingHorizontal:ds.spacing[4],paddingVertical:ds.spacing[3],...ds.textStyles.body,color:c.primaryText,backgroundColor:c.surface},
  descriptionInput:{minHeight:144,textAlignVertical:"top"},
  createButton:{minHeight:56,borderRadius:ds.radii.pill,backgroundColor:c.primaryText,alignItems:"center",justifyContent:"center",...ds.shadows.none,paddingHorizontal:ds.spacing[5],paddingVertical:ds.spacing[4]},
  createButtonText:{...ds.textStyles.subtitle,color:c.surface},
  createButtonDisabled:{opacity:0.42},
  fixedFooter:{position:"relative",paddingHorizontal:ds.spacing[6],paddingTop:ds.spacing[3],backgroundColor:c.surface,borderTopWidth:1,borderTopColor:ds.colors.bg.subtle,...ds.shadows.none,},
  // Full definition (the spread over each screen's legacy styles replaces the whole key): centered text, no extra space below.
  choiceChip:{minHeight:40,borderRadius:ds.radii.lg,paddingHorizontal:ds.spacing[3],paddingVertical:0,borderWidth:1,borderColor:ds.colors.border.default,alignItems:"center",justifyContent:"center"},
  choiceChipActive:{backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle),borderColor:c.accentBlue},
  choiceChipText:{...ds.textStyles.label,color:c.primaryText},
  choiceChipTextActive:{color:c.primaryText},
  // Section blocks drawn by shared components (pickers, path cards) follow the same rhythm as `label`: 20 above, 8 between title and content.
  pickerSection:{marginTop:ds.spacing[5],marginBottom:0,gap:ds.spacing[2]},
  pickerLabel:{...ds.textStyles.label,color:c.primaryText},
  pathCards:{paddingLeft:0,paddingTop:0,paddingBottom:0},
});
