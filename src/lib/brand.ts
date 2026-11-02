/**
 * Единый источник правды для брендинга SLink.
 * Меняй название и версию только здесь — весь интерфейс подхватит изменения.
 */

export const APP_NAME = 'SLink';
export const APP_FULL_NAME = 'SLink Messenger';
export const APP_VERSION = '2.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const APP_TAGLINE = 'Связь без лишнего шума';
export const APP_TAGLINE_EN = 'Connection, without the noise';
export const APP_URL = 'https://slink.chat';

/** Основной контакт поддержки (админ мессенджера). */
export const SUPPORT_USERNAME = '@nexus90kyt';

/**
 * Служебный e-mail-домен для аккаунтов, зарегистрированных по номеру телефона.
 * ВАЖНО: это значение — часть формата данных Firebase Auth. Исторические аккаунты
 * созданы с доменом covechat.local, поэтому менять его нельзя без миграции.
 */
export const PHONE_EMAIL_DOMAIN = 'covechat.local';
