package pl.petcare.asystent;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import androidx.annotation.NonNull;

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
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    public static final int RC_GOOGLE_SIGN_IN = 9001;
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
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestEmail()
                            .requestProfile()
                            .build();

                    GoogleSignInClient client = GoogleSignIn.getClient(activity, gso);
                    client.signOut().addOnCompleteListener(activity, new OnCompleteListener<Void>() {
                        @Override
                        public void onComplete(@NonNull Task<Void> task) {
                            try {
                                Intent signInIntent = client.getSignInIntent();
                                activity.startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                            } catch (Exception ex) {
                                if (pendingSignInCall != null) {
                                    pendingSignInCall.reject("Nie udało się otworzyć systemowego wyboru konta Google: " + ex.getMessage());
                                    pendingSignInCall = null;
                                }
                            }
                        }
                    });
                } catch (Exception e) {
                    if (pendingSignInCall != null) {
                        pendingSignInCall.reject("Błąd konfiguracji logowania Google: " + e.getMessage());
                        pendingSignInCall = null;
                    }
                }
            }
        });
    }

    @PluginMethod
    public void chooseAccount(PluginCall call) {
        // Zawsze używamy jednego, nowoczesnego systemowego okna Google (Screenshot 1)
        signIn(call);
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (pendingSignInCall == null) return;

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                String foundEmail = null;
                String foundName = null;
                String foundPhoto = null;
                String foundIdToken = null;

                // 1. Oficjalne pobranie konta z biblioteki Google Sign-In
                try {
                    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                    GoogleSignInAccount account = task.getResult(ApiException.class);
                    if (account != null && account.getEmail() != null) {
                        foundEmail = account.getEmail();
                        foundName = account.getDisplayName() != null ? account.getDisplayName() : account.getEmail().split("@")[0];
                        if (account.getPhotoUrl() != null) {
                            foundPhoto = account.getPhotoUrl().toString();
                        }
                        foundIdToken = account.getIdToken() != null ? account.getIdToken() : "";
                    }
                } catch (Exception e) {
                    android.util.Log.w("NativeGoogleAuth", "GoogleSignIn.getSignedInAccountFromIntent zwrócił wyjątek: " + e.getMessage());
                }

                // 2. Bezpośrednia ekstrakcja danych z extras zwróconych przez systemowe okno wyboru konta
                if (foundEmail == null && data.getExtras() != null) {
                    Bundle extras = data.getExtras();

                    // Sprawdzenie obiektu Parcelable googleSignInAccount
                    try {
                        GoogleSignInAccount acc = extras.getParcelable("googleSignInAccount");
                        if (acc != null && acc.getEmail() != null) {
                            foundEmail = acc.getEmail();
                            foundName = acc.getDisplayName() != null ? acc.getDisplayName() : acc.getEmail().split("@")[0];
                            if (acc.getPhotoUrl() != null) {
                                foundPhoto = acc.getPhotoUrl().toString();
                            }
                            if (acc.getIdToken() != null) {
                                foundIdToken = acc.getIdToken();
                            }
                        }
                    } catch (Exception ignored) {}

                    // Sprawdzenie standardowych kluczy konta
                    if (foundEmail == null) {
                        String[] candidateKeys = new String[]{
                            "authAccount",
                            "accountName",
                            "email",
                            "account_name",
                            "com.google.android.gms.auth.api.signin.internal.SignInHubActivity.account"
                        };
                        for (String k : candidateKeys) {
                            String val = extras.getString(k);
                            if (val != null && val.contains("@")) {
                                foundEmail = val;
                                break;
                            }
                        }
                    }

                    // Skanowanie wartości w poszukiwaniu wybranego adresu e-mail
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

                // Jeśli konto zostało wybrane, logujemy użytkownika bez wyświetlania żadnego drugiego okna
                if (foundEmail != null && !foundEmail.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("email", foundEmail);
                    ret.put("name", foundName != null ? foundName : foundEmail.split("@")[0]);
                    ret.put("photoUrl", foundPhoto != null ? foundPhoto : "");
                    ret.put("idToken", foundIdToken != null ? foundIdToken : "");
                    ret.put("success", true);
                    pendingSignInCall.resolve(ret);
                    pendingSignInCall = null;
                    return;
                }

                pendingSignInCall.reject("Nie udało się pobrać wybranego konta Google.");
                pendingSignInCall = null;
                return;
            } else if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }
        }
    }
}
