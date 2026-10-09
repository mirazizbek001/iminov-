# Bon-Bon — Railway deploy

Bu versiya frontend va backendni **bitta Railway service** ichida ishlatadi. `/plat/*` so‘rovlari shu domen ichida Django'ga proxy qilinadi.

## 1. Deploy

1. GitHub repo root'ini Railway'ga ulang.
2. Root Directory'ni o‘zgartirmang.
3. Root'dagi `Dockerfile` avtomatik ishlatiladi.
4. Railway service sozlamalarida **Volume** qo‘shib, mount path’ni `/data` qiling. Yoki `DATABASE_URL` orqali PostgreSQL ulang.
5. `SECRET_KEY` ni uzun, maxfiy qiymatga o‘rnating va deploylar orasida o‘zgartirmang.

Volume yoki PostgreSQL `DATABASE_URL` bo‘lmasa, ilova `/tmp/instakids-data` dagi vaqtinchalik bazadan foydalanadi. Akkauntlar, xabarlar va media deploy yoki container almashtirilganda yo‘qolishi mumkin. Doimiy saqlash uchun Volume yoki PostgreSQL tavsiya qilinadi. Oldingi deploylarda yo‘qolgan ma’lumotlarni bu o‘zgarish tiklay olmaydi; ularni faqat mavjud backup yoki eski persistent bazadan qaytarish mumkin.

## 2. Variables

```text
DEBUG=0
SECRET_KEY=<uzun-maxfiy-key>
```

Ixtiyoriy:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=<Google OAuth client id>
```

`DATABASE_URL` bo‘lsa PostgreSQL ishlatiladi. Volume `/data` ga ulangan bo‘lsa `/data/db.sqlite3`, aks holda `/tmp/instakids-data/db.sqlite3` ishlatiladi.

## 3. Health check

```text
https://SIZNING-DOMENINGIZ/health
```

Javobda:

```json
{"status":"ok","database":"sqlite3","data_persistent":false}
```

bo‘lishi kerak.

## 4. Admin akkaunt yaratish

Railway deploy qilingan service Console’da:

```sh
python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['NAME'])"
python manage.py migrate
python manage.py createsuperuser
```

Ko‘rsatilgan database yo‘li Railway app ishlatayotgan baza bilan bir xil bo‘lishi kerak. `DATABASE_URL` yoki `/data` Volume sozlanmaganida ma’lumotlar deploy/restartda yo‘qolishi mumkinligi haqidagi ogohlantirish qoladi; bu buyruq xatosi emas.

Ilova ichidagi boshqaruv paneli `/admin` manzilida, Django’ning texnik admin paneli esa `/django-admin/` manzilida ochiladi.

## 5. Muhim

- `BACKEND_URL` kerak emas.
- Frontend va backend bir xil domen orqali ishlaydi.
- Django session cookie 30 kun saqlanadi va faol foydalanishda muddati yangilanadi.
- Brauzerdagi eski login yozuvi server sessioni bilan tekshiriladi; session mavjud bo‘lsa akkaunt avtomatik tiklanadi.
- Yozishmalar `SocialState` orqali server database'ida saqlanadi.
- Railway Volume `/data` akkauntlar, sessionlar, yozishmalar va media uchun persistent storage beradi.
- PostgreSQL ishlatilsa web service uchun SQLite Volume shart emas; media uchun Volume yoki object storage kerak.
- `DATABASE_URL` ham, `/data` Volume ham bo‘lmasa, app vaqtinchalik SQLite bazasida ishga tushadi; ma’lumotlar deploy/container almashtirilganda yo‘qolishi mumkin.
