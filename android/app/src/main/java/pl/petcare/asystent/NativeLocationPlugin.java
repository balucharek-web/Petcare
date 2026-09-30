package pl.petcare.asystent;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.location.LocationManager;
import android.provider.Settings;
import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.LocationSettingsResponse;
import com.google.android.gms.location.Priority;
import com.google.android.gms.location.SettingsClient;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeLocation")
public class NativeLocationPlugin extends Plugin {
    public static final int REQUEST_CHECK_SETTINGS = 10099;
    private static PluginCall pendingCall;

    @PluginMethod
    public void promptEnableLocation(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        // Check if GPS or Network location is already enabled
        LocationManager locationManager = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = false;
        boolean isNetworkEnabled = false;
        try {
            if (locationManager != null) {
                isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
                isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            }
        } catch (Exception ignored) {}

        if (isGpsEnabled || isNetworkEnabled) {
            JSObject ret = new JSObject();
            ret.put("enabled", true);
            call.resolve(ret);
            return;
        }

        pendingCall = call;

        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000)
                .setMinUpdateIntervalMillis(1000)
                .build();

        LocationSettingsRequest.Builder builder = new LocationSettingsRequest.Builder()
                .addLocationRequest(locationRequest)
                .setAlwaysShow(true); // Forces the Android OS native system dialog!

        SettingsClient client = LocationServices.getSettingsClient(activity);
        Task<LocationSettingsResponse> task = client.checkLocationSettings(builder.build());

        task.addOnSuccessListener(activity, new OnSuccessListener<LocationSettingsResponse>() {
            @Override
            public void onSuccess(LocationSettingsResponse locationSettingsResponse) {
                if (pendingCall != null) {
                    JSObject ret = new JSObject();
                    ret.put("enabled", true);
                    pendingCall.resolve(ret);
                    pendingCall = null;
                }
            }
        });

        task.addOnFailureListener(activity, new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                if (e instanceof ResolvableApiException) {
                    try {
                        ResolvableApiException resolvable = (ResolvableApiException) e;
                        // DIRECT NATIVE ANDROID SYSTEM PROMPT TO TURN ON LOCATION
                        resolvable.startResolutionForResult(activity, REQUEST_CHECK_SETTINGS);
                    } catch (IntentSender.SendIntentException sendEx) {
                        openSettings();
                    }
                } else {
                    openSettings();
                }
            }
        });
    }

    private void openSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            getActivity().startActivity(intent);
        } catch (Exception ignored) {}
        if (pendingCall != null) {
            JSObject ret = new JSObject();
            ret.put("enabled", false);
            pendingCall.resolve(ret);
            pendingCall = null;
        }
    }

    public static void onResolutionResult(int requestCode, int resultCode) {
        if (requestCode == REQUEST_CHECK_SETTINGS && pendingCall != null) {
            JSObject ret = new JSObject();
            ret.put("enabled", resultCode == Activity.RESULT_OK);
            pendingCall.resolve(ret);
            pendingCall = null;
        }
    }
}
