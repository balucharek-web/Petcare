package pl.petcare.asystent;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.common.AccountPicker;

import java.util.Collections;

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
    public void chooseAccount(PluginCall call) {
        signIn(call);
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        call.resolve();
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (pendingSignInCall == null) return;

        if (requestCode == RC_GOOGLE_SIGN_IN) {
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
                    foundEmail = foundEmail.trim();
                    String foundName = foundEmail.split("@")[0];

                    JSObject ret = new JSObject();
                    ret.put("email", foundEmail);
                    ret.put("name", foundName);
                    ret.put("photoUrl", "");
                    ret.put("idToken", "");
                    ret.put("success", true);

                    pendingSignInCall.resolve(ret);
                    pendingSignInCall = null;
                    return;
                }
            }

            if (resultCode == Activity.RESULT_CANCELED) {
                pendingSignInCall.reject("Anulowano wybór konta Google w systemie Android.");
                pendingSignInCall = null;
                return;
            }

            pendingSignInCall.reject("Nie udało się pobrać wybranego konta Google.");
            pendingSignInCall = null;
        }
    }
}
