#!/data/data/com.termux/files/usr/bin/bash
# Build "Tiếng Nga Bỏ Túi" APK hoàn toàn trong Termux (không cần Gradle)
# Pipeline: aapt2 compile/link -> ecj -> d8 -> zip assets -> zipalign -> apksigner
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/app"
BUILD="$ROOT/build"
SDK="$HOME/sdk/android.jar"
KS="$HOME/.fastvocab.keystore"
OUT="$ROOT/NgoaiNguBoTui.apk"

echo "[1/7] Dọn build cũ..."
rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/dex"

echo "[2/7] aapt2 compile resources..."
aapt2 compile --dir "$APP/res" -o "$BUILD/res.zip"

echo "[3/7] aapt2 link (manifest + resources)..."
aapt2 link -o "$BUILD/base.apk" \
  -I "$SDK" \
  --manifest "$APP/AndroidManifest.xml" \
  --min-sdk-version 26 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0 \
  "$BUILD/res.zip"

echo "[4/7] ecj compile Java..."
ecj -nowarn \
  -cp "$SDK" \
  -d "$BUILD/classes" \
  $(find "$APP/src" -name "*.java")

echo "[5/7] d8 dex..."
d8 --release --lib "$SDK" --min-api 26 \
  --output "$BUILD/dex" \
  $(find "$BUILD/classes" -name "*.class")

echo "[6/7] Đóng gói dex + assets..."
cd "$BUILD/dex" && zip -q -j "$BUILD/base.apk" classes.dex
cd "$APP" && zip -q -r "$BUILD/base.apk" assets
cd "$ROOT"
zipalign -f -p 4 "$BUILD/base.apk" "$BUILD/aligned.apk"

echo "[7/7] Ký APK..."
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias fastvocab \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass fastvocab -keypass fastvocab \
    -dname "CN=Tieng Nga Bo Tui, OU=Binh, O=Personal, C=VN"
fi
apksigner sign --ks "$KS" --ks-key-alias fastvocab \
  --ks-pass pass:fastvocab --key-pass pass:fastvocab \
  --out "$OUT" "$BUILD/aligned.apk"

echo ""
echo "✅ Xong! APK: $OUT"
ls -la "$OUT"
