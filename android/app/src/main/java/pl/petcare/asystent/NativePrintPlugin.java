package pl.petcare.asystent;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        String jobName = call.getString("jobName", "PetCare-Raport-Medyczny");

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    if (webView == null) {
                        call.reject("Brak instancji WebView");
                        return;
                    }

                    PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                    if (printManager == null) {
                        call.reject("Usługa drukowania Android jest niedostępna");
                        return;
                    }

                    PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                    PrintAttributes.Builder builder = new PrintAttributes.Builder();
                    builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                    builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);

                    printManager.print(jobName, printAdapter, builder.build());

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Błąd drukowania Android: " + e.getMessage());
                }
            }
        });
    }
}
