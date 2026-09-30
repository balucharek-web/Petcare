package pl.petcare.asystent;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
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
    public static final int RC_CHOOSE_ACCOUNT = 9002;
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
                                openSystemAccountPicker(activity, call);
                            }
                        }
                    });
                } catch (Exception e) {
                    openSystemAccountPicker(activity, call);
                }
            }
        });
    }

    @PluginMethod
    public void chooseAccount(PluginCall call) {
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
                openSystemAccountPicker(activity, call);
            }
        });
    }

    private static void openSystemAccountPicker(Activity activity, PluginCall call) {
        try {
            Intent intent = AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    new String[]{"com.google"},
                    null,
                    null,
                    null,
                    null
            );
            activity.startActivityForResult(intent, RC_CHOOSE_ACCOUNT);
        } catch (Exception e) {
            if (pendingSignInCall != null) {
                pendingSignInCall.reject("Nie można otworzyć systemowego wyboru konta Android: " + e.getMessage());
                pendingSignInCall = null;
            }
        }
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (pendingSignInCall == null) return;

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                try {
                    GoogleSignInAccount account = task.getResult(ApiException.class);
                    if (account != null && account.getEmail() != null) {
                        JSObject ret = new JSObject();
                        ret.put("email", account.getEmail());
                        ret.put("name", account.getDisplayName() != null ? account.getDisplayName() : account.getEmail().split("@")[0]);
                        ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
                        ret.put("idToken", account.getIdToken() != null ? account.getIdToken() : "");
                        ret.put("success", true);
                        pendingSignInCall.resolve(ret);
                        pendingSignInCall = null;
                        return;
                    }
                } catch (ApiException e) {
                    // Fallback to system AccountPicker
                    Activity act = currentActivity;
                    if (act != null) {
                        openSystemAccountPicker(act, pendingSignInCall);
                        return;
                    }
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }
        }

        if (requestCode == RC_CHOOSE_ACCOUNT) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                String accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                if (accountName != null && !accountName.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("email", accountName);
                    ret.put("name", accountName.split("@")[0]);
                    ret.put("photoUrl", "");
                    ret.put("idToken", "");
                    ret.put("success", true);
                    pendingSignInCall.resolve(ret);
                    pendingSignInCall = null;
                    return;
                }
            }
            pendingSignInCall.reject("Anulowano wybór konta w systemie Android.");
            pendingSignInCall = null;
        }
    }
}
