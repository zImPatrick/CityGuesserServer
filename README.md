# Virtual Vacation Server
Replacement Server für [den Multiplayer von City Guesser](https://virtualvacation.us/private-room)

Einige meiner Freunde und ich haben gerne den Multiplayer von City Guesser gespielt, jedoch sind die Server seit längerer Zeit schon down. Irgendwann wollte ich mal probieren, einen Ersatzserver zu programmieren und das ist mein Versuch.  

Ich hab diesen Code echt lange nicht mehr berührt und wollte ihn einfach open sourcen falls ihn irgendjemand brauchen könnte. Daher gibt es wahrscheinlich einige Bugs :)

## Setup
1. Server starten: ```$ node main.js```
2. Port 6969 irgendwie forwarden
3. IP in [`replacer.user.js`](replacer.user.js#L15) ersetzen
4. Userscript installieren (oder einfach mit den DevTools ausführen)
5. Spaß haben