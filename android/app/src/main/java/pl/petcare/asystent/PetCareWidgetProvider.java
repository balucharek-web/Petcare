package pl.petcare.asystent;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class PetCareWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "PetCareWidgetPrefs";
    public static final String KEY_PET_NAME = "pet_name";
    public static final String KEY_PET_SUBTEXT = "pet_subtext";
    public static final String KEY_TASK_HEADLINE = "task_headline";
    public static final String KEY_PREVENTION_STATUS = "prevention_status";
    public static final String KEY_BADGE = "badge_text";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String petName = prefs.getString(KEY_PET_NAME, "PetCare");
        String petSubtext = prefs.getString(KEY_PET_SUBTEXT, "Twój pupil pod opieką");
        String taskHeadline = prefs.getString(KEY_TASK_HEADLINE, "Wszystkie dawki leków na dziś podane ✓");
        String preventionStatus = prefs.getString(KEY_PREVENTION_STATUS, "🛡️ Profilaktyka pod kontrolą");
        String badge = prefs.getString(KEY_BADGE, "🐾 Aktywny");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.petcare_appwidget);
        views.setTextViewText(R.id.widget_pet_name, petName);
        views.setTextViewText(R.id.widget_pet_subtext, petSubtext);
        views.setTextViewText(R.id.widget_task_headline, taskHeadline);
        views.setTextViewText(R.id.widget_prevention_status, preventionStatus);
        views.setTextViewText(R.id.widget_badge, badge);

        // Click to open main app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, PetCareWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }
}
