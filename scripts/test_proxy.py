# -*- coding: utf-8 -*-
"""Реальный тест proxy: точный формат запроса приложения LÉZARD TEXTE."""
import json
import urllib.request

PROXY = 'https://cv038824.tw1.ru/deep-seek/deep-seek.php'

system = (
    'Ты редактор Telegram-разметки.\n'
    'Не меняй текст.\n'
    'Выбери только смысловые фрагменты для форматирования.\n'
    'Допустимо: bold, italic, underline, strikethrough, spoiler, blockquote.\n'
    'Стиль: classique. Умеренное количество акцентов. Основной режим.\n'
    'blockquote оформляй только целиком строку или абзац.\n'
    'Не оформляй всё подряд.\n'
    'Верни только JSON.'
)

text = (
    'Важно: мы запускаем новую версию приложения уже в этот понедельник.\n'
    'Это касается всех пользователей без исключения.\n'
    'Пожалуйста, обновите приложение до последней версии, '
    'чтобы продолжить пользоваться всеми функциями.'
)

user = (
    'Верни:\n'
    '{"entities":[{"type":"bold","text":"точный фрагмент текста","occurrence":1}]}\n\n'
    'Исходный текст:\n\n'
    '<<<\n' + text + '\n>>>'
)

payload = json.dumps(
    {'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}]},
    ensure_ascii=False,
).encode('utf-8')

req = urllib.request.Request(
    PROXY,
    data=payload,
    headers={'Content-Type': 'application/json'},
    method='POST',
)

with urllib.request.urlopen(req, timeout=90) as resp:
    print('STATUS:', resp.status)
    data = json.loads(resp.read().decode('utf-8'))
    content = data['choices'][0]['message']['content']
    print('MODEL:', data.get('model'))
    print('CONTENT:', content)
    parsed = json.loads(content)
    print('ENTITIES:', len(parsed.get('entities', [])))
    for e in parsed.get('entities', []):
        print('  -', e.get('type'), '|', e.get('text'), '| occ', e.get('occurrence'))
    print('ALL GOOD' if isinstance(parsed.get('entities'), list) else 'BAD SHAPE')
