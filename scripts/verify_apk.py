# -*- coding: utf-8 -*-
import re
import zipfile

APK = r'android/app/build/outputs/apk/release/app-release.apk'

with zipfile.ZipFile(APK) as z:
    b = z.read('assets/index.android.bundle')
    print('bundle bytes:', len(b))
    for needle in (b'TEXTE', b'ZARD', b'cv038824', b'RichClipboard', b'STYLE IA', b'COPY TEST'):
        print(needle.decode(), 'count:', b.count(needle))
