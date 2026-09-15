package com.binh.fastvocab;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;

import org.json.JSONObject;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int REQ_EXPORT_BACKUP = 1001;
    private static final int REQ_IMPORT_BACKUP = 1002;

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean langAvailable = false;
    private String currentLangCode = "ru";
    private String pendingExportJson;

    private void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override public void run() { web.evaluateJavascript(code, null); }
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, this);

        web = new WebView(this);
        setContentView(web);

        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setDefaultTextEncodingName("utf-8");

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient());
        web.loadUrl("file:///android_asset/index.html");
    }

    /* Mã ngôn ngữ app (ru/en/fr/zh...) -> Locale cho TTS */
    private Locale localeFor(String code) {
        if ("en".equals(code)) return Locale.US;
        if ("fr".equals(code)) return Locale.FRANCE;
        if ("zh".equals(code)) return Locale.SIMPLIFIED_CHINESE;
        return new Locale("ru", "RU");
    }

    private void applyLang(String code) {
        currentLangCode = code;
        if (tts == null || !ttsReady) return;
        try {
            int r = tts.setLanguage(localeFor(code));
            langAvailable = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
        } catch (Exception e) {
            langAvailable = false;
        }
        js("window.onTtsReady&&onTtsReady(" + langAvailable + ")");
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ttsReady = true;
            tts.setSpeechRate(0.92f);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { js("window.onTtsState&&onTtsState('start')"); }
                @Override public void onDone(String id) { js("window.onTtsState&&onTtsState('done')"); }
                @Override public void onError(String id) { js("window.onTtsState&&onTtsState('error')"); }
            });
            applyLang(currentLangCode);
        } else {
            js("window.onTtsReady&&onTtsReady(false)");
        }
    }

    private void speakInternal(final String text, final float rate) {
        if (!ttsReady || tts == null) return;
        runOnUiThread(new Runnable() {
            @Override public void run() {
                if (!langAvailable) {
                    Toast.makeText(MainActivity.this,
                        "Chưa có giọng đọc cho ngôn ngữ này trên máy. Đang mở cài đặt Text-to-Speech...",
                        Toast.LENGTH_LONG).show();
                    try {
                        Intent installIntent = new Intent();
                        installIntent.setAction(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                        startActivity(installIntent);
                    } catch (Exception e) { /* ignore */ }
                    return;
                }
                tts.setSpeechRate(rate);
                HashMap<String, String> params = new HashMap<String, String>();
                params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "u" + System.currentTimeMillis());
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { try { tts.stop(); tts.shutdown(); } catch (Exception e) {} }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // Điều hướng lùi (chủ đề -> lưới, đóng bảng chọn ngôn ngữ...) do JS quyết định;
        // JS chỉ gọi Android.exitApp() khi thực sự không còn gì để lùi nữa.
        js("window.onNativeBack && onNativeBack()");
    }

    private void startExportPicker() {
        String stamp = new SimpleDateFormat("yyyy-MM-dd_HHmm", Locale.US).format(new Date());
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, "ngoai-ngu-bo-tui-backup-" + stamp + ".json");
        try {
            startActivityForResult(intent, REQ_EXPORT_BACKUP);
        } catch (Exception e) {
            Toast.makeText(this, "Không mở được trình chọn nơi lưu file", Toast.LENGTH_LONG).show();
        }
    }

    private void startImportPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        try {
            startActivityForResult(intent, REQ_IMPORT_BACKUP);
        } catch (Exception e) {
            Toast.makeText(this, "Không mở được trình chọn file", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();

        if (requestCode == REQ_EXPORT_BACKUP) {
            try {
                OutputStream out = getContentResolver().openOutputStream(uri);
                out.write(pendingExportJson.getBytes(StandardCharsets.UTF_8));
                out.close();
                Toast.makeText(this, "✅ Đã lưu bản sao lưu", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Không thể lưu bản sao lưu: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
            pendingExportJson = null;
        } else if (requestCode == REQ_IMPORT_BACKUP) {
            try {
                BufferedReader r = new BufferedReader(new InputStreamReader(
                    getContentResolver().openInputStream(uri), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = r.readLine()) != null) sb.append(line).append("\n");
                r.close();
                final String jsonText = JSONObject.quote(sb.toString());
                js("window.onImportData && onImportData(" + jsonText + ")");
            } catch (Exception e) {
                Toast.makeText(this, "Không đọc được file: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }

    public class Bridge {
        @JavascriptInterface
        public void speak(String text) { speakInternal(text, 0.92f); }

        @JavascriptInterface
        public void speakSlow(String text) { speakInternal(text, 0.62f); }

        @JavascriptInterface
        public void stopSpeak() { if (tts != null) { try { tts.stop(); } catch (Exception e) {} } }

        @JavascriptInterface
        public void setLang(final String code) {
            runOnUiThread(new Runnable() {
                @Override public void run() { applyLang(code); }
            });
        }

        @JavascriptInterface
        public boolean isLangAvailable() { return langAvailable; }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(new Runnable() {
                @Override public void run() { finish(); }
            });
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface
        public void exportData(final String json) {
            pendingExportJson = json;
            runOnUiThread(new Runnable() {
                @Override public void run() { startExportPicker(); }
            });
        }

        @JavascriptInterface
        public void importData() {
            runOnUiThread(new Runnable() {
                @Override public void run() { startImportPicker(); }
            });
        }
    }
}
