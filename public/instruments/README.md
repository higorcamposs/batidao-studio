# Instrumentos do Batidão Studio

Biblioteca curada para o teclado virtual. Os arquivos são carregados pelo navegador somente quando o instrumento é selecionado ou usado.

| Instrumento | Fonte | Revisão fixada | Licença | Arquivos usados |
|---|---|---|---|---:|
| Grand Piano | [VCSL](https://github.com/sgossner/VCSL) | `c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e` | CC0 1.0 | 11 |
| Solo Flute | [VSCO 2 CE](https://github.com/sgossner/VSCO-2-CE) | `440300901dfe9275fd84e0b7763af1f8443ae62e` | CC0 1.0 | 10 |
| Clean Guitar | [Emilyguitar](https://github.com/sfzinstruments/karoryfer.emilyguitar) | `b4920dc662fd9cad6dcaccdeecffdd91c8725d8c` | CC0 1.0 | 13 |
| Alto Sax | [Weresax](https://github.com/sfzinstruments/karoryfer.weresax) | `a4d756b21d2a573aca0d840cce7e71ba5effd4c6` | CC0 1.0 | 8 |
| Analog Bass | Batidão Studio | código local | geração procedural | 0 |
| Warm Pad | Batidão Studio | código local | geração procedural | 0 |

Obtidos em 2026-09-04. As cópias integrais das licenças estão em `licenses/`. Os hashes SHA-256 e caminhos aprovados ficam fixados em `scripts/download-instruments.mjs`.

Cada WAV original possui variantes OGG (preferencial no navegador) e MP3 (compatibilidade). A conversão é reproduzível com a imagem FFmpeg fixada por digest em `scripts/encode-instruments.mjs`.

Execute `pnpm instruments:verify` para validar a biblioteca existente ou `pnpm instruments:download` para restaurar arquivos ausentes e validar todos os hashes.
