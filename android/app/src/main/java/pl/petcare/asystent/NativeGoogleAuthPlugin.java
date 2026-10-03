package pl.petcare.asystent;

import android.app.Activity;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    public static final int RC_GOOGLE_SIGN_IN = 9001;
    public static final int RC_DRIVE_AUTH = 9002;
    private static final String HMAC_SECRET = "PETCARE_NATIVE_SEC_KEY_2026_V29";
    private static final String DRIVE_SCOPE_URL = "https://www.googleapis.com/auth/drive.file";
    private static final String DRIVE_SCOPE_STRING = "oauth2:" + DRIVE_SCOPE_URL;

    private static PluginCall pendingSignInCall;
    private static PluginCall pendingDriveCall;
    private static String pendingEmailForDrive;
    private static JSObject pendingDriveAuthObject;
    private static Activity currentActivity;

    private GoogleSignInClient getGoogleSignInClient(Activity activity) {
        Scope driveScope = new Scope(DRIVE_SCOPE_URL);
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestScopes(driveScope)
                .build();
        return GoogleSignIn.getClient(activity, gso);
    }

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
                    GoogleSignInClient client = getGoogleSignInClient(activity);
                    // Odśwież sesję, by pokazać wybór konta i ekran zgody
                    client.signOut().addOnCompleteListener(activity, task -> {
                        Intent signInIntent = client.getSignInIntent();
                        activity.startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                    });
                } catch (Exception e) {
                    Log.e("PetCareAuth", "Błąd wywołania logowania Google: " + e.getMessage(), e);
                    if (pendingSignInCall != null) {
                        pendingSignInCall.reject("Błąd logowania Google: " + e.getMessage());
                        pendingSignInCall = null;
                    }
                }
            }
        });
    }

    @PluginMethod
    public void getDriveToken(PluginCall call) {
        String email = call.getString("email");
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        currentActivity = activity;
        final String cleanEmail = (email != null && !email.trim().isEmpty()) 
                ? email.trim().toLowerCase() 
                : "";

        pendingDriveCall = call;
        pendingEmailForDrive = cleanEmail;

        Scope driveScope = new Scope(DRIVE_SCOPE_URL);
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(activity);

        // Jeśli brak uprawnień w GoogleSignIn, poproś użytkownika o zgodę systemowym oknem
        if (account != null && !GoogleSignIn.hasPermissions(account, driveScope)) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    GoogleSignIn.requestPermissions(activity, RC_DRIVE_AUTH, account, driveScope);
                }
            });
            return;
        }

        // Pobierz token dostępu do Dysku Google w osobnym wątku
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String targetEmail = cleanEmail;
                    if (targetEmail.isEmpty() && account != null && account.getEmail() != null) {
                        targetEmail = account.getEmail().toLowerCase();
                    }
                    if (targetEmail.isEmpty()) {
                        if (pendingDriveCall != null) {
                            pendingDriveCall.reject("Brak wybranego konta Google.");
                            pendingDriveCall = null;
                        }
                        return;
                    }

                    String token = GoogleAuthUtil.getToken(activity.getApplicationContext(), targetEmail, DRIVE_SCOPE_STRING);
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
                    Log.w("PetCareAuth", "Błąd pobierania tokenu Dysku Google: " + e.getMessage(), e);
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
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        GoogleSignInClient client = getGoogleSignInClient(activity);
                        client.signOut();
                    } catch (Exception ignored) {}
                }
            });
        }
        call.resolve();
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        // 1. Zgoda na Dysk Google (RC_DRIVE_AUTH)
        if (requestCode == RC_DRIVE_AUTH) {
            if (resultCode == Activity.RESULT_OK && pendingEmailForDrive != null && currentActivity != null) {
                final String targetEmail = pendingEmailForDrive;
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String token = GoogleAuthUtil.getToken(currentActivity.getApplicationContext(), targetEmail, DRIVE_SCOPE_STRING);
                            if (pendingDriveAuthObject != null) {
                                pendingDriveAuthObject.put("accessToken", token);
                                if (pendingSignInCall != null) {
                                    pendingSignInCall.resolve(pendingDriveAuthObject);
                                    pendingSignInCall = null;
                                }
                                pendingDriveAuthObject = null;
                            }
                            if (pendingDriveCall != null) {
                                JSObject ret = new JSObject();
                                ret.put("token", token);
                                ret.put("success", true);
                                pendingDriveCall.resolve(ret);
                                pendingDriveCall = null;
                            }
                        } catch (Exception e) {
                            Log.e("PetCareAuth", "Błąd po wyrażeniu zgody: " + e.getMessage(), e);
                            if (pendingSignInCall != null && pendingDriveAuthObject != null) {
                                pendingSignInCall.resolve(pendingDriveAuthObject);
                                pendingSignInCall = null;
                                pendingDriveAuthObject = null;
                            }
                            if (pendingDriveCall != null) {
                                pendingDriveCall.reject("Błąd pobrania tokenu po wyrażeniu zgody: " + e.getMessage());
                                pendingDriveCall = null;
                            }
                        }
                    }
                }).start();
            } else {
                if (pendingSignInCall != null && pendingDriveAuthObject != null) {
                    pendingSignInCall.resolve(pendingDriveAuthObject);
                    pendingSignInCall = null;
                    pendingDriveAuthObject = null;
                }
                if (pendingDriveCall != null) {
                    pendingDriveCall.reject("Użytkownik odmówił dostępu do Dysku Google.");
                    pendingDriveCall = null;
                }
            }
            return;
        }

        // 2. Logowanie kontem Google (RC_GOOGLE_SIGN_IN)
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            if (pendingSignInCall == null) return;

            if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }

            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null && account.getEmail() != null) {
                    final String finalEmail = account.getEmail().trim().toLowerCase();
                    String displayName = account.getDisplayName();
                    if (displayName == null || displayName.trim().isEmpty()) {
                        displayName = finalEmail.split("@")[0].replace(".", " ");
                        if (!displayName.isEmpty()) {
                            displayName = Character.toUpperCase(displayName.charAt(0)) + (displayName.length() > 1 ? displayName.substring(1) : "");
                        }
                    }

                    String photoUrl = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                    String idToken = account.getIdToken() != null ? account.getIdToken() : "";

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
                    ret.put("name", displayName);
                    ret.put("photoUrl", photoUrl);
                    ret.put("idToken", idToken);
                    ret.put("platform", "android");
                    ret.put("deviceId", deviceId);
                    ret.put("timestamp", timestamp);
                    ret.put("signature", signature);
                    ret.put("success", true);

                    final Activity act = currentActivity;
                    new Thread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                if (act != null) {
                                    String driveToken = GoogleAuthUtil.getToken(act.getApplicationContext(), finalEmail, DRIVE_SCOPE_STRING);
                                    if (driveToken != null && !driveToken.isEmpty()) {
                                        ret.put("accessToken", driveToken);
                                    }
                                }
                                if (pendingSignInCall != null) {
                                    pendingSignInCall.resolve(ret);
                                    pendingSignInCall = null;
                                }
                            } catch (UserRecoverableAuthException recoverable) {
                                pendingEmailForDrive = finalEmail;
                                pendingDriveAuthObject = ret;
                                if (act != null) {
                                    act.runOnUiThread(new Runnable() {
                                        @Override
                                        public void run() {
                                            act.startActivityForResult(recoverable.getIntent(), RC_DRIVE_AUTH);
                                        }
                                    });
                                }
                            } catch (Throwable e) {
                                Log.w("PetCareAuth", "Token drive pobierany później: " + e.getMessage());
                                if (pendingSignInCall != null) {
                                    pendingSignInCall.resolve(ret);
                                    pendingSignInCall = null;
                                }
                            }
                        }
                    }).start();
                    return;
                }
            } catch (ApiException apiEx) {
                Log.e("PetCareAuth", "Błąd Google Sign-In API (" + apiEx.getStatusCode() + "): " + apiEx.getMessage(), apiEx);
                String msg = "Błąd logowania Google (" + apiEx.getStatusCode() + ")";
                if (apiEx.getStatusCode() == 12501) {
                    msg = "Anulowano logowanie do konta Google.";
                } else if (apiEx.getStatusCode() == 10) {
                    msg = "Błąd konfiguracji klucza SHA-1 lub pakietu pl.petcare.asystent w Google Cloud Console (Kod 10: DEVELOPER_ERROR).";
                }
                pendingSignInCall.reject(msg);
                pendingSignInCall = null;
                return;
            } catch (Exception ex) {
                Log.e("PetCareAuth", "Błąd przetwarzania konta: " + ex.getMessage(), ex);
            }

            pendingSignInCall.reject("Nie udało się zalogować przez konto Google.");
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
