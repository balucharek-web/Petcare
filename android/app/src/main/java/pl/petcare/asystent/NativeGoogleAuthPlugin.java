package pl.petcare.asystent;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    public static final int RC_GOOGLE_SIGN_IN = 9001;
    public static final int RC_DRIVE_AUTH = 9002;
    private static final String HMAC_SECRET = "PETCARE_NATIVE_SEC_KEY_2026_V29";
    private static final String DRIVE_SCOPE = "oauth2:https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata";

    private static PluginCall pendingSignInCall;
    private static PluginCall pendingDriveCall;
    private static String pendingEmailForDrive;
    private static Activity currentActivity;

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        currentActivity = activity;
        pendingSignInCall = call;

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent intent;
                    try {
                        AccountPicker.AccountChooserOptions options = new AccountPicker.AccountChooserOptions.Builder()
                                .setAllowableAccountsTypes(Collections.singletonList("com.google"))
                                .build();
                        intent = AccountPicker.newChooseAccountIntent(options);
                    } catch (Throwable t) {
                        intent = AccountManager.newChooseAccountIntent(null, null, new String[]{"com.google"}, null, null, null, null);
                    }
                    activity.startActivityForResult(intent, RC_GOOGLE_SIGN_IN);
                } catch (Exception e) {
                    if (pendingSignInCall != null) {
                        pendingSignInCall.reject("Błąd wywołania wyboru konta Google: " + e.getMessage());
                        pendingSignInCall = null;
                    }
                }
            }
        });
    }

    @PluginMethod
    public void getDriveToken(PluginCall call) {
        String email = call.getString("email");
        if (email == null || email.trim().isEmpty()) {
            call.reject("Brak adresu e-mail.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        currentActivity = activity;
        final String cleanEmail = email.trim().toLowerCase();
        pendingDriveCall = call;
        pendingEmailForDrive = cleanEmail;

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String token = GoogleAuthUtil.getToken(activity.getApplicationContext(), cleanEmail, DRIVE_SCOPE);
                    if (token != null && !token.isEmpty()) {
                        JSObject ret = new JSObject();
                        ret.put("token", token);
                        ret.put("success", true);
                        if (pendingDriveCall != null) {
                            pendingDriveCall.resolve(ret);
                            pendingDriveCall = null;
                        }
                    } else {
                        if (pendingDriveCall != null) {
                            pendingDriveCall.reject("Nie udało się uzyskać tokenu Dysku Google.");
                            pendingDriveCall = null;
                        }
                    }
                } catch (UserRecoverableAuthException recoverable) {
                    activity.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            activity.startActivityForResult(recoverable.getIntent(), RC_DRIVE_AUTH);
                        }
                    });
                } catch (Exception e) {
                    Log.w("PetCareAuth", "Błąd pobierania tokenu Dysku Google: " + e.getMessage());
                    if (pendingDriveCall != null) {
                        pendingDriveCall.reject("Błąd autoryzacji Dysku Google: " + e.getMessage());
                        pendingDriveCall = null;
                    }
                }
            }
        }).start();
    }

    @PluginMethod
    public void chooseAccount(PluginCall call) {
        signIn(call);
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        call.resolve();
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        // 1. Google Drive Permission Consent Result
        if (requestCode == RC_DRIVE_AUTH) {
            if (resultCode == Activity.RESULT_OK && pendingEmailForDrive != null && currentActivity != null) {
                final String targetEmail = pendingEmailForDrive;
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String token = GoogleAuthUtil.getToken(currentActivity.getApplicationContext(), targetEmail, DRIVE_SCOPE);
                            JSObject ret = new JSObject();
                            ret.put("token", token);
                            ret.put("success", true);
                            if (pendingDriveCall != null) {
                                pendingDriveCall.resolve(ret);
                                pendingDriveCall = null;
                            }
                        } catch (Exception e) {
                            if (pendingDriveCall != null) {
                                pendingDriveCall.reject("Błąd autoryzacji: " + e.getMessage());
                                pendingDriveCall = null;
                            }
                        }
                    }
                }).start();
            } else {
                if (pendingDriveCall != null) {
                    pendingDriveCall.reject("Użytkownik odmówił dostępu do Dysku Google.");
                    pendingDriveCall = null;
                }
            }
            return;
        }

        // 2. Google Account Selection Result
        if (pendingSignInCall == null) return;

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }

            if (resultCode == Activity.RESULT_OK && data != null) {
                String foundEmail = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                if (foundEmail == null && data.getExtras() != null) {
                    Bundle extras = data.getExtras();
                    foundEmail = extras.getString(AccountManager.KEY_ACCOUNT_NAME);
                    if (foundEmail == null) {
                        String[] candidateKeys = new String[]{
                            "authAccount",
                            "accountName",
                            "email",
                            "account_name",
                            "selected_account"
                        };
                        for (String k : candidateKeys) {
                            String val = extras.getString(k);
                            if (val != null && val.contains("@")) {
                                foundEmail = val;
                                break;
                            }
                        }
                    }
                    if (foundEmail == null) {
                        for (String k : extras.keySet()) {
                            Object obj = extras.get(k);
                            if (obj instanceof String) {
                                String s = (String) obj;
                                if (s.contains("@") && s.contains(".") && !s.contains(" ") && s.length() < 100) {
                                    foundEmail = s;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (foundEmail != null && !foundEmail.trim().isEmpty()) {
                    final String finalEmail = foundEmail.trim().toLowerCase();
                    String foundName = finalEmail.split("@")[0].replace(".", " ");
                    if (!foundName.isEmpty()) {
                        foundName = Character.toUpperCase(foundName.charAt(0)) + (foundName.length() > 1 ? foundName.substring(1) : "");
                    }

                    String deviceId = "android_device";
                    try {
                        if (currentActivity != null) {
                            String id = Settings.Secure.getString(currentActivity.getContentResolver(), Settings.Secure.ANDROID_ID);
                            if (id != null && !id.isEmpty()) {
                                deviceId = id;
                            }
                        }
                    } catch (Exception ignored) {}

                    long timestamp = System.currentTimeMillis();
                    String signature = computeHmac("ANDROID_NATIVE:" + finalEmail + ":" + deviceId + ":" + timestamp, HMAC_SECRET);

                    final JSObject ret = new JSObject();
                    ret.put("email", finalEmail);
                    ret.put("name", foundName);
                    ret.put("photoUrl", "");
                    ret.put("idToken", "");
                    ret.put("platform", "android");
                    ret.put("deviceId", deviceId);
                    ret.put("timestamp", timestamp);
                    ret.put("signature", signature);
                    ret.put("success", true);

                    // Try to pre-fetch Drive Token in background if already granted
                    final Activity act = currentActivity;
                    new Thread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                if (act != null) {
                                    String driveToken = GoogleAuthUtil.getToken(act.getApplicationContext(), finalEmail, DRIVE_SCOPE);
                                    if (driveToken != null && !driveToken.isEmpty()) {
                                        ret.put("accessToken", driveToken);
                                    }
                                }
                            } catch (Throwable ignored) {}

                            if (pendingSignInCall != null) {
                                pendingSignInCall.resolve(ret);
                                pendingSignInCall = null;
                            }
                        }
                    }).start();
                    return;
                }
            }

            pendingSignInCall.reject("Nie udało się pobrać wybranego konta Google.");
            pendingSignInCall = null;
        }
    }

    private static String computeHmac(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : rawHmac) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
