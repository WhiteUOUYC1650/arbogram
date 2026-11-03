package chat.slink.nativeplugin;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * SLink Android helper.
 *
 * Плагин намеренно пустой: его задача — привнести в манифест приложения
 * разрешения микрофона через манифест-мерж Android Gradle Plugin.
 * Разрешение RECORD_AUDIO запрашивается в рантайме самим мостом Capacitor
 * (BridgeWebChromeClient.onPermissionRequest) при вызове getUserMedia().
 */
@CapacitorPlugin(name = "SlinkNative")
public class SlinkNativePlugin extends Plugin {
}
