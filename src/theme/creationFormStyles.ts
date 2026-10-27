import {StyleSheet} from "react-native";
import {vibesTheme} from "./vibesTheme";
const c = vibesTheme.colors;
/** Shared creation/editing fields for events and challenges. */
export const creationFormStyles = StyleSheet.create({
  screenTitle:{fontSize:26,lineHeight:32,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText},
  content:{paddingHorizontal:24,paddingBottom:24},
  formCard:{backgroundColor:c.surface,padding:0,marginTop:8,borderRadius:0,shadowOpacity:0,elevation:0},
  label:{fontSize:14,lineHeight:20,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText,marginTop:20,marginBottom:8},
  input:{minHeight:48,borderWidth:1,borderColor:`${c.primaryText}1F`,borderRadius:16,paddingHorizontal:16,paddingVertical:12,fontSize:16,lineHeight:24,fontFamily:vibesTheme.fonts.regular,color:c.primaryText,backgroundColor:c.surface},
  descriptionInput:{minHeight:144,textAlignVertical:"top"},
  createButton:{minHeight:56,borderRadius:999,backgroundColor:c.primaryText,alignItems:"center",justifyContent:"center",shadowOpacity:0,elevation:0,paddingHorizontal:20,paddingVertical:14},
  createButtonText:{fontSize:18,lineHeight:24,fontFamily:vibesTheme.fonts.bold,color:c.surface},
  createButtonDisabled:{opacity:0.42},
  fixedFooter:{position:"relative",paddingHorizontal:24,paddingTop:12,backgroundColor:c.surface,borderTopWidth:1,borderTopColor:`${c.primaryText}0F`,shadowOpacity:0,elevation:0},
  // Full definition (the spread over each screen's legacy styles replaces the whole key): centered text, no extra space below.
  choiceChip:{minHeight:48,borderRadius:16,paddingHorizontal:12,paddingVertical:0,borderWidth:1,borderColor:`${c.primaryText}1F`,alignItems:"center",justifyContent:"center"},
  choiceChipActive:{backgroundColor:`${c.accentBlue}14`,borderColor:c.accentBlue},
  choiceChipText:{fontSize:14,lineHeight:20,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText},
  choiceChipTextActive:{color:c.primaryText},
});
