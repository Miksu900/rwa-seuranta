# rwa-seuranta

Prototyyppi: tokenisoidun omaisuuden määrä Stellar-ketjussa suomeksi.

Data luetaan suoraan ketjusta (Stellar Horizon). Tokenin liikkeeseenlaskija haetaan liikkeeseenlaskijan omasta stellar.toml-tiedostosta (verkkotunnus on tiedostossa tokens.json). Kolmannen osapuolen koottua aineistoa (esim. DeFiLlama) ei käytetä, koska sen käyttöehdot rajaavat käytön ei-kaupalliseen.

Sivu rakentuu tunnin välein GitHub Actionsissa. Hakukoneilta piilotettu (noindex), kunnes tokenilista ja luvut on tarkistettu.

Seuraavaksi: XDC-ketjun tokenit (tarvitaan varmistetut sopimusosoitteet).
