package pl.petcare.asystent;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    public static final int RC_GOOGLE_SIGN_IN = 9001;
    public static final String SERVER_CLIENT_ID = "764412082432-q5d25pi0er4lnevgagscd26h7mkm8kcb.apps.googleusercontent.com";
    private static PluginCall pendingSignInCall;
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
                    GoogleSignInOptions.Builder gsoBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestEmail()
                            .requestProfile();

                    if (SERVER_CLIENT_ID != null && !SERVER_CLIENT_ID.isEmpty()) {
                        gsoBuilder.requestIdToken(SERVER_CLIENT_ID);
                    }

                    GoogleSignInOptions gso = gsoBuilder.build();
                    GoogleSignInClient signInClient = GoogleSignIn.getClient(activity, gso);

                    // Ensure user gets fresh account chooser
                    signInClient.signOut();

                    Intent signInIntent = signInClient.getSignInIntent();
                    activity.startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                } catch (Exception e) {
                    if (pendingSignInCall != null) {
                        pendingSignInCall.reject("Błąd inicjalizacji Google Sign-In: " + e.getMessage());
                        pendingSignInCall = null;
                    }
                }
            }
        });
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
                        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).build();
                        GoogleSignInClient signInClient = GoogleSignIn.getClient(activity, gso);
                        signInClient.signOut();
                    } catch (Exception ignored) {}
                }
            });
        }
        call.resolve();
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (pendingSignInCall == null) return;

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }

            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String foundEmail = account.getEmail();
                    String foundName = account.getDisplayName();
                    Uri photo = account.getPhotoUrl();
                    String photoUrl = photo != null ? photo.toString() : "";
                    String idToken = account.getIdToken();

                    if (foundEmail != null && !foundEmail.trim().isEmpty()) {
                        JSObject ret = new JSObject();
                        ret.put("email", foundEmail.trim());
                        ret.put("name", foundName != null ? foundName : foundEmail.split("@")[0]);
                        ret.put("photoUrl", photoUrl);
                        ret.put("idToken", idToken != null ? idToken : "");
                        ret.put("success", true);

                        pendingSignInCall.resolve(ret);
                        pendingSignInCall = null;
                        return;
                    }
                }
                pendingSignInCall.reject("Nie udało się pobrać danych konta Google.");
                pendingSignInCall = null;
            } catch (ApiException e) {
                pendingSignInCall.reject("Błąd logowania Google (" + e.getStatusCode() + "): " + e.getMessage());
                pendingSignInCall = null;
            } catch (Exception e) {
                pendingSignInCall.reject("Błąd autoryzacji Google: " + e.getMessage());
                pendingSignInCall = null;
            }
        }
    }
}
