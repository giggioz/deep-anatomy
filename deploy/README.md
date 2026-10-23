# Pubblicazione sulla VPS

La VPS (Ubuntu 24.04, `217.160.58.145`) ospita già Climbcast: nginx con certbot sull'host, MongoDB 7 in Docker
(`climbcast-production-mongodb-1`, porta 27017), Node e PM2. Deep Anatomy usa le stesse cose, con un suo database,
un suo utente Mongo e un suo processo:

```
https://deepanatomy.infinitymundi.it ──► nginx (443) ──► PM2 "deep-anatomy" su 127.0.0.1:8787 ──► Mongo, db deep_anatomy
```

## Prima installazione (una volta sola)

**1. DNS**: record A `deepanatomy.infinitymundi.it` → `217.160.58.145` (pannello IONOS del dominio).

**2. Utente Mongo dedicato**, che può leggere e scrivere solo il database `deep_anatomy`. La password la scegli tu;
le credenziali di root di Mongo le prende dal container, senza scriverle:

```bash
ssh root@217.160.58.145
PW=$(openssl rand -base64 24 | tr -d '/+=')
docker exec -i climbcast-production-mongodb-1 sh -c \
  'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet' <<EOF
use deep_anatomy
db.createUser({ user: "deep_anatomy", pwd: "$PW", roles: [{ role: "readWrite", db: "deep_anatomy" }] })
EOF
echo "MONGO_URI=mongodb://deep_anatomy:$PW@127.0.0.1:27017/deep_anatomy?authSource=deep_anatomy"
```

**3. Cartella e `.env`** in `/srv/nodeapps/deep-anatomy/.env`:

```bash
NODE_ENV=production
PORT=8787
HOST=127.0.0.1
URL_APP=https://deepanatomy.infinitymundi.it
MONGO_URI=…                         # quella stampata al passo 2
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=…                         # le stesse credenziali SES di Climbcast
SMTP_PASS=…
SMTP_FROM=noreply@infinitymundi.it
ANTHROPIC_API_KEY=                  # facoltativa
```

`chmod 600 .env`: contiene segreti.

**4. Codice e processo**: dal Mac, `bash deploy/pubblica.sh`.

**5. nginx e https**:

```bash
cp /srv/nodeapps/deep-anatomy/deploy/nginx-deep-anatomy.conf /etc/nginx/sites-available/deep-anatomy
ln -s /etc/nginx/sites-available/deep-anatomy /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d deepanatomy.infinitymundi.it
```

**6. PM2 al riavvio della macchina** (se non è già attivo): `pm2 startup systemd` e poi `pm2 save`.

**7. Primo account**: da **Registrati** nella pagina di accesso, poi il link di conferma che arriva per email.

## Aggiornamenti

`bash deploy/pubblica.sh` dal Mac. Le sessioni restano valide (sono nel database), i medici non devono rientrare.

## Account

I medici si registrano da soli. Sul server, nella cartella dell'app:

```bash
npm run utenti -- elenco                    # account e registrazioni in attesa di conferma
npm run utenti -- disattiva <email>         # non entra più; chiude subito le sue sessioni
npm run utenti -- riattiva <email>
```

## Controlli

```bash
pm2 logs deep-anatomy
curl -s https://deepanatomy.infinitymundi.it/api/salute
```
