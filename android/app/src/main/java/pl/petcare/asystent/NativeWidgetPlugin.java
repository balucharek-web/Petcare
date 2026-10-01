package pl.petcare.asystent;

import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
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
            try {
                AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                    ComponentName provider = new ComponentName(context, PetCareWidgetProvider.class);
                    // Using null callback is the officially supported, most compatible way across all Android launchers
                    boolean requested = appWidgetManager.requestPinAppWidget(provider, null, null);
                    JSObject res = new JSObject();
                    res.put("requested", requested);
                    call.resolve(res);
                    return;
                }
            } catch (Exception e) {
                // Some custom OEM launchers (e.g. Xiaomi, Huawei) throw SecurityException if permission is denied
            }
        }

        JSObject res = new JSObject();
        res.put("requested", false);
        res.put("fallbackGuideRequired", true);
        call.resolve(res);
    }

    @PluginMethod
    public void isBatteryOptimizationIgnored(PluginCall call) {
        Context context = getContext();
        boolean isIgnored = true;
        if (context != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                isIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }
        JSObject res = new JSObject();
        res.put("isIgnored", isIgnored);
        res.put("manufacturer", Build.MANUFACTURER);
        call.resolve(res);
    }

    @SuppressLint("BatteryLife")
    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Brak kontekstu aplikacji");
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
                return;
            }
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
                return;
            } catch (Exception ex) {
                // Ignore and reject
            }
        }

        JSObject res = new JSObject();
        res.put("success", false);
        call.resolve(res);
    }

    @PluginMethod
    public void openAppSystemSettings(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Brak kontekstu aplikacji");
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Nie można otworzyć ustawień aplikacji: " + e.getMessage());
        }
    }
}
