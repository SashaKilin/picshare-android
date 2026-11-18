import { CURRENT_VERSION, CURRENT_VERSION_CODE, GITHUB_REPO } from '../version';

export async function checkAppUpdate() {
  try {
    // 1. Сначала пробуем получить version.json с сырой ссылки GitHub (без лимитов API)
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json?_t=${Date.now()}`;
    const resp = await fetch(rawUrl, { cache: 'no-store' });
    
    if (resp.ok) {
      const data = await resp.json();
      const remoteVersionCode = Number(data.versionCode || 0);
      const isNewer = remoteVersionCode > CURRENT_VERSION_CODE || (data.version && data.version !== CURRENT_VERSION);

      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_VERSION,
        currentVersionCode: CURRENT_VERSION_CODE,
        remoteVersion: data.version || '1.0.0',
        remoteVersionCode,
        releaseNotes: data.releaseNotes || 'Улучшения стабильности и новые функции',
        apkUrl: data.apkUrl || `https://github.com/${GITHUB_REPO}/releases/latest/download/app-debug.apk`,
        publishedAt: data.publishedAt || new Date().toISOString()
      };
    }

    // 2. Фолбэк на GitHub Releases API
    const apiResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store'
    });

    if (apiResp.ok) {
      const release = await apiResp.json();
      const tagName = (release.tag_name || '').replace(/^v/, '');
      const isNewer = tagName && tagName !== CURRENT_VERSION;

      // Ищем asset с расширением .apk
      const apkAsset = release.assets?.find(a => a.name.endsWith('.apk'));
      const apkUrl = apkAsset ? apkAsset.browser_download_url : `https://github.com/${GITHUB_REPO}/releases/latest/download/app-debug.apk`;

      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_VERSION,
        currentVersionCode: CURRENT_VERSION_CODE,
        remoteVersion: tagName || CURRENT_VERSION,
        remoteVersionCode: CURRENT_VERSION_CODE + (isNewer ? 1 : 0),
        releaseNotes: release.body || 'Свежее обновление PicShare',
        apkUrl,
        publishedAt: release.published_at || new Date().toISOString()
      };
    }

    return { hasUpdate: false, currentVersion: CURRENT_VERSION };
  } catch (err) {
    console.warn('Ошибка проверки обновлений PicShare:', err);
    return { hasUpdate: false, currentVersion: CURRENT_VERSION, error: err.message };
  }
}

export function openUpdateDownload(apkUrl) {
  if (!apkUrl) return;
  // Открываем загрузку APK через системный браузер/Download Manager Android
  try {
    if (typeof window !== 'undefined') {
      window.open(apkUrl, '_system');
    }
  } catch (e) {
    window.location.href = apkUrl;
  }
}
