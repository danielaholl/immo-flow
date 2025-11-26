# OpenAI Integration Setup

Diese Anleitung erklärt, wie Sie die OpenAI-Integration für den KI-Chat-Assistenten aktivieren.

## Voraussetzungen

1. **OpenAI API Key**: Holen Sie sich einen API-Schlüssel von [OpenAI](https://platform.openai.com/api-keys)
2. **Supabase Projekt**: Ein Supabase-Projekt muss eingerichtet sein

## Schritt 1: Supabase CLI Installieren

Falls noch nicht installiert:

```bash
npm install -g supabase
```

## Schritt 2: Supabase Login

```bash
npx supabase login
```

## Schritt 3: Supabase Projekt Verknüpfen

```bash
npx supabase link --project-ref your-project-ref
```

**Projekt-Ref finden:**
- Gehen Sie zu Ihrem [Supabase Dashboard](https://app.supabase.com)
- Wählen Sie Ihr Projekt
- Die Project Ref finden Sie in den Project Settings > General

## Schritt 4: OpenAI API Key als Secret speichern

```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Wichtig:** Ersetzen Sie `sk-your-openai-api-key-here` mit Ihrem echten OpenAI API Key!

## Schritt 5: Edge Function Deployen

```bash
npx supabase functions deploy ai-chat
```

## Schritt 6: Testen

1. Starten Sie die Web-App: `pnpm dev:web`
2. Öffnen Sie http://localhost:3000
3. Verwenden Sie den Chat-Assistenten

## Troubleshooting

### "AI service not configured" Error

**Problem:** Der OpenAI API Key wurde nicht korrekt gesetzt.

**Lösung:**
```bash
# Secrets überprüfen
npx supabase secrets list

# API Key erneut setzen
npx supabase secrets set OPENAI_API_KEY=sk-your-key
```

### Edge Function Fehler

**Problem:** Die Edge Function antwortet mit einem Fehler.

**Lösung:**
```bash
# Logs anzeigen
npx supabase functions logs ai-chat

# Function neu deployen
npx supabase functions deploy ai-chat
```

### CORS Fehler

**Problem:** CORS-Fehler im Browser.

**Lösung:** Stellen Sie sicher, dass Ihre App-URL in den Supabase Auth Settings unter "Site URL" eingetragen ist:
- Gehen Sie zu: Authentication > URL Configuration
- Fügen Sie `http://localhost:3000` für lokale Entwicklung hinzu

## Kosten

Die Integration verwendet standardmäßig **gpt-4o-mini**, das kostengünstigste OpenAI-Modell:
- ~$0.15 pro 1M Input-Tokens
- ~$0.60 pro 1M Output-Tokens

Sie können das Modell in `supabase/functions/ai-chat/index.ts` ändern:

```typescript
model: 'gpt-4', // Für bessere Qualität
// oder
model: 'gpt-3.5-turbo', // Für niedrigere Kosten
```

## Lokale Entwicklung (Optional)

Für lokale Tests ohne Deploy:

```bash
# Supabase lokal starten
npx supabase start

# Secrets lokal setzen
echo "OPENAI_API_KEY=sk-your-key" > supabase/.env.local

# Edge Function lokal ausführen
npx supabase functions serve ai-chat --env-file supabase/.env.local
```

## Sicherheit

✅ **API Key ist sicher**: Der OpenAI API Key ist nur server-seitig in Supabase Secrets gespeichert
✅ **Nie im Frontend**: Der Key wird niemals an das Frontend gesendet
✅ **Environment Variables**: Verwenden Sie niemals API Keys direkt im Code

## Support

Bei Problemen:
1. Überprüfen Sie die Supabase Edge Function Logs
2. Stellen Sie sicher, dass der API Key gültig ist
3. Prüfen Sie Ihr OpenAI-Konto auf ausreichende Credits
