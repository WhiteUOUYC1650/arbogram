package chat.slink.nativeplugin;

import android.Manifest;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * SLink Android helper.
 *
 * Задача плагина — не только привнести RECORD_AUDIO в манифест через
 * манифест-мерж, но и явно запросить разрешение в рантайме.
 *
 * В WebView getUserMedia() уходит в BridgeWebChromeClient.onPermissionRequest,
 * которому нужно уже выданное системное разрешение. Если запрашивать его из JS
 * через этот плагин, Android показывает обычный диалог, а запись начинает
 * работать сразу после «Разрешить».
 */
@CapacitorPlugin(
    name = "SlinkNative",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class SlinkNativePlugin extends Plugin {

    private JSObject microphoneResult(boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        return result;
    }

    @PluginMethod
    public void checkMicrophonePermission(PluginCall call) {
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        call.resolve(microphoneResult(granted));
    }

    @PluginMethod
    public void requestMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve(microphoneResult(true));
            return;
        }

        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        call.resolve(microphoneResult(granted));
    }
}
