import React, {useRef, useState} from "react";
import {Alert, Keyboard, KeyboardAvoidingView, Linking, Platform, StyleSheet, TouchableOpacity, View} from "react-native";
import * as Crypto from "expo-crypto";
import ScreenContainer from "../components/ScreenContainer";
import BackButton from "../components/BackButton";
import {Text, TextInput} from "../components/Typography";
import Icon from "../components/Icon";
import VibesLoader from "../components/VibesLoader";
import {useAuthSession} from "../src/auth/auth.queries";
import {supabase} from "../src/lib/supabase";
import {useI18n} from "../src/i18n";
import {useNavigation} from "@react-navigation/native";
import {vibesTheme} from "../src/theme/vibesTheme";
import {CHILD_SAFETY_POLICY_URL, SAFETY_FEEDBACK_CATEGORIES, validateSafetyFeedback, type SafetyFeedbackCategory} from "../src/lib/safetyFeedback";
const c = vibesTheme.colors;
export default function Contact() {
  const navigation = useNavigation();
  const {locale} = useI18n();
  const en = locale.startsWith("en");
  const {data:session} = useAuthSession();
  const [category,setCategory] = useState<SafetyFeedbackCategory>("child_safety");
  const [details,setDetails] = useState("");
  const [context,setContext] = useState("");
  const [sending,setSending] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const labels = en ? ["Child safety", "Report abuse", "Support", "Feedback"] : ["Seguridad infantil", "Denunciar abuso", "Soporte", "Comentarios"];
  const valid = validateSafetyFeedback(category,details,context);
  const submit = async () => {
    if (!session?.user.id || !valid || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    Keyboard.dismiss();
    requestId.current ??= Crypto.randomUUID();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        supabase.from("safety_feedback").insert({id:requestId.current,reporter_id:session.user.id,category,details:details.trim(),context:context.trim() || null}),
        new Promise<never>((_,reject) => {timer=setTimeout(()=>reject(new Error("timeout")),20000);}),
      ]);
      if (result.error && result.error.code !== "23505") throw result.error;
      setDetails(""); setContext(""); requestId.current=null;
      Alert.alert(en ? "Report received" : "Reporte recibido", en ? "Your report was submitted to Vibes. Thank you for helping keep our community safe." : "Tu reporte se envió a Vibes. Gracias por ayudarnos a cuidar la comunidad.");
    } catch {
      Alert.alert(en ? "Could not send" : "No se pudo enviar", en ? "Your text is preserved. Check your connection and try again." : "Conservamos tu texto. Revisá tu conexión e intentá nuevamente.");
    } finally {if(timer)clearTimeout(timer);inFlight.current=false;setSending(false);}
  };
  return <ScreenContainer edges={["top","left","right","bottom"]}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenContainer edges={[]} scroll contentContainerStyle={s.content} scrollViewProps={{keyboardShouldPersistTaps:"handled"}}>
        <BackButton onPress={()=>navigation.goBack()} />
        <Text accessibilityRole="header" style={s.heading}>{en ? "Help and safety" : "Ayuda y seguridad"}</Text>
        <Text style={s.body}>{en ? "Send a report or feedback directly from Vibes, without leaving the app." : "Enviá un reporte o comentario desde Vibes, sin salir de la app."}</Text>
        <Text style={s.label}>{en ? "Topic" : "Motivo"}</Text>
        <View style={s.options}>{SAFETY_FEEDBACK_CATEGORIES.map((value,i)=><TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{checked:category===value}} disabled={sending} onPress={()=>{requestId.current=null;setCategory(value);}} style={[s.option,category===value && s.selected]}><Text style={s.optionText}>{labels[i]}</Text>{category===value && <Icon name="checkmark-circle" size={20} color={c.accentBlue}/>}</TouchableOpacity>)}</View>
        <View style={s.notice}><Icon name="shield-checkmark-outline" size={24} color={c.accentBlue}/><Text style={[s.body,{flex:1}]}>{en ? "Vibes prohibits child sexual exploitation and abuse (CSAE), grooming and child sexual abuse material. Do not attach or reproduce abusive material." : "Vibes prohíbe la explotación y el abuso sexual infantil (EASI), el grooming y el material de abuso sexual infantil. No adjuntes ni reproduzcas material abusivo."}</Text></View>
        <Text style={s.label}>{en ? "What happened?" : "¿Qué ocurrió?"}</Text>
        <TextInput accessibilityLabel={en ? "Report details" : "Detalle del reporte"} style={[s.input,s.details]} placeholder={en ? "Describe the situation (at least 10 characters)" : "Describí la situación (mínimo 10 caracteres)"} placeholderTextColor={c.secondaryText} value={details} onChangeText={value=>{requestId.current=null;setDetails(value);}} editable={!sending} multiline maxLength={4000} textAlignVertical="top" />
        <Text style={s.label}>{en ? "Profile, conversation or link (optional)" : "Perfil, conversación o enlace (opcional)"}</Text>
        <TextInput accessibilityLabel={en ? "Report context" : "Contexto del reporte"} style={s.input} value={context} onChangeText={value=>{requestId.current=null;setContext(value);}} editable={!sending} maxLength={1000} placeholder={en ? "Name or reference to locate the issue" : "Nombre o referencia para ubicar lo ocurrido"} placeholderTextColor={c.secondaryText} />
        {!session && <Text style={s.body}>{en ? "Sign in to submit your report." : "Iniciá sesión para enviar tu reporte."}</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:!valid||!session||sending,busy:sending}} disabled={!valid||!session||sending} onPress={submit} style={[s.submit,(!valid||!session||sending)&&s.disabled]}>{sending ? <VibesLoader size={24}/> : <Icon name="send-outline" size={20} color={c.surface}/>}<Text style={s.submitText}>{sending ? en ? "Sending…" : "Enviando…" : en ? "Send report" : "Enviar reporte"}</Text></TouchableOpacity>
        <Text style={s.meta}>{en ? "Child safety contact: Darío Mira" : "Responsable de seguridad infantil: Darío Mira"}{"\n"}soporte@gurudevelopers.dev</Text>
        <TouchableOpacity accessibilityRole="link" onPress={()=>{void Linking.openURL(CHILD_SAFETY_POLICY_URL).catch(()=>Alert.alert(en ? "Could not open the policy" : "No se pudo abrir la política"));}} style={s.policy}><Text style={s.policyText}>{en ? "Published child safety standards" : "Estándares publicados de seguridad infantil"}</Text></TouchableOpacity>
      </ScreenContainer>
    </KeyboardAvoidingView>
  </ScreenContainer>;
}
const s=StyleSheet.create({content:{padding:24,paddingBottom:40,gap:16},heading:{fontSize:26,lineHeight:32,fontFamily:vibesTheme.fonts.bold,color:c.primaryText},body:{fontSize:15,lineHeight:22,color:c.primaryText},label:{fontSize:14,lineHeight:20,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText},options:{flexDirection:"row",flexWrap:"wrap",gap:8},option:{minHeight:44,paddingHorizontal:14,paddingVertical:10,borderRadius:18,borderWidth:1,borderColor:`${c.primaryText}1F`,flexDirection:"row",alignItems:"center",gap:8},selected:{borderColor:c.accentBlue,backgroundColor:`${c.accentBlue}14`},optionText:{fontSize:14,lineHeight:20,color:c.primaryText,fontFamily:vibesTheme.fonts.semibold},notice:{padding:16,borderRadius:16,flexDirection:"row",gap:10,backgroundColor:`${c.accentBlue}14`},input:{minHeight:48,padding:14,borderRadius:16,borderWidth:1,borderColor:`${c.primaryText}1F`,fontSize:16,color:c.primaryText,backgroundColor:c.surface},details:{minHeight:150},submit:{minHeight:56,borderRadius:999,backgroundColor:c.primaryText,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:10,paddingHorizontal:20},submitText:{color:c.surface,fontSize:18,lineHeight:24,fontFamily:vibesTheme.fonts.bold},disabled:{opacity:0.42},meta:{fontSize:14,lineHeight:22,color:c.secondaryText},policy:{minHeight:44,justifyContent:"center"},policyText:{fontSize:14,lineHeight:20,color:c.accentBlue,textDecorationLine:"underline"}});
