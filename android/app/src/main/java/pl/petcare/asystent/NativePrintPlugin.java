package pl.petcare.asystent;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

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

    @PluginMethod
    public void saveAndOpenPdf(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName", "Karta_Zdrowia.pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Brak danych PDF");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    Uri fileUri = null;

                    // 1. Android 10+ (Q+) MediaStore Download
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            ContentValues contentValues = new ContentValues();
                            contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                            contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                            contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PetCare");

                            fileUri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                            if (fileUri != null) {
                                try (OutputStream os = activity.getContentResolver().openOutputStream(fileUri)) {
                                    if (os != null) {
                                        os.write(pdfBytes);
                                        os.flush();
                                    }
                                }
                            }
                        } catch (Exception ex) {
                            android.util.Log.w("NativePrint", "MediaStore download failed, falling back: " + ex.getMessage());
                        }
                    }

                    // 2. Fallback to public Downloads directory
                    if (fileUri == null) {
                        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        if (!downloadsDir.exists()) {
                            downloadsDir.mkdirs();
                        }
                        File pdfFile = new File(downloadsDir, fileName);
                        try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                            fos.write(pdfBytes);
                            fos.flush();
                        }

                        try {
                            android.media.MediaScannerConnection.scanFile(
                                    activity,
                                    new String[]{pdfFile.getAbsolutePath()},
                                    new String[]{"application/pdf"},
                                    null
                            );
                        } catch (Exception ignored) {}

                        fileUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", pdfFile);
                    }

                    // 3. Otwórz plik w domyślnej przeglądarce PDF (Dysk Google, Adobe, itp.)
                    if (fileUri != null) {
                        try {
                            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                            viewIntent.setDataAndType(fileUri, "application/pdf");
                            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                            Intent chooser = Intent.createChooser(viewIntent, "Otwórz kartę zdrowia PDF");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            activity.startActivity(chooser);
                        } catch (Exception e) {
                            android.util.Log.w("NativePrint", "Could not launch PDF viewer chooser: " + e.getMessage());
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("message", "Zapisano plik PDF w folderze Pobrane.");
                    call.resolve(ret);

                } catch (Exception e) {
                    call.reject("Błąd zapisu pliku PDF: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void sharePdf(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName", "Karta_Zdrowia.pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Brak danych PDF");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Brak aktywnego okna Androida");
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    File cacheDir = new File(activity.getCacheDir(), "shared_reports");
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs();
                    }
                    File pdfFile = new File(cacheDir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                        fos.write(pdfBytes);
                        fos.flush();
                    }

                    Uri contentUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", pdfFile);

                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("application/pdf");
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Karta Zdrowia Zwierzaka - PetCare");
                    shareIntent.putExtra(Intent.EXTRA_TEXT, "Załączam kartę zdrowia i raport medyczny wygenerowany z aplikacji PetCare.");
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    Intent chooser = Intent.createChooser(shareIntent, "Udostępnij kartę PDF");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(chooser);

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);

                } catch (Exception e) {
                    call.reject("Błąd udostępniania pliku PDF: " + e.getMessage());
                }
            }
        });
    }
}
