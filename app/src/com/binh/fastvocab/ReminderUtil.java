package com.binh.fastvocab;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;

/** Lưu trạng thái + lên lịch AlarmManager cho thông báo nhắc học hằng ngày. */
public class ReminderUtil {
    private static final String PREFS = "fastvocab_prefs";
    private static final String KEY_ENABLED = "reminder_enabled";
    private static final String KEY_HOUR = "reminder_hour";
    private static final String KEY_MINUTE = "reminder_minute";
    private static final int REQUEST_CODE = 9001;

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean isEnabled(Context ctx) { return prefs(ctx).getBoolean(KEY_ENABLED, false); }
    public static int getHour(Context ctx) { return prefs(ctx).getInt(KEY_HOUR, 20); }
    public static int getMinute(Context ctx) { return prefs(ctx).getInt(KEY_MINUTE, 0); }

    public static void save(Context ctx, boolean enabled, int hour, int minute) {
        prefs(ctx).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .apply();
    }

    private static PendingIntent pendingIntent(Context ctx) {
        Intent intent = new Intent(ctx, ReminderReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, REQUEST_CODE, intent, flags);
    }

    /** Dùng setInexactRepeating (không cần quyền SCHEDULE_EXACT_ALARM) — giờ nhắc có thể lệch vài phút, chấp nhận được cho mục đích tạo thói quen học. */
    public static void schedule(Context ctx, int hour, int minute) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pendingIntent(ctx));
    }

    public static void cancel(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pendingIntent(ctx));
    }

    /** Gọi lại sau khi máy khởi động lại, vì AlarmManager bị huỷ hết khi reboot. */
    public static void rescheduleIfEnabled(Context ctx) {
        if (isEnabled(ctx)) schedule(ctx, getHour(ctx), getMinute(ctx));
    }
}
