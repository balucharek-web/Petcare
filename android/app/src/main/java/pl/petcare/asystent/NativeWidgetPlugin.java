package pl.petcare.asystent;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeWidgetPlugin")
public class NativeWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Brak kontekstu aplikacji");
            return;
        }

        String petName = call.getString("petName", "PetCare");
        String petSubtext = call.getString("petSubtext", "Twój pupil pod opieką");
        String taskHeadline = call.getString("taskHeadline", "Wszystkie leki na dziś podane ✓");
        String preventionStatus = call.getString("preventionStatus", "🛡️ Profilaktyka pod kontrolą");
        String badge = call.getString("badge", "🐾 Aktywny");

        SharedPreferences prefs = context.getSharedPreferences(PetCareWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(PetCareWidgetProvider.KEY_PET_NAME, petName)
                .putString(PetCareWidgetProvider.KEY_PET_SUBTEXT, petSubtext)
                .putString(PetCareWidgetProvider.KEY_TASK_HEADLINE, taskHeadline)
                .putString(PetCareWidgetProvider.KEY_PREVENTION_STATUS, preventionStatus)
                .putString(PetCareWidgetProvider.KEY_BADGE, badge)
                .apply();

        PetCareWidgetProvider.updateAllWidgets(context);

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void isPinningSupported(PluginCall call) {
        Context context = getContext();
        boolean supported = false;
        if (context != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
            if (appWidgetManager != null) {
                supported = appWidgetManager.isRequestPinAppWidgetSupported();
            }
        }
        JSObject res = new JSObject();
        res.put("supported", supported);
        call.resolve(res);
    }

    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Brak kontekstu aplikacji");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                ComponentName provider = new ComponentName(context, PetCareWidgetProvider.class);
                Intent callbackIntent = new Intent(context, MainActivity.class);
                PendingIntent successCallback = PendingIntent.getActivity(
                        context,
                        0,
                        callbackIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                boolean requested = appWidgetManager.requestPinAppWidget(provider, null, successCallback);
                JSObject res = new JSObject();
                res.put("requested", requested);
                call.resolve(res);
                return;
            }
        }

        JSObject res = new JSObject();
        res.put("requested", false);
        res.put("fallbackGuideRequired", true);
        call.resolve(res);
    }
}
