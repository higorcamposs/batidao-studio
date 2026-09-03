# Batidão Studio no Replit

## Execução

- Workflow principal: `Start application`
- Comando: `npm run dev`
- Preview: porta `5000`
- Build de produção: `npm run build`

## Arquivos de áudio

O frontend usa exclusivamente os samples locais documentados em
`drumkits/catalog.json` e `drumkits/README.md`. Eles são servidos diretamente
pelo Vite e carregados sob demanda pela Web Audio API.

Não mover, apagar ou substituir os arquivos de licença e documentação dos
pacotes em `drumkits/sources/`.