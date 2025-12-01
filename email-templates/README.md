# ImmoFlow E-Mail-Vorlagen

Diese E-Mail-Vorlagen verwenden das ImmoFlow-Branding im Airbnb-Stil und sind für Supabase Authentication optimiert.

## 📧 Verfügbare Vorlagen

- **confirm-signup.html** - E-Mail-Bestätigung bei Registrierung
- **reset-password.html** - Passwort zurücksetzen
- **magic-link.html** - Passwortlose Anmeldung (Magic Link)
- **invite-user.html** - Benutzer-Einladung
- **change-email.html** - E-Mail-Adresse ändern

## 🎨 Design-Features

- **Airbnb-Stil** - Minimalistisches, sauberes Design wie die gesamte Plattform
- **Responsive Design** - Funktioniert auf allen Geräten
- **ImmoFlow Branding** - Verwendet die Markenfarbe #FF385C (Airbnb Rot/Pink)
- **Klare Typografie** - Inter-Schriftart mit perfekt abgestimmten Grauwerten
- **Professionelle Buttons** - Klare CTAs in Markenfarbe
- **Minimale Eleganz** - Viel Weißraum, subtile Schatten, abgerundete Ecken

## 📝 Installation in Supabase

### 1. Supabase Dashboard öffnen

Gehen Sie zu: https://supabase.com/dashboard

### 2. Projekt auswählen

Wählen Sie Ihr ImmoFlow-Projekt aus

### 3. E-Mail-Vorlagen bearbeiten

Navigieren Sie zu: **Authentication → Email Templates**

### 4. Vorlagen hochladen

Für jede Vorlage:

1. Wählen Sie den entsprechenden Template-Typ:
   - **Confirm signup** → `confirm-signup.html`
   - **Reset Password** → `reset-password.html`
   - **Magic Link** → `magic-link.html`
   - **Invite User** → `invite-user.html`
   - **Change Email Address** → `change-email.html`

2. Öffnen Sie die HTML-Datei in einem Texteditor
3. Kopieren Sie den gesamten Inhalt
4. Fügen Sie ihn in das Textfeld im Supabase Dashboard ein
5. Klicken Sie auf **Save**

## 🔧 Anpassungen

### Farben ändern

Die Hauptfarbe (Primary) ist definiert als:
```css
background-color: #FF385C;
```

Weitere Farben im Airbnb-Stil:
- **Hintergrund**: #F7F7F7 (helles Grau)
- **Text Primary**: #222222 (fast schwarz)
- **Text Secondary**: #717171 (mittleres Grau)
- **Border**: #DDDDDD (helle Grauabgrenzung)
- **Weiß**: #FFFFFF

### Logo hinzufügen

Um ein Logo-Bild hinzuzufügen, ersetzen Sie im Header:

```html
<h1 style="margin: 0; color: #222222; font-size: 28px; font-weight: 700;">
  ImmoFlow
</h1>
```

Mit:

```html
<img src="https://ihr-logo-url.de/logo.png"
     alt="ImmoFlow"
     style="max-width: 200px; height: auto;">
```

### Text anpassen

Alle Texte können direkt in den HTML-Dateien angepasst werden.

## ✅ Verfügbare Variablen

Supabase stellt folgende Variablen bereit:

- `{{ .ConfirmationURL }}` - Der Bestätigungslink
- `{{ .Token }}` - Der Token (falls benötigt)
- `{{ .TokenHash }}` - Token Hash
- `{{ .SiteURL }}` - URL Ihrer Website
- `{{ .Year }}` - Aktuelles Jahr (für Copyright)

## 🧪 Testen

1. Erstellen Sie einen Test-Benutzer in Supabase
2. Lösen Sie die gewünschte E-Mail aus (z.B. Registrierung)
3. Prüfen Sie Ihren Posteingang
4. Verifizieren Sie, dass das Design korrekt angezeigt wird

## 📱 Mobile-Ansicht

Alle Vorlagen sind responsive und passen sich automatisch an mobile Geräte an. Die maximale Breite ist auf 600px festgelegt.

## 🛡️ Sicherheit

- Alle Links verwenden HTTPS
- Token sind nur zeitlich begrenzt gültig
- Sicherheitshinweise sind in kritischen E-Mails enthalten

## 💡 Best Practices

1. **Kurze Betreffzeilen** - Halten Sie den Subject prägnant
2. **Klare CTAs** - Ein Haupt-Button pro E-Mail
3. **Alternativ-Links** - Bieten Sie immer eine Text-Version des Links
4. **Zeitliche Begrenzung** - Kommunizieren Sie die Gültigkeit von Links
5. **Sicherheitshinweise** - Bei sensiblen Aktionen (Passwort, E-Mail-Änderung)

## 📞 Support

Bei Fragen oder Problemen:
- Supabase Dokumentation: https://supabase.com/docs/guides/auth/auth-email-templates
- ImmoFlow Team kontaktieren

---

© 2025 ImmoFlow. Alle Rechte vorbehalten.
