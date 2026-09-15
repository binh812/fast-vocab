package com.binh.fastvocab;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Được AlarmManager gọi mỗi ngày (xem ReminderUtil) để hiện thông báo nhắc học. */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "fastvocab_reminder";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Nhắc học hằng ngày", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Nhắc bạn ôn tập từ vựng/câu giao tiếp mỗi ngày");
        nm.createNotificationChannel(channel);

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(context, 0, openIntent, flags);

        Notification notif = new Notification.Builder(context, CHANNEL_ID)
            .setContentTitle("⏰ Đến giờ học rồi!")
            .setContentText("Giữ chuỗi ngày học 🔥 — ôn vài thẻ từ vựng/câu giao tiếp hôm nay nhé.")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build();

        try {
            nm.notify(1001, notif);
        } catch (SecurityException e) {
            // thiếu quyền POST_NOTIFICATIONS (người dùng đã từ chối) -> bỏ qua, không crash
        }
    }
}
