package mx.com.chamba;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        crearCanalNotificaciones();
    }

    private void crearCanalNotificaciones() {
        // Los canales de notificación con sonido personalizado solo existen
        // desde Android 8.0 (API 26). En versiones anteriores, Android usa el
        // sonido de notificación por defecto del sistema — no hay forma de
        // personalizarlo, así que este bloque simplemente no aplica ahí.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            Uri sonidoUri = Uri.parse("android.resource://" + getPackageName() + "/raw/chamba_notif");

            AudioAttributes atributos = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();

            NotificationChannel canal = new NotificationChannel(
                    "trabajos_chamba",
                    "Trabajos de Chamba",
                    NotificationManager.IMPORTANCE_HIGH
            );
            canal.setDescription("Notificaciones de nuevos trabajos, pagos y mensajes de Chamba");
            canal.setSound(sonidoUri, atributos);
            canal.enableVibration(true);

            manager.createNotificationChannel(canal);
        }
    }
}