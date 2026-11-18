# 📱 PicShare Android — Мобильный мессенджер

Официальный Android-клиент для мессенджера **PicShare** ([оригинальный репозиторий](https://github.com/SashaKilin/picshare)). 

Построен на базе **Ionic Capacitor 8 + React 19 + Vite + Tailwind CSS**.

---

## ✨ Особенности Android-версии

* 🚀 **Нативная сборка под Android**: полноценное мобильное приложение (`.apk`) для Android 7.0+ (API 24+).
* 🌐 **Настраиваемый сервер**: переключение адреса сервера прямо из приложения (кнопка ⚙️/Сервер в шапке) — можно подключиться к Render.com или локальному серверу на ПК по Wi-Fi.
* 🔙 **Поддержка аппаратной кнопки «Назад» (Hardware Back Button)**: закрытие открытых картинок (Lightbox), модальных окон и диалогов вместо мгновенного закрытия приложения.
* 📷 **Загрузка и обмен картинками**: поддержка выбора фото из галереи и камеры Android.
* ⚡ **Мгновенный обмен через WebSockets**: живой чат, индикатор онлайна, набор текста, реакции на фото.
* 🔔 **Звуки и уведомления**: локальные оповещения о новых сообщениях и заявках в друзья.
* 🤖 **Автоматическая CI/CD сборка APK в GitHub Actions**: при каждом коммите автоматически собирается свежий `app-debug.apk` в разделе **Actions / Artifacts**.

---

## 📥 Как скачать и установить готовый APK

1. Перейдите во вкладку **[Actions](https://github.com/SashaKilin/picshare-android/actions)** в этом репозитории.
2. Выберите последний успешный запуск **Build Android APK**.
3. Внизу в блоке **Artifacts** скачайте архив **PicShare-Android-APK**.
4. Распакуйте `app-debug.apk` и установите на Android-устройство (разрешите установку из неизвестных источников в настройках).

---

## 🛠️ Локальная сборка и запуск

### Требования
* **Node.js** 20+ и **npm**
* **Android Studio** (Hedgehog / Iguana / Koala или новее) + **Android SDK** (API 34)
* **JDK 17**

### 1. Установка зависимостей
```bash
npm install
```

### 2. Сборка веб-части и синхронизация с Android
```bash
npm run build
npx cap sync android
```

### 3. Открытие в Android Studio
```bash
npx cap open android
```
Или просто откройте папку `android/` в Android Studio через `File -> Open`.

### 4. Сборка APK через терминал (Gradle)
```bash
cd android
./gradlew assembleDebug
```
Собранный файл будет лежать по адресу:
`android/app/build/outputs/apk/debug/app-debug.apk`.

---

## ⚙️ Подключение к серверу PicShare

В мобильном приложении нажмите иконку **Сервер (🖥️)** в правом верхнем углу (или настройте `.env` перед сборкой):
- **Облачный сервер (Render.com)**: `https://ваш-сервер.onrender.com`
- **Эмулятор Android Studio**: `http://10.0.2.2:5000` (10.0.2.2 — это localhost вашего ПК изнутри эмулятора)
- **Физический смартфон**: `http://192.168.x.x:5000` (ПК и смартфон должны быть подключены к одной Wi-Fi сети)

---

## 📂 Структура проекта

```
picshare-android/
├── android/                   # Нативный проект Android Studio (Gradle, Manifest, Java/Kotlin)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml # Разрешения (Интернет, Камера, Фото)
│   │   └── java/...           # MainActivity (Capacitor Bridge)
│   └── build.gradle
├── src/                       # Исходный код React интерфейса
│   ├── config.js              # Конфигурация URL сервера и медиа
│   ├── api/                   # REST API клиент
│   ├── context/               # Socket.IO и Auth контексты
│   └── components/            # UI компоненты и модальные окна
├── public/                    # Статические файлы, PWA иконки
├── capacitor.config.json      # Настройки Capacitor для Android
├── vite.config.js
└── .github/workflows/         # CI/CD автоматическая сборка APK
```

---

## 📄 Лицензия

MIT License.
