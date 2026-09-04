# batidao-studio

Aplicação web pública para criação de beats com sequenciador de 16 passos,
launchpad e samples locais licenciados.

## Executar

```bash
npm install
npm run dev
```

O servidor Vite abre na porta 5000. O áudio é habilitado após a primeira
interação do usuário, conforme exigido pelos navegadores.

## Samples

A aplicação lê `drumkits/catalog.json` e carrega sob demanda somente samples
existentes em `drumkits/`. Consulte `drumkits/README.md` para as fontes e
licenças. Preserve os arquivos de licença e documentação ao distribuir.