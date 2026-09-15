package com.binh.fastvocab;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** AlarmManager bị huỷ hết khi thiết bị khởi động lại -> lên lịch lại nếu người dùng đã bật nhắc học. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            ReminderUtil.rescheduleIfEnabled(context);
        }
    }
}
