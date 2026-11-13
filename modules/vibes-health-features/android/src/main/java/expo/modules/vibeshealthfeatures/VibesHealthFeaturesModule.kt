@file:OptIn(androidx.health.connect.client.feature.ExperimentalMindfulnessSessionApi::class)

package expo.modules.vibeshealthfeatures

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Verificación oficial de Health Connect para saber si el dispositivo soporta
 * MindfulnessSession (HealthConnectFeatures.FEATURE_MINDFULNESS_SESSION).
 * Devuelve "available", "unavailable", "sdk_unavailable" o "unknown".
 */
class VibesHealthFeaturesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VibesHealthFeatures")

    AsyncFunction("getMindfulnessFeatureStatus") {
      val context = appContext.reactContext ?: return@AsyncFunction "unknown"
      try {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
          return@AsyncFunction "sdk_unavailable"
        }
        val status = HealthConnectClient.getOrCreate(context)
          .features
          .getFeatureStatus(HealthConnectFeatures.FEATURE_MINDFULNESS_SESSION)
        if (status == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) "available" else "unavailable"
      } catch (error: Exception) {
        "unknown"
      }
    }
  }
}
